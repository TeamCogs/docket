export function ProgressTrack({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div
      title={`${pct}% reviewed`}
      style={{
        width: 92, height: 6, borderRadius: 999,
        background: "var(--surface-3)", overflow: "hidden", flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${pct}%`, height: "100%",
          background: pct === 100 ? "var(--sage)" : "var(--sage-soft-2)",
          transition: "width 240ms",
        }}
      />
    </div>
  );
}
