import { Response } from 'express';
import { Message } from '../models/message.model';
import { Chat } from '../models/chat.model';
import { AuthRequest } from '../types';
import { io } from '../index';

const populateMessage = (q: ReturnType<typeof Message.findById>) =>
  q
    .populate('sender', 'name avatar email')
    .populate({
      path: 'replyTo',
      populate: { path: 'sender', select: 'name avatar' },
    });

/**
 * POST /api/messages
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatId, content, type = 'text', replyTo } = req.body;

    if (!chatId) { res.status(400).json({ success: false, message: 'chatId is required' }); return; }
    if (!content?.trim() && !req.file) {
      res.status(400).json({ success: false, message: 'Message content or file required' });
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) { res.status(404).json({ success: false, message: 'Chat not found' }); return; }

    const isMember = chat.participants.map(String).includes(req.user?._id.toString() || '');
    if (!isMember) { res.status(403).json({ success: false, message: 'Not a member' }); return; }

    const msgData: Record<string, unknown> = {
      chat: chatId,
      sender: req.user?._id,
      content: content?.trim() || req.file?.originalname || 'File',
      type,
    };

    if (req.file) {
      msgData.fileUrl = `/uploads/${req.file.filename}`;
      msgData.fileName = req.file.originalname;
      msgData.fileSize = req.file.size;
      if (!content?.trim()) msgData.content = req.file.originalname;
    }

    if (replyTo) msgData.replyTo = replyTo;

    const created = await Message.create(msgData);
    const message = await populateMessage(Message.findById(created._id));

    // Update chat's lastMessage + bump updatedAt for ordering
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: created._id,
      updatedAt: new Date(),
    });

    // Real-time broadcast to everyone in the chat room
    io.to(chatId).emit('new_message', message);

    res.status(201).json({ success: true, message });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/messages/:chatId?page=1&limit=50
 */
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    const chat = await Chat.findById(chatId);
    if (!chat) { res.status(404).json({ success: false, message: 'Chat not found' }); return; }

    const isMember = chat.participants.map(String).includes(req.user?._id.toString() || '');
    if (!isMember) { res.status(403).json({ success: false, message: 'Not a member' }); return; }

    const [messages, total] = await Promise.all([
      Message.find({ chat: chatId })
        .populate('sender', 'name avatar email')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'name avatar' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ chat: chatId }),
    ]);

    // Mark unread messages as read
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.user?._id },
        readBy: { $ne: req.user?._id },
      },
      {
        $addToSet: { readBy: req.user?._id },
        $set: { status: 'read' },
      }
    );

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // oldest first
      pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /api/messages/:messageId
 * Soft-delete: marks isDeleted = true
 */
export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) { res.status(404).json({ success: false, message: 'Message not found' }); return; }
    if (msg.sender.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Not your message' });
      return;
    }

    msg.isDeleted = true;
    msg.content = 'This message was deleted';
    msg.fileUrl = '';
    msg.fileName = '';
    await msg.save();

    io.to(msg.chat.toString()).emit('message_deleted', { messageId: msg._id, chatId: msg.chat });

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PUT /api/messages/:messageId/edit
 */
export const editMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ success: false, message: 'Content required' }); return; }

    const msg = await Message.findById(req.params.messageId);
    if (!msg) { res.status(404).json({ success: false, message: 'Message not found' }); return; }
    if (msg.sender.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Not your message' });
      return;
    }
    if (msg.isDeleted) { res.status(400).json({ success: false, message: 'Cannot edit deleted message' }); return; }

    msg.content = content.trim();
    msg.isEdited = true;
    await msg.save();

    const updated = await populateMessage(Message.findById(msg._id));
    io.to(msg.chat.toString()).emit('message_edited', updated);

    res.status(200).json({ success: true, message: updated });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};
