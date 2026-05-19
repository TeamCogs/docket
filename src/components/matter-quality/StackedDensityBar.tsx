export function StackedDensityBar({ single, multi }: { single: number; multi: number }) {
  const total = single + multi;
  if (!total) {
    return (
      <div
        style={{ width: 92, height: 6, borderRadius: 999, background: "var(--surface-3)", flexShrink: 0 }}
      />
    );
  }
  const multiPct = (multi / total) * 100;
  const singlePct = (single / total) * 100;
  return (
    <div
      title={`${multi} multi-source · ${single} single-source`}
      style={{
        width: 92, height: 6, borderRadius: 999,
        background: "var(--surface-3)", overflow: "hidden",
        display: "flex", flexShrink: 0,
      }}
    >
      <div style={{ width: `${multiPct}%`, background: "var(--navy)", height: "100%" }} />
      <div style={{ width: `${singlePct}%`, background: "var(--navy-soft-2)", height: "100%" }} />
    </div>
  );
}
