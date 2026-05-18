"use client";

import { create } from "zustand";

export type LicenseKind =
  | { kind: "trial"; daysLeft: number }
  | { kind: "active"; expiresAt: string }
  | { kind: "renewal"; daysLeft: number }
  | { kind: "expired"; expiredAt: string };

interface LicenseStore {
  license: LicenseKind;
  setLicense: (license: LicenseKind) => void;
}

export const useLicenseStore = create<LicenseStore>()((set) => ({
  license: { kind: "active", expiresAt: "" },
  setLicense: (license) => set({ license }),
}));

export function useReadOnly(): boolean {
  const { license } = useLicenseStore();
  return license.kind === "expired";
}
