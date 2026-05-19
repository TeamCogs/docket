"use client";

// ─── NewContradictionTag ──────────────────────────────────────────────────────

export default function NewContradictionTag() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-px rounded-[3px] font-semibold ml-2"
      style={{
        background: "var(--brick)",
        color: "#ffffff",
        fontSize: 9.5,
        letterSpacing: "0.06em",
      }}
    >
      NEW
    </span>
  );
}
