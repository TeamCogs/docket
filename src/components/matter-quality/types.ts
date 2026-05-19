import type { MatterId, SectionId, ChunkId } from "@/lib/types";

export type ClaimId = string; // e.g. "snapshot:p1", "risks:p3"

export interface ClaimEntry {
  id: ClaimId;
  sectionId: SectionId;
  sectionKind: string;
  text: string;
  citeCount: number;
}

export interface SectionQuality {
  sectionId: SectionId;
  sectionKind: string;
  total: number;
  single: number;
  multi: number;
  reviewed: number;
}

export interface SuppressedClaim {
  id: string;
  sectionId: SectionId;
  sectionKind: string;
  text: string;
  attemptedCites: string[];
  reason: string | null;
  droppedAt: string;
  briefVersionId: string;
}

export interface UncitedDoc {
  id: string;
  filename: string;
  kind: string;
  sourceType: string;
  pageCount: number;
  ingestedAt: string;
  summary: string | null;
}

export interface DocCoverage {
  totalIngested: number;
  citedCount: number;
  uncitedCount: number;
  uncited: UncitedDoc[];
}

export interface CarryForward {
  fromVersion: string;
  carried: number;
}

export interface MatterQuality {
  matterId: MatterId;
  versionId: string;
  total: number;
  totalSingle: number;
  totalMulti: number;
  totalReviewed: number;
  sectionsOrdered: SectionQuality[];
  suppressed: SuppressedClaim[];
  coverage: DocCoverage;
  carryForward: CarryForward | null;
}

export interface ReviewedClaimsValue {
  reviewed: Set<ClaimId>;
  carried: Set<ClaimId>;
  mark: (id: ClaimId, via?: "source_view" | "direct_toggle") => void;
  unmark: (id: ClaimId) => void;
  toggle: (id: ClaimId) => void;
}
