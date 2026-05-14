//! Docket Rust core.
//!
//! Owns the supervised Ollama sidecar, the audited file I/O surface, and the
//! IPC commands the webview can invoke. Every command the webview can call is
//! enumerated in `ipc/mod.rs` — that's the auditable surface that supports
//! the "no data leaves" claim.

mod ipc;
mod ollama_sidecar;
mod system_info;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Start the supervised Ollama sidecar.
            ollama_sidecar::spawn(app.handle().clone())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::system::get_system_snapshot,
            ipc::system::verify_offline,
            ipc::ingest::ingest_folder,
            ipc::matter::list_matters,
            ipc::matter::get_matter,
            ipc::matter::delete_matter,
            ipc::brief::generate_brief,
            ipc::brief::get_brief,
            ipc::source::get_source_span,
            ipc::source::open_source_at_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Docket");
}
