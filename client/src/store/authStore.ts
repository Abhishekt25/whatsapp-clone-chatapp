import { create } from 'zustand';
import { User, ApiError } from '../types';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (u: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('wac_token'),
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('wac_token', data.token);
      connectSocket(data.user._id);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const e = err as ApiError;
      const msg = e.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register({ name, email, password });
      localStorage.setItem('wac_token', data.token);
      connectSocket(data.user._id);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const e = err as ApiError;
      const msg = e.response?.data?.message || 'Registration failed';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    disconnectSocket();
    localStorage.removeItem('wac_token');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  loadUser: async () => {
    const token = get().token;
    if (!token) { set({ isLoading: false }); return; }
    try {
      const { data } = await authAPI.getMe();
      connectSocket(data.user._id);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('wac_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (partial) => {
    set((s) => ({ user: s.user ? { ...s.user, ...partial } : null }));
  },

  clearError: () => set({ error: null }),
}));
