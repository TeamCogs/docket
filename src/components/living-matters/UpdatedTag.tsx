"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpdatedTagProps {
  at: string; // ISO date string
}

// ─── UpdatedTag ───────────────────────────────────────────────────────────────

export default function UpdatedTag({ at }: UpdatedTagProps) {
  const mmdd = at.slice(5, 10); // "MM-DD"

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium uppercase"
      style={{
        background: "var(--sage-soft)",
        border: "1px solid var(--sage-soft-2)",
        color: "var(--sage)",
        fontSize: 10.5,
        letterSpacing: "0.02em",
      }}
    >
      {/* Sage dot */}
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: 5,
          height: 5,
          background: "var(--sage)",
        }}
        aria-hidden="true"
      />
      Updated &middot; {mmdd}
    </span>
  );
}
