import { create } from 'zustand';
import { friendRequestAPI } from '../services/friendRequestAPI';

export interface FriendRequest {
  _id: string;
  sender: {
    _id: string; name: string; avatar: string;
    email: string; isOnline: boolean;
  };
  receiver: {
    _id: string; name: string; avatar: string;
    email: string; isOnline: boolean;
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface FriendStore {
  pendingRequests: FriendRequest[];   // requests I received
  friends:         { _id: string; name: string; avatar: string; email: string; isOnline: boolean }[];
  isLoading:       boolean;

  fetchPending:    () => Promise<void>;
  fetchFriends:    () => Promise<void>;
  sendRequest:     (receiverId: string) => Promise<void>;
  acceptRequest:   (requestId: string) => Promise<void>;
  rejectRequest:   (requestId: string) => Promise<void>;

  // Called by socket events
  addIncoming:     (req: FriendRequest) => void;
  removeRequest:   (requestId: string) => void;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  pendingRequests: [],
  friends:         [],
  isLoading:       false,

  fetchPending: async () => {
    set({ isLoading: true });
    try {
      const { data } = await friendRequestAPI.getPending();
      set({ pendingRequests: data.requests });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFriends: async () => {
    try {
      const { data } = await friendRequestAPI.getFriends();
      set({ friends: data.friends });
    } catch { /* silent */ }
  },

  sendRequest: async (receiverId) => {
    await friendRequestAPI.send(receiverId);
  },

  acceptRequest: async (requestId) => {
    await friendRequestAPI.accept(requestId);
    // Remove from pending, refresh friends
    set(s => ({ pendingRequests: s.pendingRequests.filter(r => r._id !== requestId) }));
    get().fetchFriends();
  },

  rejectRequest: async (requestId) => {
    await friendRequestAPI.reject(requestId);
    set(s => ({ pendingRequests: s.pendingRequests.filter(r => r._id !== requestId) }));
  },

  // Socket: new request arrived
  addIncoming: (req) => {
    set(s => {
      if (s.pendingRequests.find(r => r._id === req._id)) return s;
      return { pendingRequests: [req, ...s.pendingRequests] };
    });
  },

  // Socket: accepted/rejected — remove from list
  removeRequest: (requestId) => {
    set(s => ({ pendingRequests: s.pendingRequests.filter(r => r._id !== requestId) }));
  },
}));