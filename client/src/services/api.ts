import axios, { AxiosInstance } from 'axios';

// In dev, Vite proxy handles /api → localhost:5000
// In prod, set VITE_API_URL
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wac_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wac_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (body: { name: string; email: string; phone: string; password: string }) =>
    api.post('/auth/register', body),
  login: (body: { identifier: string; password: string }) =>
    api.post('/auth/login', body),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', body),
};

// ── Users ──────────────────────────────────────────────────
export const userAPI = {
  getAll: (search = '') => api.get('/users', { params: { search } }),
  getOnline: () => api.get('/users/online'),
  getById: (id: string) => api.get(`/users/${id}`),
  updateProfile: (data: FormData) =>
    api.put('/users/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ── Chats ──────────────────────────────────────────────────
export const chatAPI = {
  accessOrCreate: (participantId: string) =>
    api.post('/chats', { participantId }),
  getMyChats: () => api.get('/chats'),
  getById: (chatId: string) => api.get(`/chats/${chatId}`),
  delete: (chatId: string) => api.delete(`/chats/${chatId}`),
  createGroup: (body: { name: string; participants: string[] }) =>
    api.post('/chats/group', body),
  updateGroup: (chatId: string, data: FormData) =>
    api.put(`/chats/group/${chatId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  addMember: (chatId: string, userId: string) =>
    api.put(`/chats/group/${chatId}/add`, { userId }),
  removeMember: (chatId: string, userId: string) =>
    api.delete(`/chats/group/${chatId}/remove/${userId}`),
};

// ── Messages ───────────────────────────────────────────────
export const messageAPI = {
  send: (data: Record<string, unknown> | FormData) => {
    if (data instanceof FormData) {
      return api.post('/messages', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post('/messages', data);
  },
  getMessages: (chatId: string, page = 1, limit = 50) =>
    api.get(`/messages/${chatId}`, { params: { page, limit } }),
  delete: (messageId: string) => api.delete(`/messages/${messageId}`),
  edit: (messageId: string, content: string) =>
    api.put(`/messages/${messageId}/edit`, { content }),
};

export default api;