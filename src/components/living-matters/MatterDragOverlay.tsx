"use client";

import { Plus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatterDragOverlayProps {
  active: boolean;
}

// ─── MatterDragOverlay ───────────────────────────────────────────────────────

export default function MatterDragOverlay({ active }: MatterDragOverlayProps) {
  if (!active) return null;

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* Full-bleed dashed border overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 70,
          border: "2px dashed var(--navy)",
          background: "rgba(31,58,95,0.04)",
        }}
        aria-hidden="true"
      />

      {/* Drop pill */}
      <div
        className="fixed flex items-center gap-2.5 rounded-full pointer-events-none"
        style={{
          top: 76,
          right: 28,
          zIndex: 71,
          background: "var(--navy)",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 500,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 16,
          paddingRight: 16,
          boxShadow: "var(--shadow-3)",
          animation: "slideInRight 200ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
        aria-hidden="true"
      >
        <Plus className="size-3.5" strokeWidth={2.4} />
        Drop to add to this matter
      </div>
    </>
  );
}
