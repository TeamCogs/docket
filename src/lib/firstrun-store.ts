"use client";

import { create } from "zustand";

interface FirstRunStore {
  isOpen:  boolean;
  show:    () => void;
  dismiss: () => void;
}

export const useFirstRunStore = create<FirstRunStore>()((set) => ({
  isOpen:  false,
  show:    () => { localStorage.removeItem("docket-firstrun-seen"); set({ isOpen: true }); },
  dismiss: () => { localStorage.setItem("docket-firstrun-seen", "1"); set({ isOpen: false }); },
}));
