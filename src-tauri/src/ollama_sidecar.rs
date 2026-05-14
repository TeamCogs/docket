//! Supervised Ollama sidecar process.
//!
//! Spawns the bundled `ollama serve` binary, waits for readiness, restarts on
//! crash, kills cleanly on app exit. Configured to listen ONLY on a Unix
//! socket so no TCP port leaks to other apps on the machine.

use anyhow::Result;
use tauri::AppHandle;

pub fn spawn(_app: AppHandle) -> Result<()> {
    // TODO[scott]: use tauri-plugin-shell to spawn `binaries/ollama serve`,
    // wait for the version endpoint to respond, store the child handle in
    // app state for clean shutdown.
    Ok(())
}
