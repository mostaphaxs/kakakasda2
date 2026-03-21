use tauri::Manager;
use std::process::Command;

// On n'importe l'extension Windows QUE si on est sur Windows
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_url])
        .setup(|app| {
            let resource_path = app.path().resource_dir().expect("Failed to get resource directory");
            
            // 1. Détection du chemin Artisan
            let project_root = if !app.path().resource_dir().unwrap().join("app1BackEnd/artisan").exists() {
                // Mode DEV : on remonte depuis le dossier de travail
                std::env::current_dir().unwrap()
                    .parent().unwrap().to_path_buf() // app1FrontEnd
                    .parent().unwrap().to_path_buf() // APP1
            } else {
                // Mode PROD : racine des ressources
                resource_path.clone()
            };

            let artisan_path = project_root.join("app1BackEnd/artisan");

            println!("🚀 Racine du projet : {:?}", project_root);
            println!("🚀 Chemin Artisan : {:?}", artisan_path);

            if !artisan_path.exists() {
                println!("❌ ERREUR : Artisan introuvable à {:?}", artisan_path);
            } else {
                // 2. Lancement du serveur (Linux)
                #[cfg(target_os = "linux")]
                {
                    println!("🔧 Lancement sur Linux...");
                    let _ = Command::new("php")
                        .args([artisan_path.to_str().expect("Path encoding error"), "serve", "--port", "8000"])
                        .spawn();
                }

                // 3. Lancement du serveur (Windows)
                #[cfg(target_os = "windows")]
                {
                    println!("🔧 Lancement sur Windows...");
                    // En mode DEV, on peut essayer d'utiliser le PHP système s'il existe, 
                    // sinon on utilise le binaire packagé.
                    let php_exe = if artisan_path.to_str().unwrap().contains("Desktop") {
                         // On tente de trouver le PHP dans binaries s'il existe
                         let bundled_php = resource_path.join("binaries/php/php.exe");
                         if bundled_php.exists() {
                             bundled_php
                         } else {
                             std::path::PathBuf::from("php") // PHP système
                         }
                    } else {
                         resource_path.join("binaries/php/php.exe")
                    };

                    println!("🐘 PHP utilisé : {:?}", php_exe);

                    let mut cmd = Command::new(php_exe);
                    cmd.args([artisan_path.to_str().expect("Path encoding error"), "serve", "--port", "8000"]);
                    
                    #[cfg(target_os = "windows")]
                    {
                        use std::os::windows::process::CommandExt;
                        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                    }

                    match cmd.spawn() {
                        Ok(_) => println!("✅ Serveur PHP lancé avec succès"),
                        Err(e) => println!("❌ Échec du lancement PHP : {}", e),
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}