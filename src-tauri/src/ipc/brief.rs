//! IPC: brief generation. Streams sections as they complete.

use serde::Serialize;

#[derive(Serialize)]
pub struct BriefStub {
    pub matter_id: String,
    pub sections: Vec<String>,
}

#[tauri::command]
pub async fn generate_brief(matter_id: String) -> Result<BriefStub, String> {
    // TODO[scott]: relay to the Node worker; emit a stream of section events
    // back to the webview via `app.emit("brief:section", ...)`.
    Ok(BriefStub { matter_id, sections: vec![] })
}

#[tauri::command]
pub async fn get_brief(matter_id: String) -> Option<BriefStub> {
    let _ = matter_id;
    None
}
