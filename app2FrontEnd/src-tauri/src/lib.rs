use tauri::Manager;
use std::process::{Command, Child, Stdio};
use std::sync::Mutex;
use std::net::TcpListener;
use std::io::{BufRead, BufReader};
use std::fs::OpenOptions;

// --- Stealth Embedding ---
// Bake the Laravel PHAR backend directly into the Tauri binary,
// keeping the source code completely hidden from end users.
const BACKEND_PHAR: &[u8] = include_bytes!("../internal/app.phar");

pub struct AppState {
    pub api_url: Mutex<String>,
    pub child:   Mutex<Option<Child>>,
}

#[tauri::command]
async fn get_api_config(state: tauri::State<'_, AppState>) -> Result<String, String> {
    Ok(state.api_url.lock().unwrap().clone())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    Command::new("xdg-open").arg(&url).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    Command::new("cmd").args(["/C", "start", "", &url]).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

fn find_available_port(start: u16) -> u16 {
    (start..65535)
        .find(|p| TcpListener::bind(format!("127.0.0.1:{}", p)).is_ok())
        .unwrap_or(8000)
}

fn append_log(path: &std::path::Path, msg: &str) {
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(path) {
        use std::io::Write;
        let _ = f.write_all(msg.as_bytes());
    }
}

fn run_artisan(
    phar_path:   &std::path::Path,
    artisan_args: &[&str],
    db_path:      &str,
    storage_dir:  &str,
    app_key:      &str,
    log_path:     &std::path::Path,
) -> bool {
    let mut full_args = vec![phar_path.to_str().unwrap(), "php-cli", "artisan"];
    full_args.extend_from_slice(artisan_args);

    let result = Command::new("php")
        .args(&full_args)
        .env("DB_DATABASE",         db_path)
        .env("LARAVEL_STORAGE_PATH", storage_dir)
        .env("APP_KEY",             app_key)
        .env("APP_ENV",             "production")
        .env("APP_DEBUG",           "true")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    match result {
        Err(e) => {
            let msg = format!("[ARTISAN ERROR] Failed to spawn system PHP: {}\n", e);
            append_log(log_path, &msg);
            false
        }
        Ok(mut child) => {
            if let Some(stdout) = child.stdout.take() {
                let reader  = BufReader::new(stdout);
                let log_p   = log_path.to_path_buf();
                for line in reader.lines().flatten() {
                    append_log(&log_p, &format!("[artisan] {}\n", line));
                }
            }
            if let Some(stderr) = child.stderr.take() {
                let reader  = BufReader::new(stderr);
                let log_p   = log_path.to_path_buf();
                for line in reader.lines().flatten() {
                    append_log(&log_p, &format!("[artisan:err] {}\n", line));
                }
            }
            match child.wait() {
                Ok(s) if s.success() => true,
                Ok(s) => {
                    append_log(log_path, &format!("[artisan] exited with: {}\n", s));
                    false
                }
                Err(e) => {
                    append_log(log_path, &format!("[artisan] wait error: {}\n", e));
                    false
                }
            }
        }
    }
}

fn setup_backend(app_handle: &tauri::AppHandle) -> (String, Option<Child>) {
    let port    = find_available_port(8000);
    let api_url = format!("http://127.0.0.1:{}/api", port);

    // ── 1. Paths ─────────────────────────────────────────────────────────────
    let app_data_dir = app_handle.path().app_data_dir().expect("Failed to get AppData dir");
    std::fs::create_dir_all(&app_data_dir).ok();

    #[cfg(debug_assertions)]
    let db_filename = "dev_database.sqlite";
    #[cfg(not(debug_assertions))]
    let db_filename = "database.sqlite";
    let db_path = app_data_dir.join(db_filename);

    let storage_dir = app_data_dir.join("storage");
    for sub in &["framework/sessions", "framework/views", "framework/cache/data", "logs", "app/public", "app/private"] {
        std::fs::create_dir_all(storage_dir.join(sub)).ok();
    }
    let log_path = storage_dir.join("logs").join("sidecar.log");

    append_log(&log_path, &format!(
        "\n\n=== Starting sidecar [{}] ===\n  db:      {:?}\n  storage: {:?}\n  port:    {}\n",
        chrono_now(), db_path, storage_dir, port
    ));

    // ── 2. Stealth Extraction ────────────────────────────────────────────────
    // Extracts the PHAR to a temporary hidden path at runtime. The user cannot
    // see the source code in their installation directory.
    let temp_dir = std::env::temp_dir().join("com.mustapha.myamical");
    std::fs::create_dir_all(&temp_dir).ok();

    let phar_path = temp_dir.join("backend.phar");
    if let Err(e) = std::fs::write(&phar_path, BACKEND_PHAR) {
        let err = format!("❌ Failed to extract backend PHAR: {}\n", e);
        eprintln!("{}", err);
        append_log(&log_path, &err);
        return (api_url, None);
    }

    // ── 3. Migrations & Seeding ───────────────────────────────────────────────
    let app_key = "base64:nYxGffEkIMcHQtDKIHFfULBbh4k8qicojvv59QIi6lM=";
    let db_str      = db_path.to_str().unwrap_or("");
    let storage_str = storage_dir.to_str().unwrap_or("");

    append_log(&log_path, "🔄 Running migrations via System PHP...\n");
    let migrated = run_artisan(
        &phar_path,
        &["migrate", "--force"],
        db_str, storage_str, app_key, &log_path,
    );

    if migrated {
        append_log(&log_path, "✅ Migrations OK\n");
        let db_size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
        if db_size < 100_000 {
            append_log(&log_path, "🌱 Running seeders...\n");
            run_artisan(
                &phar_path,
                &["db:seed", "--class=DefaultUserSeeder", "--force"],
                db_str, storage_str, app_key, &log_path,
            );
        }
    } else {
        append_log(&log_path, "⚠️ Migrations failed — check log above\n");
    }

    // ── 4. Spawn Web Server ───────────────────────────────────────────────────
    append_log(&log_path, &format!("🚀 Starting PHP sidecar server on port {}...\n", port));

    let mut cmd = Command::new("php");
    cmd.args([
        phar_path.to_str().unwrap(),
        "php-server",
        "-l",
        &format!("127.0.0.1:{}", port)
    ]);
    
    cmd.env("DB_DATABASE",          db_str);
    cmd.env("LARAVEL_STORAGE_PATH", storage_str);
    cmd.env("APP_KEY",              app_key);
    cmd.env("APP_ENV",              "production");
    cmd.env("APP_DEBUG",            "false");
    cmd.env("APP_URL",              &format!("http://127.0.0.1:{}", port));

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.spawn() {
        Ok(mut child) => {
            if let Some(stdout) = child.stdout.take() {
                let lp = log_path.clone();
                std::thread::spawn(move || {
                    for line in BufReader::new(stdout).lines().flatten() {
                        append_log(&lp, &format!("[server] {}\n", line));
                    }
                });
            }
            if let Some(stderr) = child.stderr.take() {
                let lp = log_path.clone();
                std::thread::spawn(move || {
                    for line in BufReader::new(stderr).lines().flatten() {
                        append_log(&lp, &format!("[server:err] {}\n", line));
                    }
                });
            }
            (api_url, Some(child))
        }
        Err(e) => {
            let msg = format!("❌ Failed to start system PHP sidecar: {}\n", e);
            eprintln!("{}", msg);
            append_log(&log_path, &msg);
            (api_url, None)
        }
    }
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    format!("epoch+{}s", secs)
}

#[tauri::command]
async fn import_database(app_handle: tauri::AppHandle, source_path: String) -> Result<String, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("database.sqlite");
    let source  = std::path::PathBuf::from(&source_path);
    if !source.exists() { return Err("Le fichier source n'existe pas.".into()); }
    std::fs::copy(&source, &db_path).map_err(|e| format!("Erreur lors de la copie : {}", e))?;
    Ok("Base de données importée. Redémarrez l'application pour appliquer.".into())
}

#[tauri::command]
async fn export_database(app_handle: tauri::AppHandle, destination_path: String) -> Result<String, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("database.sqlite");
    if !db_path.exists() { return Err("La base de données n'existe pas.".into()); }
    let dest = std::path::PathBuf::from(&destination_path);
    std::fs::copy(&db_path, &dest).map_err(|e| format!("Erreur exportation : {}", e))?;
    Ok("Base de données exportée.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let (api_url, child) = setup_backend(app.handle());
            app.manage(AppState { api_url: Mutex::new(api_url), child: Mutex::new(child) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_url, get_api_config, import_database, export_database])
        .plugin(tauri_plugin_dialog::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app_handle.state::<AppState>();
                let mut lock = state.child.lock().unwrap();
                if let Some(mut child) = lock.take() { let _ = child.kill(); }
            }
        });
}