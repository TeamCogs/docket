//! Hardware detection for model-tier routing.

use serde::Serialize;
use sysinfo::System;

#[derive(Serialize)]
pub struct SystemSnapshot {
    pub os: String,
    pub chip: String,
    pub total_ram_gb: u64,
    pub free_disk_gb: u64,
    pub recommended_tier: String,
    pub recommended_model: String,
}

pub fn detect() -> SystemSnapshot {
    let mut sys = System::new_all();
    sys.refresh_all();
    let total_ram_gb = sys.total_memory() / (1024 * 1024 * 1024);

    let chip = inferred_chip();
    let (tier, model) = compute_tier(&chip, total_ram_gb);
    SystemSnapshot {
        os: std::env::consts::OS.to_string(),
        chip,
        total_ram_gb,
        free_disk_gb: 100, // TODO[scott]: real free-disk from `sysinfo::Disks`.
        recommended_tier: tier,
        recommended_model: model,
    }
}

fn inferred_chip() -> String {
    if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
        "apple_silicon".into()
    } else if cfg!(target_os = "macos") {
        "intel_mac".into()
    } else if cfg!(target_os = "windows") {
        "windows_x64".into()
    } else {
        "linux_x64".into()
    }
}

fn compute_tier(chip: &str, ram_gb: u64) -> (String, String) {
    const DEFAULT: &str = "qwen3:32b-instruct-q4_K_M";
    const FALLBACK: &str = "qwen3:8b-instruct-q4_K_M";
    if ram_gb < 16 || chip == "intel_mac" {
        return ("unsupported".into(), FALLBACK.into());
    }
    if ram_gb >= 32 && chip != "intel_mac" {
        return ("default".into(), DEFAULT.into());
    }
    ("fallback".into(), FALLBACK.into())
}
