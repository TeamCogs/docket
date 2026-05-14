//! IPC: ingest a folder of documents.
//!
//! The heavy lifting (extract, chunk, embed, write to LanceDB) lives in the
//! TypeScript pipeline. Rust shells out to the Node-side worker via stdio so
//! the implementation is shared between Tauri and `pnpm dev`.

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct IngestArgs {
    pub matter_id: String,
    pub matter_name: String,
    pub folder: String,
}

#[derive(Serialize)]
pub struct IngestResult {
    pub matter_id: String,
    pub doc_count: u32,
    pub total_chunks: u32,
}

#[tauri::command]
pub async fn ingest_folder(args: IngestArgs) -> Result<IngestResult, String> {
    // TODO[scott]: spawn the Node worker (or embed the TS pipeline via a
    // process-bound deno_core / nodejs-mobile). For v0.1 the browser-dev
    // path covers this; the Tauri path picks up in week 4.
    Ok(IngestResult {
        matter_id: args.matter_id,
        doc_count: 0,
        total_chunks: 0,
    })
}
