# Ethics surface

A reference for how ABA Model Rules and Formal Opinion 512 (2024) shape
Docket's design. Every constraint here exists in the product, not just on
the marketing page.

## ABA Model Rule 1.1 — Competence

Comment 8 requires lawyers to "keep abreast of changes in the law and its
practice, including the benefits and risks associated with relevant
technology." Forty-plus state bars have adopted this comment.

**How Docket addresses it.** First-run modal includes a plain-English
explanation of how the retrieval pipeline works, what the model is, where
the data lives, and what the failure modes are. Tech competence cannot be
delegated to the tool, but the tool can make the relevant facts legible.

## ABA Model Rule 1.6 — Confidentiality

Extends to "information relating to representation," not only material that
falls inside attorney-client privilege.

**How Docket addresses it.** No outbound network calls. All inference, all
retrieval, all storage occurs on the lawyer's device. The Rust core
enumerates every IPC command the webview can invoke; auditors can read that
one file and verify the surface area. The Network Audit settings page
surfaces a `0` bytes-out counter and points lawyers at independent tools
(Little Snitch, `lsof`) to confirm.

## ABA Formal Opinion 512 (July 2024)

Generative AI in legal practice. Key holdings reflected in the product:

- **Independent verification (¶ III).** The brief never displays an
  uncited claim. The re-grounding pass drops any model output that cannot
  be tied to a retrieved passage. The persistent footer reminds the lawyer
  they remain responsible.
- **Confidentiality (¶ II).** Local-only inference satisfies the strict
  reading of Rule 1.6 that cloud tools cannot. There is no model training
  on inputs because the model isn't trained anywhere — its weights are
  frozen on disk.
- **Supervision (¶ IV).** Rules 5.1 and 5.3 apply to AI as a "nonlawyer
  assistant." The brief is framed as draft assistance throughout. Export
  artifacts carry an "AI-assisted draft — attorney review required"
  watermark that the lawyer cannot remove from within the app.
- **Billing (¶ V).** Docket does not integrate with billing systems. This
  is intentional — billing decisions belong to the lawyer.
- **Client consent (¶ VI).** Because nothing leaves the device, the
  confidentiality question that drives the consent inquiry is moot. The
  lawyer may still elect to inform clients as a matter of practice.

## Scope discipline

Docket explicitly does not:

- Recommend legal strategy.
- Predict case outcomes.
- Calculate statutes of limitations.
- Cite law (only documents).
- Produce final work product without attorney review.

These boundaries exist to keep the tool inside the "first-read intelligence"
lane and out of unauthorized-practice or malpractice territory.
