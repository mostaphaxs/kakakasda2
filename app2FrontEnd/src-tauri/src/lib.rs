use tauri::Manager;
use tauri::path::BaseDirectory;
use std::process::{Child, Command as StdCommand};
use std::sync::Mutex;
use std::net::TcpListener;
use log::{info, error, warn};

pub struct AppState {
    pub api_url: Mutex<String>,
    pub child: Mutex<Option<Child>>,
}

#[tauri::command]
async fn get_api_config(state: tauri::State<'_, AppState>) -> Result<String, String> {
    Ok(state.api_url.lock().unwrap().clone())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        StdCommand::new("xdg-open").arg(&url).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        StdCommand::new("cmd").args(["/C", "start", "", &url]).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        StdCommand::new("open").arg(&url).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn find_available_port(start_port: u16) -> u16 {
    for port in start_port..65535 {
        if TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
            return port;
        }
    }
    8000
}

/// Returns the path to the bundled php binary for the current platform.
/// In production: resource dir / binaries/php/php-<triple>[.exe]
/// In dev: falls back to src-tauri/binaries/php/<file>, then system PHP.
fn resolve_php_binary(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    let sidecar_name = "binaries/php/php-x86_64-pc-windows-msvc.exe";
    #[cfg(target_os = "linux")]
    let sidecar_name = "binaries/php/php-x86_64-unknown-linux-gnu";
    #[cfg(target_os = "macos")]
    let sidecar_name = "binaries/php/php-aarch64-apple-darwin";

    // 1. Production path (installed app resource dir)
    if let Ok(path) = app_handle.path().resolve(sidecar_name, BaseDirectory::Resource) {
        if path.exists() {
            return path;
        }
    }

    // 2. Dev path (src-tauri/binaries/php/)
    let manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dev_path = manifest.join(sidecar_name);
    if dev_path.exists() {
        return dev_path;
    }

    // 3. System PHP fallback (supports both Linux `which` and Windows `where`)
    system_php()
}

fn system_php() -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    let finder = "where";
    #[cfg(not(target_os = "windows"))]
    let finder = "which";

    if let Ok(out) = StdCommand::new(finder).arg("php").output() {
        let path = String::from_utf8_lossy(&out.stdout)
            .lines()
            .next()
            .map(|l| l.trim().to_string())
            .unwrap_or_default();
        if !path.is_empty() {
            return std::path::PathBuf::from(path);
        }
    }
    std::path::PathBuf::from("php")
}

fn setup_backend(app_handle: &tauri::AppHandle) -> (String, Option<Child>) {
    let port = find_available_port(8000);
    let api_url = format!("http://127.0.0.1:{}/api", port);

    // ── 1. Persistent AppData directory ──────────────────────────────────────
    let app_data_dir = app_handle.path().app_data_dir().expect("Failed to get AppData dir");
    std::fs::create_dir_all(&app_data_dir).ok();

    #[cfg(debug_assertions)]
    let db_filename = "dev_database.sqlite";
    #[cfg(not(debug_assertions))]
    let db_filename = "database.sqlite";

    let db_path = app_data_dir.join(db_filename);
    if !db_path.exists() {
        std::fs::write(&db_path, "").ok();
    }

    // ── 2. Persistent writable storage ─────────────────────────────────────
    let storage_dir = app_data_dir.join("storage");
    for subdir in &["framework/sessions", "framework/views", "framework/cache", "logs", "app/public", "bootstrap/cache"] {
        std::fs::create_dir_all(storage_dir.join(subdir)).ok();
    }

    // ── 3. Resolve bundled backend & PHP paths ──────────────────────────────
    let backend_path = {
        // Production: Tauri copies resources next to the binary
        let resource = app_handle.path().resolve("backend", BaseDirectory::Resource).ok();
        resource.filter(|p| p.exists()).unwrap_or_else(|| {
            // Dev: use the backend folder inside src-tauri
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("backend")
        })
    };

    let php_bin = resolve_php_binary(app_handle);
    let php_dir = php_bin.parent().unwrap_or(&php_bin).to_path_buf();

    info!("🐘 PHP binary  : {:?}", php_bin);
    info!("📁 Backend path: {:?}", backend_path);

    if !backend_path.exists() {
        error!("❌ Backend path does not exist: {:?}", backend_path);
    }

    // ── 4. Common environment ───────────────────────────────────────────────
    let db_str   = db_path.to_string_lossy().replace('\\', "/");
    let stor_str = storage_dir.to_string_lossy().replace('\\', "/");
    let app_key  = "base64:nYxGffEkIMcHQtDKIHFfULBbh4k8qicojvv59QIi6lM=";
    let php_dir_s = php_dir.to_string_lossy().to_string();

    let sys_path = std::env::var("PATH").unwrap_or_default();
    #[cfg(target_os = "windows")]
    let new_path = format!("{};{}", php_dir_s, sys_path);
    #[cfg(not(target_os = "windows"))]
    let new_path = format!("{}:{}", php_dir_s, sys_path);

    let artisan = backend_path.join("artisan");

    // ── 5. Migrations (blocking) ────────────────────────────────────────────
    info!("🔄 Running migrations on: {}", db_str);
    let mut migrate = StdCommand::new(&php_bin);
    migrate
        .arg(&artisan).arg("migrate").arg("--force")
        .current_dir(&backend_path)
        .env("DB_DATABASE",          &db_str)
        .env("LARAVEL_STORAGE_PATH", &stor_str)
        .env("APP_KEY",              app_key)
        .env("APP_ENV",              "production")
        .env("APP_DEBUG",            "false")
        .env("PHPRC",                &php_dir_s)
        .env("PATH",                 &new_path)
        .env("APP_CONFIG_CACHE",     format!("{}/bootstrap/cache/config.php", stor_str))
        .env("APP_EVENTS_CACHE",     format!("{}/bootstrap/cache/events.php", stor_str))
        .env("APP_PACKAGES_CACHE",   format!("{}/bootstrap/cache/packages.php", stor_str))
        .env("APP_ROUTES_CACHE",     format!("{}/bootstrap/cache/routes-v7.php", stor_str))
        .env("APP_SERVICES_CACHE",   format!("{}/bootstrap/cache/services.php", stor_str));
    #[cfg(target_os = "windows")]
    { use std::os::windows::process::CommandExt; migrate.creation_flags(0x08000000); }
    match migrate.status() {
        Ok(s) if s.success() => info!("✅ Migrations done."),
        Ok(s) => warn!("⚠️ Migrations exited: {}", s),
        Err(e) => error!("❌ Migration error: {}", e),
    }

    // ── 6. Seeders (blocking) ───────────────────────────────────────────────
    let mut seed = StdCommand::new(&php_bin);
    seed
        .arg(&artisan).arg("db:seed").arg("--class=DefaultUserSeeder").arg("--force")
        .current_dir(&backend_path)
        .env("DB_DATABASE",          &db_str)
        .env("LARAVEL_STORAGE_PATH", &stor_str)
        .env("APP_KEY",              app_key)
        .env("APP_ENV",              "production")
        .env("APP_DEBUG",            "false")
        .env("PHPRC",                &php_dir_s)
        .env("PATH",                 &new_path)
        .env("APP_CONFIG_CACHE",     format!("{}/bootstrap/cache/config.php", stor_str))
        .env("APP_EVENTS_CACHE",     format!("{}/bootstrap/cache/events.php", stor_str))
        .env("APP_PACKAGES_CACHE",   format!("{}/bootstrap/cache/packages.php", stor_str))
        .env("APP_ROUTES_CACHE",     format!("{}/bootstrap/cache/routes-v7.php", stor_str))
        .env("APP_SERVICES_CACHE",   format!("{}/bootstrap/cache/services.php", stor_str));
    #[cfg(target_os = "windows")]
    { use std::os::windows::process::CommandExt; seed.creation_flags(0x08000000); }
    let _ = seed.status();

    // ── 7. Web server (long-running process) ────────────────────────────────
    info!("🚀 Spawning PHP server on 127.0.0.1:{}", port);
    let mut serve = StdCommand::new(&php_bin);
    serve
        .args([artisan.to_str().unwrap(), "serve",
               "--host", "127.0.0.1", "--port", &port.to_string()])
        .current_dir(&backend_path)
        .env("DB_DATABASE",          &db_str)
        .env("LARAVEL_STORAGE_PATH", &stor_str)
        .env("APP_KEY",              app_key)
        .env("APP_ENV",              "production")
        .env("APP_DEBUG",            "false")
        .env("PHPRC",                &php_dir_s)
        .env("PATH",                 &new_path)
        .env("APP_CONFIG_CACHE",     format!("{}/bootstrap/cache/config.php", stor_str))
        .env("APP_EVENTS_CACHE",     format!("{}/bootstrap/cache/events.php", stor_str))
        .env("APP_PACKAGES_CACHE",   format!("{}/bootstrap/cache/packages.php", stor_str))
        .env("APP_ROUTES_CACHE",     format!("{}/bootstrap/cache/routes-v7.php", stor_str))
        .env("APP_SERVICES_CACHE",   format!("{}/bootstrap/cache/services.php", stor_str));
        
    #[cfg(target_os = "windows")]
    { use std::os::windows::process::CommandExt; serve.creation_flags(0x08000000); }

    match serve.spawn() {
        Ok(child) => (api_url, Some(child)),
        Err(e) => {
            error!("❌ Failed to start PHP server: {}", e);
            (api_url, None)
        }
    }
}

#[tauri::command]
async fn import_database(app_handle: tauri::AppHandle, source_path: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join("database.sqlite");
    let source = std::path::PathBuf::from(source_path);
    if !source.exists() { return Err("Le fichier source n'existe pas.".to_string()); }
    std::fs::copy(&source, &db_path).map_err(|e| format!("Erreur lors de la copie : {}", e))?;
    Ok("Base de données importée avec succès. Veuillez redémarrer l'application.".to_string())
}

#[tauri::command]
async fn export_database(app_handle: tauri::AppHandle, destination_path: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join("database.sqlite");
    if !db_path.exists() { return Err("La base de données actuelle n'existe pas.".to_string()); }
    let dest = std::path::PathBuf::from(destination_path);
    std::fs::copy(&db_path, &dest).map_err(|e| format!("Erreur lors de l'exportation : {}", e))?;
    Ok("Base de données exportée avec succès.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: Some("app".to_string()) }),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
            ])
            .level(log::LevelFilter::Info)
            .build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let (api_url, child) = setup_backend(app.handle());
            app.manage(AppState { api_url: Mutex::new(api_url), child: Mutex::new(child) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_url, get_api_config, import_database, export_database])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app_handle.state::<AppState>();
                let mut child_lock = state.child.lock().unwrap();
                if let Some(mut child) = child_lock.take() {
                    let _ = child.kill();
                }
            }
        });
}