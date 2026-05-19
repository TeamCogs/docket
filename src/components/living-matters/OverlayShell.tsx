"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OverlayShellProps {
  onClose: () => void;
  maxWidth?: number;
  children: React.ReactNode;
}

// ─── OverlayFooter ────────────────────────────────────────────────────────────

export function OverlayFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-row items-center justify-between p-5 border-t sticky bottom-0 rounded-b-[14px]"
      style={{
        borderColor: "var(--rule)",
        background: "var(--surface)",
      }}
    >
      {children}
    </div>
  );
}

// ─── OverlayShell ─────────────────────────────────────────────────────────────

export default function OverlayShell({ onClose, maxWidth = 760, children }: OverlayShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{
        zIndex: 180,
        background: "rgba(20,18,12,0.42)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden rounded-[14px]"
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "calc(100vh - 48px)",
          background: "var(--surface)",
          border: "1px solid var(--rule)",
          boxShadow: "var(--shadow-3)",
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          opacity: mounted ? 1 : 0,
          transition:
            "transform 280ms cubic-bezier(0.2,0.8,0.2,1), opacity 280ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
