import { detectSystem } from "@/lib/system-info";

export default function SettingsPage() {
  const sys = detectSystem();
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="font-sans text-2xl sm:text-3xl tracking-tight font-semibold text-ink-900">
          Settings
        </h1>
        <p className="text-sm text-ink-600">
          Everything Docket does lives on this machine. There are no remote
          credentials to manage.
        </p>
      </header>

      <Section title="System">
        <Field label="OS" value={sys.os} />
        <Field label="Chip" value={sys.chip} />
        <Field label="Memory" value={`${sys.totalRamGb} GB`} />
        <Field label="Recommended tier" value={sys.recommendedTier} />
        <Field label="Default model" value={sys.recommendedModel} />
      </Section>

      <Section title="Network audit">
        <p className="text-sm text-ink-700">
          Outbound traffic this session: <span className="font-mono">0</span> bytes.
        </p>
        <p className="text-xs text-ink-500">
          In Tauri production this number is reported by the Rust core, which
          inspects every socket the webview attempts to open. Use{" "}
          <span className="font-mono">Little Snitch</span> or{" "}
          <span className="font-mono">lsof</span> to confirm independently.
        </p>
      </Section>

      <Section title="Grounding mode">
        <p className="text-sm text-ink-700">
          Controls how aggressively the re-grounding pass suppresses ungrounded
          claims.
        </p>
        <select className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm" defaultValue="balanced">
          <option value="strict">Strict — drop anything below 0.85 cosine</option>
          <option value="balanced">Balanced (default) — 0.78 cosine</option>
          <option value="lenient">Lenient — 0.68 cosine</option>
        </select>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 space-y-3">
      <h2 className="font-sans text-sm font-medium uppercase tracking-wider text-ink-500">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="font-mono text-ink-900">{value}</span>
    </div>
  );
}
