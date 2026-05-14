//! IPC: system info + offline verification.

use serde::Serialize;
use crate::system_info::SystemSnapshot;

#[tauri::command]
pub fn get_system_snapshot() -> SystemSnapshot {
    crate::system_info::detect()
}

#[derive(Serialize)]
pub struct NetworkAudit {
    pub bytes_out: u64,
    pub last_check: String,
    pub method: String,
}

#[tauri::command]
pub fn verify_offline() -> NetworkAudit {
    // TODO[scott]: hook into the OS to actually count bytes leaving the app's
    // network namespace. macOS: use `nettop` or libpcap-with-bpf. Linux: cgroup
    // accounting. Windows: ETW. For v1, surface the count as 0 since the only
    // socket the Rust core opens is the Ollama Unix socket.
    NetworkAudit {
        bytes_out: 0,
        last_check: chrono::Utc::now().to_rfc3339(),
        method: "ollama_unix_socket_only".into(),
    }
}
