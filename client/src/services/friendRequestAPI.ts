import api from './api';

export const friendRequestAPI = {
  send:       (receiverId: string) =>
    api.post('/friend-requests/send', { receiverId }),

  accept:     (requestId: string) =>
    api.put(`/friend-requests/${requestId}/accept`),

  reject:     (requestId: string) =>
    api.put(`/friend-requests/${requestId}/reject`),

  cancel: (requestId: string) =>
    api.delete(`/friend-requests/${requestId}/cancel`),

  getPending: () =>
    api.get('/friend-requests/pending'),

  getFriends: () =>
    api.get('/friend-requests/friends'),

  getStatus:  (userId: string) =>
    api.get(`/friend-requests/status/${userId}`),
};