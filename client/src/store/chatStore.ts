import { create } from 'zustand';
import { Chat, Message, Pagination } from '../types';
import { chatAPI, messageAPI } from '../services/api';

interface ChatStore {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  pagination: Pagination | null;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  typingUsers: Record<string, { userId: string; userName: string }[]>;

  // chat actions
  fetchChats: () => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  accessChat: (userId: string) => Promise<Chat>;
  createGroup: (name: string, participants: string[]) => Promise<void>;
  updateChatInList: (chat: Chat) => void;
  removeChatFromList: (chatId: string) => void;

  // message actions
  fetchMessages: (chatId: string, page?: number) => Promise<void>;
  loadMoreMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: string, replyTo?: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  updateMessage: (msg: Message) => void;
  softDeleteMessage: (messageId: string, chatId: string) => void;
  updateLastMessage: (chatId: string, msg: Message) => void;

  // typing
  setTyping: (chatId: string, userId: string, userName: string) => void;
  clearTyping: (chatId: string, userId: string) => void;

  // online status
  updateOnlineStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: [],
  pagination: null,
  isLoadingChats: false,
  isLoadingMessages: false,
  isLoadingMore: false,
  typingUsers: {},

  // ── chats ──────────────────────────────────────────────
  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const { data } = await chatAPI.getMyChats();
      set({ chats: data.chats });
    } finally {
      set({ isLoadingChats: false });
    }
  },

  setActiveChat: (chat) => set({ activeChat: chat, messages: [], pagination: null }),

  accessChat: async (userId) => {
    const { data } = await chatAPI.accessOrCreate(userId);
    set((s) => {
      const exists = s.chats.find((c) => c._id === data.chat._id);
      return exists ? s : { chats: [data.chat, ...s.chats] };
    });
    return data.chat;
  },

  createGroup: async (name, participants) => {
    const { data } = await chatAPI.createGroup({ name, participants });
    set((s) => ({ chats: [data.chat, ...s.chats] }));
  },

  updateChatInList: (chat) => {
    set((s) => ({
      chats: s.chats.map((c) => (c._id === chat._id ? chat : c)),
      activeChat: s.activeChat?._id === chat._id ? chat : s.activeChat,
    }));
  },

  removeChatFromList: (chatId) => {
    set((s) => ({
      chats: s.chats.filter((c) => c._id !== chatId),
      activeChat: s.activeChat?._id === chatId ? null : s.activeChat,
    }));
  },

  // ── messages ───────────────────────────────────────────
  fetchMessages: async (chatId, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const { data } = await messageAPI.getMessages(chatId, page);
      set({ messages: data.messages, pagination: data.pagination });
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  loadMoreMessages: async (chatId) => {
    const { pagination, messages } = get();
    if (!pagination?.hasMore) return;
    set({ isLoadingMore: true });
    try {
      const { data } = await messageAPI.getMessages(chatId, pagination.page + 1);
      set({ messages: [...data.messages, ...messages], pagination: data.pagination });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  sendMessage: async (chatId, content, type = 'text', replyTo) => {
    const body: Record<string, string> = { chatId, content, type };
    if (replyTo) body.replyTo = replyTo;
    await messageAPI.send(body);
  },

  addMessage: (msg) => {
    set((s) => {
      if (s.messages.find((m) => m._id === msg._id)) return s;
      return { messages: [...s.messages, msg] };
    });
    get().updateLastMessage(msg.chat, msg);
  },

  updateMessage: (msg) => {
    set((s) => ({
      messages: s.messages.map((m) => (m._id === msg._id ? msg : m)),
    }));
  },

  softDeleteMessage: (messageId) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m._id === messageId
          ? { ...m, isDeleted: true, content: 'This message was deleted', fileUrl: '', fileName: '' }
          : m
      ),
    }));
  },

  updateLastMessage: (chatId, msg) => {
    set((s) => ({
      chats: s.chats
        .map((c) => (c._id === chatId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }));
  },

  // ── typing ─────────────────────────────────────────────
  setTyping: (chatId, userId, userName) => {
    set((s) => {
      const list = s.typingUsers[chatId] || [];
      if (list.find((u) => u.userId === userId)) return s;
      return { typingUsers: { ...s.typingUsers, [chatId]: [...list, { userId, userName }] } };
    });
  },

  clearTyping: (chatId, userId) => {
    set((s) => ({
      typingUsers: {
        ...s.typingUsers,
        [chatId]: (s.typingUsers[chatId] || []).filter((u) => u.userId !== userId),
      },
    }));
  },

  // ── online status ──────────────────────────────────────
  updateOnlineStatus: (userId, isOnline, lastSeen) => {
    const patch = (p: Chat['participants']) =>
      p.map((u) => (u._id === userId ? { ...u, isOnline, ...(lastSeen ? { lastSeen } : {}) } : u));
    set((s) => ({
      chats: s.chats.map((c) => ({ ...c, participants: patch(c.participants) })),
      activeChat: s.activeChat
        ? { ...s.activeChat, participants: patch(s.activeChat.participants) }
        : null,
    }));
  },
}));
