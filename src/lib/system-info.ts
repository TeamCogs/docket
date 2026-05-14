/**
 * Hardware detection — drives the model-tier routing.
 *
 * In Tauri production this is replaced by a Rust-side IPC command that uses
 * the `sysinfo` crate. The browser-dev path here exists so `pnpm dev` still
 * produces sensible defaults on Linux/Windows.
 *
 * See spec §2.11 for the tier table.
 */

import type { SystemSnapshot } from "./types";
import os from "node:os";

const GB = 1024 * 1024 * 1024;

export function detectSystem(): SystemSnapshot {
  const platform = os.platform();
  const totalRamGb = Math.round(os.totalmem() / GB);
  // We don't try to estimate free disk from Node — assume the install
  // wouldn't have completed without disk. Tauri override will be accurate.
  const freeDiskGb = 100;

  const platformKind =
    platform === "darwin"
      ? "macos"
      : platform === "win32"
        ? "windows"
        : platform === "linux"
          ? "linux"
          : "unknown";

  const chip = inferChip(platform);
  const tier = computeTier({ chip, totalRamGb });

  return {
    os: platformKind,
    chip,
    totalRamGb,
    freeDiskGb,
    recommendedTier: tier.tier,
    recommendedModel: tier.model,
  };
}

function inferChip(platform: NodeJS.Platform): SystemSnapshot["chip"] {
  if (platform !== "darwin") {
    // Best-effort. Tauri's Rust side does the real work in production.
    if (platform === "win32") return "windows_x64";
    if (platform === "linux") return "linux_x64";
    return "unknown";
  }
  // On macOS we'd shell out to `sysctl hw.model` here. The Rust core does it
  // properly. For dev, we collapse to a coarse heuristic.
  const arch = os.arch();
  if (arch === "arm64") return "apple_m3_or_better";
  return "intel_mac";
}

function computeTier(input: {
  chip: SystemSnapshot["chip"];
  totalRamGb: number;
}): { tier: SystemSnapshot["recommendedTier"]; model: string } {
  const DEFAULT = process.env.DOCKET_MODEL_DEFAULT ?? "qwen3:32b-instruct-q4_K_M";
  const FALLBACK = process.env.DOCKET_MODEL_FALLBACK ?? "qwen3:8b-instruct-q4_K_M";

  if (input.totalRamGb < 16 || input.chip === "intel_mac") {
    return { tier: "unsupported", model: FALLBACK };
  }
  // Highest tier: 32GB+ on M2 Pro or better, or any Linux/Windows with 32GB+.
  const highTierMacs: SystemSnapshot["chip"][] = ["apple_m2_pro_or_better", "apple_m3_or_better"];
  const isHighTierMac = highTierMacs.includes(input.chip);
  const isHighTierOther = input.chip === "windows_x64" || input.chip === "linux_x64";
  if (input.totalRamGb >= 32 && (isHighTierMac || isHighTierOther)) {
    return { tier: "default", model: DEFAULT };
  }
  return { tier: "fallback", model: FALLBACK };
}
