import { io, Socket } from 'socket.io-client';

// Use Vite proxy in dev; explicit URL in prod
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = (userId: string): Socket => {
  if (socket?.connected) {
    socket.emit('user_online', userId);
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
    socket?.emit('user_online', userId);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected by client');
  }
};

export const joinChat = (chatId: string): void => {
  socket?.emit('join_chat', chatId);
};

export const leaveChat = (chatId: string): void => {
  socket?.emit('leave_chat', chatId);
};

export const emitTypingStart = (chatId: string, userId: string, userName: string): void => {
  socket?.emit('typing_start', { chatId, userId, userName });
};

export const emitTypingStop = (chatId: string, userId: string): void => {
  socket?.emit('typing_stop', { chatId, userId });
};

export const emitMessageRead = (messageId: string, chatId: string, userId: string): void => {
  socket?.emit('message_read', { messageId, chatId, userId });
};
