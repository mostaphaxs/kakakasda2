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
    
    // 1. Determine Persistent Database Path
    let app_data_dir = app_handle.path().app_data_dir().expect("Failed to get AppData dir");
    
    // 🛡️ THE FIX: Robust Directory Creation & Permission Check
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        eprintln!("❌ Failed to create AppData directory: {}", e);
    }

    let db_path = app_data_dir.join("database.sqlite");
    
    // Create empty DB file if it doesn't exist
    if !db_path.exists() {
        if let Err(e) = std::fs::write(&db_path, "") {
            eprintln!("❌ Failed to initialize database file: {}", e);
        }
    }

    // 2. Determine Temp Binary Path (for extraction)
    let temp_dir = std::env::temp_dir().join("com.mustapha.myamical");
    std::fs::create_dir_all(&temp_dir).ok();
    
    #[cfg(target_os = "windows")]
    let bin_name = "backend_srv.exe";
    #[cfg(not(target_os = "windows"))]
    let bin_name = "backend_srv";
    
    let bin_path = temp_dir.join(bin_name);
    std::fs::write(&bin_path, BACKEND_BINARY).expect("Failed to extract backend binary");
    
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&bin_path, std::fs::Permissions::from_mode(0o755)).ok();
    }

    // 3. Prepare Writable Storage (The "Senior" Fix for the 500 error)
    // Bundled binaries are read-only, so we MUST use /tmp for sessions, views, and cache.
    let storage_dir = std::env::temp_dir().join("myamical-storage");
    for subdir in &["framework/sessions", "framework/views", "framework/cache", "logs"] {
        std::fs::create_dir_all(storage_dir.join(subdir)).ok();
    }

    // =========================================================================
    // 🚀 AUTOMATED MIGRATIONS & SEEDING (PRODUCTION)
    // =========================================================================
    
    // A. Run Migrations (MUST use 'php', 'artisan' for CLI commands)
    let _ = Command::new(&bin_path)
        .args(["php", "artisan", "migrate", "--force"])
        .env("DB_DATABASE", db_path.to_str().unwrap())
        .env("LARAVEL_STORAGE_PATH", storage_dir.to_str().unwrap())
        .env("APP_ENV", "production")
        .env("APP_DEBUG", "true") 
        .status(); 

    // B. Run Seeders
    let _ = Command::new(&bin_path)
        .args(["php", "artisan", "db:seed", "--class=DefaultUserSeeder", "--force"])
        .env("DB_DATABASE", db_path.to_str().unwrap())
        .env("LARAVEL_STORAGE_PATH", storage_dir.to_str().unwrap())
        .env("APP_ENV", "production")
        .env("APP_DEBUG", "true")
        .status(); 


    // =========================================================================

    // 4. Spawn Backend sidecar
    let mut cmd = Command::new(&bin_path);
    cmd.args(["php-server", "-l", &format!("127.0.0.1:{}", port)]);
    
    // Inject the persistent DB and writable storage paths
    cmd.env("DB_DATABASE", db_path.to_str().unwrap());
    cmd.env("LARAVEL_STORAGE_PATH", storage_dir.to_str().unwrap());
    cmd.env("APP_ENV", "production"); 
    cmd.env("APP_DEBUG", "true"); // Temporarily true for troubleshooting

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.spawn() {
        Ok(child) => (api_url, Some(child)),
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