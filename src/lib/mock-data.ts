/**
 * Mock brief used during scaffolding so the UI renders end-to-end before
 * the live RAG pipeline produces real output. Delete this file (and the
 * import in matter/[id]/page.tsx) once IPC is wired.
 */

import type { Brief, Citation } from "./types";

const cit = (id: string): Citation => ({
  id,
  chunkIds: [`enron-2001#${Math.floor(Math.random() * 20)}`],
  grounded: "grounded",
  groundingMethod: "overlap",
  internalScore: 0.92,
});

export const MOCK_ENRON_BRIEF: Brief = {
  matterId: "demo-enron",
  generatedAt: new Date().toISOString(),
  modelVersion: "qwen3:32b-instruct-q4_K_M",
  totalSuppressed: 3,
  latencyMs: {
    snapshot: 4_120,
    parties: 6_980,
    timeline: 11_240,
    claims: 7_840,
    key_facts: 6_140,
    risks: 7_010,
    open_questions: 5_120,
    next_steps: 3_980,
  },
  sections: [
    {
      id: "s1",
      kind: "snapshot",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 0,
      content: {
        matterTypeGuess: "Securities enforcement / accounting fraud",
        matterTypeConfidence: "high",
        parties: ["Enron Corp.", "Kenneth L. Lay", "Jeffrey K. Skilling", "Andrew S. Fastow"],
        jurisdiction: "S.D. Tex. / SEC",
        documentCount: 62,
        dateRange: { from: "1999-01-01", to: "2002-06-30" },
      },
    },
    {
      id: "s2",
      kind: "parties",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 0,
      content: {
        parties: [
          { name: "Enron Corp.", role: "adverse", firstAppearance: cit("c1"), lastAppearance: cit("c1") },
          { name: "Kenneth L. Lay", role: "adverse", firstAppearance: cit("c2"), lastAppearance: cit("c2") },
          { name: "Jeffrey K. Skilling", role: "adverse", firstAppearance: cit("c3"), lastAppearance: cit("c3") },
          { name: "Andrew S. Fastow", role: "adverse", firstAppearance: cit("c4"), lastAppearance: cit("c4") },
          { name: "Sherron Watkins", role: "witness", firstAppearance: cit("c5"), lastAppearance: cit("c5") },
          { name: "Arthur Andersen LLP", role: "third_party", firstAppearance: cit("c6"), lastAppearance: cit("c6") },
        ],
      },
    },
    {
      id: "s3",
      kind: "timeline",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 1,
      content: {
        events: [
          { id: "e1", date: "2001-08-14", description: "Skilling resigns as CEO; Lay reassumes role.", citation: cit("c7") },
          { id: "e2", date: "2001-08-15", description: "Watkins delivers anonymous memo warning of accounting irregularities.", citation: cit("c8") },
          { id: "e3", date: "2001-10-16", description: "Enron announces $618M Q3 loss and $1.2B writedown.", citation: cit("c9") },
          { id: "e4", date: "2001-11-08", description: "Enron restates earnings for 1997-2001, reducing reported income by $586M.", citation: cit("c10") },
          { id: "e5", date: "2001-12-02", description: "Enron files for Chapter 11 bankruptcy.", citation: cit("c11") },
        ],
      },
    },
    {
      id: "s4",
      kind: "claims",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 0,
      content: {
        claims: [
          { label: "Securities fraud (10b-5)", status: "asserted", text: "False statements about financial condition between 1999 and 2001.", citation: cit("c12") },
          { label: "Wire fraud", status: "asserted", text: "Use of interstate wires to further the scheme.", citation: cit("c13") },
          { label: "Insider trading", status: "implied", text: "Officer stock sales during disclosure window.", citation: cit("c14") },
        ],
      },
    },
    {
      id: "s5",
      kind: "key_facts",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 1,
      content: {
        facts: [
          { text: "\"I am incredibly nervous that we will implode in a wave of accounting scandals.\" — Watkins memo, 2001-08-15.", citation: cit("c15") },
          { text: "LJM and Raptor SPEs were used to hide approximately $1.2B in losses from Enron's consolidated balance sheet.", citation: cit("c16") },
        ],
      },
    },
    {
      id: "s6",
      kind: "risks",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 0,
      content: {
        risks: [
          { kind: "contradiction", text: "Lay's Oct 23 all-hands statement (\"third quarter is looking great\") conflicts with internal forecasts shared with the board on Oct 8.", citation: cit("c17") },
          { kind: "admission", text: "Fastow admitted in 2004 plea allocution that LJM transactions were designed to manipulate reported earnings.", citation: cit("c18") },
        ],
      },
    },
    {
      id: "s7",
      kind: "open_questions",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 1,
      content: {
        questions: [
          { kind: "missing_exhibit", text: "Exhibit B (board minutes 10-08-2001) referenced in Watkins memo not present in corpus." },
          { kind: "date_ambiguity", text: "First Raptor closing date — Powers Report says May 2000, 10-K says June 2000." },
        ],
      },
    },
    {
      id: "s8",
      kind: "next_steps",
      generatedAt: new Date().toISOString(),
      modelVersion: "qwen3:32b-instruct-q4_K_M",
      suppressedCount: 0,
      content: {
        steps: [
          { kind: "request_document", text: "Obtain Oct 8, 2001 board minutes (referenced but not in corpus)." },
          { kind: "interview", text: "Sherron Watkins regarding chronology of internal escalation." },
          { kind: "calendar_date", text: "Note SEC complaint filing date for response calendaring." },
        ],
      },
    },
  ],
};
