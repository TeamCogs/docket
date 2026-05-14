//! IPC commands exposed to the webview.
//!
//! This module is intentionally an exhaustive enumeration. The webview
//! cannot reach the filesystem or the model except through one of these
//! commands. That's what makes the "no data leaves" claim auditable.

pub mod brief;
pub mod ingest;
pub mod matter;
pub mod source;
pub mod system;
