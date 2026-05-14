# Enron demo corpus

The Enron matter is Docket's shipped demo corpus. It is selected because
it is recognizable to non-lawyer reviewers, narratively rich, voluminous
enough to populate all eight brief sections, and free of copyright or
licensing concerns (all materials below are public-domain or public-record).

## What to put here

Approximately 60 documents drawn from:

- **SEC v. Lay, et al.** (S.D. Tex.) — complaint and selected exhibits.
  Source: SEC litigation releases archive.
- **United States v. Skilling** — selected DOJ filings. Source: PACER, plus
  the EDGAR record of Enron's 8-K filings.
- **The Powers Report** (February 2002) — Enron's internal investigation
  into related-party transactions. Public-domain.
- **The Watkins memo** (August 2001) — included in the public Congressional
  record.
- **Enron 10-K filings** for FY1999 and FY2000. EDGAR.
- **A small selection of Enron emails** from the FERC release (the "Enron
  Email Dataset"). Use the 2009 May Carnegie Mellon version for stability.
- **Two Arthur Andersen audit working papers** released during litigation.

Aim for 40-60 documents total. Mix file types: text-layer PDFs (10-Ks),
scanned PDFs (where available, to exercise OCR), and `.eml`-formatted email.

## How to populate

```bash
# From the docket/ directory:
mkdir -p demo-data/enron
# (Manual download until the fetch script lands in v0.2.)
# Put downloaded files in demo-data/enron/.

pnpm dev
# Then from the Library page, drop the demo-data/enron folder.
```

## License & sourcing notes

All recommended sources are part of the public record (SEC, DOJ, PACER,
EDGAR, FERC, Congressional record). Where a derivative compilation is used
(e.g., the CMU version of the Enron Email Dataset), the license is
permissive for research use. Do not commit the documents themselves into
this repository — leave the directory empty and let users populate it.
