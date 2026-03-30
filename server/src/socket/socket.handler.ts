import { Server, Socket } from 'socket.io';
import { User } from '../models/user.model';
import { Message } from '../models/message.model';

// Map: userId → Set of socketIds (handle multiple tabs)
const onlineUsers = new Map<string, Set<string>>();

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

export const setupSocketHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── User comes online ──────────────────────────────
    socket.on('user_online', async (userId: string) => {
      socket.data.userId = userId;
       socket.join(`user_${userId}`);

      // Register socket
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId)!.add(socket.id);

      // Update DB
      await User.findByIdAndUpdate(userId, { isOnline: true });

      // Broadcast
      socket.broadcast.emit('user_status_change', {
        userId,
        isOnline: true,
        lastSeen: null,
      });

      console.log(`👤 User ${userId} online (socket ${socket.id}). Total online: ${onlineUsers.size}`);
    });

    // ── Join chat room ────────────────────────────────
    socket.on('join_chat', (chatId: string) => {
      socket.join(chatId);
    });

    // ── Leave chat room ───────────────────────────────
    socket.on('leave_chat', (chatId: string) => {
      socket.leave(chatId);
    });

    // ── Typing indicators ─────────────────────────────
    socket.on('typing_start', (data: { chatId: string; userId: string; userName: string }) => {
      socket.to(data.chatId).emit('user_typing', {
        chatId: data.chatId,
        userId: data.userId,
        userName: data.userName,
      });
    });

    socket.on('typing_stop', (data: { chatId: string; userId: string }) => {
      socket.to(data.chatId).emit('user_stopped_typing', {
        chatId: data.chatId,
        userId: data.userId,
      });
    });

    // ── Message status ────────────────────────────────
    socket.on('message_delivered', async (data: { messageId: string; chatId: string }) => {
      try {
        await Message.findByIdAndUpdate(data.messageId, { status: 'delivered' });
        io.to(data.chatId).emit('message_status_updated', {
          messageId: data.messageId,
          chatId: data.chatId,
          status: 'delivered',
        });
      } catch { /* silent */ }
    });

    socket.on('message_read', async (data: { messageId: string; chatId: string; userId: string }) => {
      try {
        await Message.findByIdAndUpdate(data.messageId, {
          status: 'read',
          $addToSet: { readBy: data.userId },
        });
        io.to(data.chatId).emit('message_status_updated', {
          messageId: data.messageId,
          chatId: data.chatId,
          status: 'read',
        });
      } catch { /* silent */ }
    });

    // ── Disconnect ────────────────────────────────────
    socket.on('disconnect', async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      // Remove this specific socket
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);

          // Mark offline in DB
          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });

          // Broadcast
          socket.broadcast.emit('user_status_change', {
            userId,
            isOnline: false,
            lastSeen,
          });

          console.log(`❌ User ${userId} offline. Total online: ${onlineUsers.size}`);
        }
      }
    });

    // ── Get online users ──────────────────────────────
    socket.on('get_online_users', (callback: (ids: string[]) => void) => {
      if (typeof callback === 'function') callback(getOnlineUserIds());
    });
  });
};
