import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-style className merger. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format milliseconds as a short human string for the Eval Lab. */
export function fmtMs(ms: number): string {
  if (ms < 1_000) return `${ms.toFixed(0)} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} m`;
}

/** Stable id generator — no crypto, fine for client-only ephemera. */
export function shortId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
