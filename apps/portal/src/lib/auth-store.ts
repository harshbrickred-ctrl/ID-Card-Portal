import { create } from "zustand";
import { clearToken, setToken } from "./api/client";

type AuthState = {
  token: string | null;
  user: { id: string; email: string; name: string } | null;
  organization: { id: string; name: string; plan: string } | null;
  setSession: (data: {
    token: string;
    user: { id: string; email: string; name: string };
    organization: { id: string; name: string; plan: string };
  }) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  organization: null,
  setSession: (data) => {
    setToken(data.token);
    set({
      token: data.token,
      user: data.user,
      organization: data.organization,
    });
  },
  logout: () => {
    clearToken();
    set({ token: null, user: null, organization: null });
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
      if (json.success && json.data) {
        set({
          user: json.data.user,
          organization: json.data.organization,
        });
      }
    } catch {
      clearToken();
      set({ token: null, user: null, organization: null });
    }
  },
}));
