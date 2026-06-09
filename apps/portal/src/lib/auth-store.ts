import { create } from "zustand";
import type { AuthUser } from "@idportal/contracts";
import { clearToken, setToken } from "./api/client";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (data: { token: string; user: AuthUser }) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
  isSuperAdmin: () => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  setSession: (data) => {
    setToken(data.token);
    set({ token: data.token, user: data.user });
  },
  logout: () => {
    clearToken();
    set({ token: null, user: null });
  },
  hydrate: async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("idportal-token");
    if (!token) return;
    set({ token });
    try {
      const res = await fetch("/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data?.user) {
        set({ user: json.data.user });
      }
    } catch {
      clearToken();
      set({ token: null, user: null });
    }
  },
  isSuperAdmin: () => get().user?.role === "SUPER_ADMIN",
}));
