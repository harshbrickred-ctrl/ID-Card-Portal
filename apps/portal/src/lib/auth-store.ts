import { create } from "zustand";
import type { AuthUser } from "@idportal/contracts";
import { apiFetch } from "./api/client";

type AuthState = {
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (user: AuthUser) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  isSuperAdmin: () => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  setSession: (user) => set({ user, hydrated: true }),
  logout: async () => {
    try {
      await apiFetch<{ ok: boolean }>("/v1/auth/logout", { method: "POST" });
    } catch {
      /* clear local state even if request fails */
    }
    set({ user: null, hydrated: true });
  },
  hydrate: async () => {
    if (typeof window === "undefined") return;
    try {
      const data = await apiFetch<{ user: AuthUser } | null>("/v1/auth/me");
      set({ user: data?.user ?? null, hydrated: true });
    } catch {
      set({ user: null, hydrated: true });
    }
  },
  isSuperAdmin: () => get().user?.role === "SUPER_ADMIN",
}));
