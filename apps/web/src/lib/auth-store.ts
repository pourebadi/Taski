import { create } from 'zustand';

export type CurrentUser = {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  role: string;
  mustChangePassword: boolean;
};

type AuthState = {
  accessToken: string | null; // فقط در حافظه. Refresh در کوکی httpOnly است.
  user: CurrentUser | null;
  setSession: (token: string, user: CurrentUser) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null, user: null }),
}));
