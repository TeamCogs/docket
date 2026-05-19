"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SidePanelProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

// ─── SidePanelFooter ─────────────────────────────────────────────────────────

export function SidePanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-row items-center justify-between p-5 border-t sticky bottom-0"
      style={{
        borderColor: "var(--rule)",
        background: "var(--surface)",
      }}
    >
      {children}
    </div>
  );
}

// ─── SidePanel ────────────────────────────────────────────────────────────────

export default function SidePanel({ title, subtitle, onClose, children }: SidePanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger slide-in on next paint
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 159,
          background: "rgba(20,18,12,0.25)",
        }}
        onClick={onClose ?? undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 flex flex-col"
        style={{
          width: 420,
          zIndex: 160,
          background: "var(--surface)",
          borderLeft: "1px solid var(--rule)",
          boxShadow: "var(--shadow-3)",
          transform: mounted ? "translateX(0)" : "translateX(420px)",
          transition: "transform 280ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div
          className="flex flex-col gap-0.5 px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: "var(--rule)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              className={cn("text-h3 flex-1 min-w-0")}
              style={{ color: "var(--ink)" }}
            >
              {title}
            </h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-[120ms]"
                style={{ color: "var(--ink-3)" }}
                aria-label="Close panel"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--surface-3)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            )}
          </div>
          {subtitle && (
            <p className="text-small" style={{ color: "var(--ink-3)" }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </>
  );
}
