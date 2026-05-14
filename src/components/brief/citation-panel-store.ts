"use client";

import { create } from "zustand";
import type { Citation } from "@/lib/types";

interface CitationPanelState {
  citation: Citation | null;
  isOpen: boolean;
  open: (c: Citation) => void;
  close: () => void;
}

export const useCitationPanel = create<CitationPanelState>((set) => ({
  citation: null,
  isOpen: false,
  open: (c) => set({ citation: c, isOpen: true }),
  close: () => set({ isOpen: false, citation: null }),
}));
