//! IPC: source span lookup + open-in-document. Backs the citation panel.

use serde::Serialize;

#[derive(Serialize)]
pub struct SourceSpan {
    pub chunk_id: String,
    pub filename: String,
    pub page: u32,
    pub text: String,
}

#[tauri::command]
pub fn get_source_span(chunk_id: String) -> Option<SourceSpan> {
    // TODO[scott]: query LanceDB by chunk_id, hydrate.
    let _ = chunk_id;
    None
}

#[tauri::command]
pub fn open_source_at_page(doc_id: String, page: u32) -> Result<(), String> {
    // TODO[scott]: open the original PDF in the system viewer (open command
    // on macOS, ShellExecute on Windows) seeked to the requested page.
    let _ = (doc_id, page);
    Ok(())
}
