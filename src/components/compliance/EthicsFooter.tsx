/**
 * The persistent footer compliance bar. Spec §1.6: ambient, not modal.
 * Visible on every page so the lawyer is never far from the reminder.
 */
export default function EthicsFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white text-ink-500">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 text-xs leading-snug">
        Draft assistance — verify all citations before relying. You remain
        responsible for this work product under ABA Rule 1.1 and ABA Formal
        Opinion 512 (2024). Docket does not provide legal advice.
      </div>
    </footer>
  );
}
