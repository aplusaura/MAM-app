import { create } from "zustand";

interface SidebarStore {
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  mobileOpen: false,
  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
}));
