import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Me } from "@/types";

interface AuthState {
  user: Me | null;
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: Me) => void;
  logout: () => void;
  hasPermission: (slug: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (access, refresh) => {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null });
      },

      hasPermission: (slug) => {
        const { user } = get();
        if (!user) return false;
        if (user.is_superuser) return true;
        return user.permissions?.includes(slug) ?? false;
      },
    }),
    {
      name: "mam-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
    }
  )
);
