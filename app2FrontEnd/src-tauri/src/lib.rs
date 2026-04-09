use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;
use std::net::TcpListener;

// --- Stealth Embedding Configuration ---
#[cfg(target_os = "windows")]
const BACKEND_BINARY: &[u8] = include_bytes!("../internal/laravel-backend-x86_64-pc-windows-msvc.exe");

#[cfg(target_os = "linux")]
const BACKEND_BINARY: &[u8] = include_bytes!("../internal/laravel-backend-x86_64-unknown-linux-gnu");

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
        Command::new("xdg-open").arg(url).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd").args(["/C", "start", "", &url]).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg(url).spawn().map_err(|e| e.to_string())?;
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

fn setup_backend(app_handle: &tauri::AppHandle) -> (String, Option<Child>) {
    let port = find_available_port(8000);
    let api_url = format!("http://127.0.0.1:{}/api", port);

    // 1. Determine Persistent AppData Path
    let app_data_dir = app_handle.path().app_data_dir().expect("Failed to get AppData dir");
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        eprintln!("❌ Failed to create AppData directory: {}", e);
    }

    // 🛡️ THE FIX: Differentiate between Dev and Production database
    #[cfg(debug_assertions)]
    let db_filename = "dev_database.sqlite";
    #[cfg(not(debug_assertions))]
    let db_filename = "database.sqlite";

    let db_path = app_data_dir.join(db_filename);
    
    // Create empty DB file if it doesn't exist
    if !db_path.exists() {
        if let Err(e) = std::fs::write(&db_path, "") {
            eprintln!("❌ Failed to initialize database file: {}", e);
        }
    }

    // 2. Determine Unique Temp Binary Path (to avoid "Text file busy" errors)
    let temp_dir = std::env::temp_dir().join("com.mustapha.myamical");
    std::fs::create_dir_all(&temp_dir).ok();
    
    let pid = std::process::id();
    #[cfg(target_os = "windows")]
    let bin_name = format!("backend_srv_{}.exe", pid);
    #[cfg(not(target_os = "windows"))]
    let bin_name = format!("backend_srv_{}", pid);
    
    let bin_path = temp_dir.join(bin_name);
    
    // Extract binary if not already present (clean up after ourselves if possible but keep it simple)
    std::fs::write(&bin_path, BACKEND_BINARY).expect("Failed to extract backend binary");
    
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&bin_path, std::fs::Permissions::from_mode(0o755)).ok();
    }

    // 3. Prepare Persistent Storage (Senior Fix for Sidecars)
    // Bundled binaries are read-only, so we MUST redirect storage to a writable path.
    let storage_dir = app_data_dir.join("storage");
    for subdir in &["framework/sessions", "framework/views", "framework/cache", "logs", "app/public"] {
        std::fs::create_dir_all(storage_dir.join(subdir)).ok();
    }

    // =========================================================================
    // 🚀 AUTOMATED MIGRATIONS & SEEDING (PRODUCTION)
    // =========================================================================
    
    let app_key = "base64:nYxGffEkIMcHQtDKIHFfULBbh4k8qicojvv59QIi6lM=";

    // A. Run Migrations (MUST use 'php-cli', 'artisan' for CLI commands)
    println!("🔄 Running migrations on: {:?}", db_path);
    let migrate_status = Command::new(&bin_path)
        .args(["php-cli", "artisan", "migrate", "--force"])
        .env("DB_DATABASE", db_path.to_str().unwrap())
        .env("LARAVEL_STORAGE_PATH", storage_dir.to_str().unwrap())
        .env("APP_KEY", app_key)
        .env("APP_ENV", "production")
        .env("APP_DEBUG", "true") 
        .status(); 

    match migrate_status {
        Ok(s) if s.success() => println!("✅ Migrations completed successfully."),
        Ok(s) => eprintln!("⚠️ Migrations failed with status: {}", s),
        Err(e) => eprintln!("❌ Failed to execute migration command: {}", e),
    }

    // B. Run Seeders
    let _ = Command::new(&bin_path)
        .args(["php-cli", "artisan", "db:seed", "--class=DefaultUserSeeder", "--force"])
        .env("DB_DATABASE", db_path.to_str().unwrap())
        .env("LARAVEL_STORAGE_PATH", storage_dir.to_str().unwrap())
        .env("APP_KEY", app_key)
        .env("APP_ENV", "production")
        .env("APP_DEBUG", "true")
        .status(); 


    // =========================================================================

    // 4. Spawn Backend sidecar with Logging
    let log_file_path = storage_dir.join("logs/sidecar.log");
    let log_file = std::fs::File::create(&log_file_path).expect("Failed to create sidecar log file");
    let log_file_err = log_file.try_clone().expect("Failed to clone log file handle");

    println!("🚀 Starting sidecar. Logs: {:?}", log_file_path);

    let mut cmd = Command::new(&bin_path);
    // Use 'php-server' which is the micro engine's built-in web server
    // We explicitly tell it to serve the 'public' folder inside the virtual PHAR
    cmd.args(["php-server", "-l", &format!("127.0.0.1:{}", port), "-t", "phar://app.phar/public"]);
    
    // Inject the persistent DB and writable storage paths
    cmd.env("DB_DATABASE", db_path.to_str().unwrap());
    cmd.env("LARAVEL_STORAGE_PATH", storage_dir.to_str().unwrap());
    cmd.env("APP_KEY", app_key);
    cmd.env("APP_ENV", "production"); 
    cmd.env("APP_DEBUG", "true"); 

    // Redirect output to log file so we can debug prod issues
    cmd.stdout(log_file);
    cmd.stderr(log_file_err);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.spawn() {
        Ok(child) => {
            println!("✅ Sidecar started on port {}", port);
            (api_url, Some(child))
        },
        Err(e) => {
            eprintln!("❌ Failed to start sidecar: {}", e);
            (api_url, None)
        }
    }
}

#[tauri::command]
async fn import_database(app_handle: tauri::AppHandle, source_path: String) -> Result<String, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("database.sqlite");
    
    let source = std::path::PathBuf::from(source_path);
    if !source.exists() {
        return Err("Le fichier source n'existe pas.".to_string());
    }
    
    // Copy and overwrite the existing database
    std::fs::copy(&source, &db_path).map_err(|e| format!("Erreur lors de la copie : {}", e))?;
    
    Ok("Base de données importée avec succès. Veuillez redémarrer l'application pour appliquer les changements.".to_string())
}
#[tauri::command]
async fn export_database(app_handle: tauri::AppHandle, destination_path: String) -> Result<String, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("database.sqlite");
    
    if !db_path.exists() {
        return Err("La base de données actuelle n'existe pas.".to_string());
    }
    
    let destination = std::path::PathBuf::from(destination_path);
    std::fs::copy(&db_path, &destination).map_err(|e| format!("Erreur lors de l'exportation : {}", e))?;
    
    Ok("Base de données exportée avec succès.".to_string())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let (api_url, child) = setup_backend(app.handle());
            app.manage(AppState {
                api_url: Mutex::new(api_url),
                child: Mutex::new(child),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_url, get_api_config, import_database, export_database])
        .plugin(tauri_plugin_dialog::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app_handle.state::<AppState>();
                {
                    let mut child_lock = state.child.lock().unwrap();
                    if let Some(mut child) = child_lock.take() {
                        let _ = child.kill();
                    }
                }
            }
        });
}