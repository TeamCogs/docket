"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export function MQSection({
  label,
  subtitle,
  children,
  defaultExpanded = true,
}: {
  label: string;
  subtitle: React.ReactNode;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section style={{ borderBottom: "1px solid var(--rule)", padding: "18px 0 14px" }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", padding: "0 24px",
          textAlign: "left", background: "transparent",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-micro">{label}</div>
          <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            {subtitle}
          </div>
        </div>
        <span className={`mq-caret ${expanded ? "mq-caret-open" : ""}`} aria-hidden>
          <ChevronRight size={14} />
        </span>
      </button>
      {expanded && <div style={{ marginTop: 12 }}>{children}</div>}
    </section>
  );
}
