import type { NextConfig } from "next";

/**
 * Docket runs in two modes:
 *   1. Tauri shell (production) — Next.js is statically exported into the webview.
 *   2. Browser dev (developers and contributors on Linux/Windows) — Next.js dev
 *      server with Node-side adapters for what the Rust core normally provides.
 *
 * The `output: 'export'` flag is enabled when bundling for Tauri.
 */
const isTauriBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  output: isTauriBuild ? "export" : undefined,
  images: { unoptimized: isTauriBuild },
  // Strict mode catches double-effect bugs early; we want this on.
  reactStrictMode: true,
  // Server-side libs that should NOT be bundled into client code.
  serverExternalPackages: ["@lancedb/lancedb", "unpdf", "tesseract.js"],
};

export default nextConfig;
