export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;       // ← NEW
  avatar: string;
  status: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'file' | 'audio';

export interface Message {
  _id: string;
  chat: string;
  sender: User;
  content: string;
  type: MessageType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  status: MessageStatus;
  readBy: string[];
  replyTo?: Message | null;
  isDeleted: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  isGroupChat: boolean;
  name: string;
  avatar: string;
  participants: User[];
  admin?: User | null;
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

export interface TypingUser {
  chatId: string;
  userId: string;
  userName: string;
}

export interface ApiError {
  response?: {
    data?: { message?: string };
    status?: number;
  };
  message?: string;
}