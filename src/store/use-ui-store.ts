import { create } from "zustand";

interface UIState {
  isCommandOpen: boolean;
  isCopilotOpen: boolean;
  showLogoutDialog: boolean;

  // Actions
  setCommandOpen: (open: boolean) => void;
  setCopilotOpen: (open: boolean) => void;
  setLogoutDialogOpen: (open: boolean) => void;

  // Toggles
  toggleCommandOpen: () => void;
  toggleCopilotOpen: () => void;
  toggleLogoutDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCommandOpen: false,
  isCopilotOpen: false,
  showLogoutDialog: false,

  setCommandOpen: (open) => set({ isCommandOpen: open }),
  setCopilotOpen: (open) => set({ isCopilotOpen: open }),
  setLogoutDialogOpen: (open) => set({ showLogoutDialog: open }),

  toggleCommandOpen: () => set((state) => ({ isCommandOpen: !state.isCommandOpen })),
  toggleCopilotOpen: () => set((state) => ({ isCopilotOpen: !state.isCopilotOpen })),
  toggleLogoutDialog: () => set((state) => ({ showLogoutDialog: !state.showLogoutDialog })),
}));
