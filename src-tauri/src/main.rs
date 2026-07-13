// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    // Fall back to lossy conversion so files with stray non-UTF-8 bytes still open.
    Ok(String::from_utf8(bytes).unwrap_or_else(|e| String::from_utf8_lossy(e.as_bytes()).into_owned()))
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// First existing file path passed on the command line ("Open with" / file association).
#[tauri::command]
fn cli_open_path() -> Option<String> {
    std::env::args()
        .skip(1)
        .map(PathBuf::from)
        .find(|p| p.is_file())
        .map(|p| p.to_string_lossy().into_owned())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            read_binary_file,
            cli_open_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running marginalia");
}
