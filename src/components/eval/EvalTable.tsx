"use client";

import { cn } from "@/lib/utils";

export interface EvalRow {
  config:       string;
  recall:       number;
  precision:    number;
  faithfulness: number;
  suppression:  number;
  latency:      number;
  primary?:     boolean;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={cn(
      "px-4 py-3 text-[11.5px] uppercase tracking-[0.06em] text-ink-3 font-medium border-b border-rule",
      align === "left" ? "text-left" : "text-right",
    )}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", mono = false }: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td className={cn(
      "px-4 py-3 text-sm border-b border-rule",
      align === "right" && "text-right",
      mono && "font-mono-sm tabular-nums",
    )}>
      {children}
    </td>
  );
}

export default function EvalTable({ rows }: { rows: EvalRow[] }) {
  return (
    <div className="border border-rule rounded-md overflow-hidden mb-7">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Configuration</Th>
            <Th align="right">Recall@5</Th>
            <Th align="right">Citation precision</Th>
            <Th align="right">Faithfulness</Th>
            <Th align="right">Suppression</Th>
            <Th align="right">p50 latency</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn(r.primary && "bg-surface-2")}>
              <Td>
                <div className="flex items-center gap-2">
                  {r.primary && <span className="size-1.5 rounded-full bg-sage shrink-0" />}
                  <span className={r.primary ? "font-medium" : ""}>{r.config}</span>
                </div>
              </Td>
              <Td align="right" mono>{pct(r.recall)}</Td>
              <Td align="right" mono>{pct(r.precision)}</Td>
              <Td align="right" mono>{pct(r.faithfulness)}</Td>
              <Td align="right" mono>{pct(r.suppression)}</Td>
              <Td align="right" mono>{r.latency.toFixed(1)}s</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
