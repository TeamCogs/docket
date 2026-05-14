//! IPC: matter CRUD. Each matter = one directory on disk.

use serde::Serialize;

#[derive(Serialize)]
pub struct MatterSummary {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub doc_count: u32,
    pub status: String,
}

#[tauri::command]
pub fn list_matters() -> Vec<MatterSummary> {
    // TODO[scott]: walk ~/Library/Application Support/Docket/matters/
    vec![]
}

#[tauri::command]
pub fn get_matter(matter_id: String) -> Option<MatterSummary> {
    let _ = matter_id;
    None
}

#[tauri::command]
pub fn delete_matter(matter_id: String) -> Result<(), String> {
    // TODO[scott]: rm -rf the matter directory after confirmation in UI.
    let _ = matter_id;
    Ok(())
}
