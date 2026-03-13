import { Response } from 'express';
import mongoose from 'mongoose';
import { Chat } from '../models/chat.model';
import { AuthRequest } from '../types';

// Helper: populate a chat query fully
const populateFull = (q: ReturnType<typeof Chat.findOne> | ReturnType<typeof Chat.findById>) =>
  q
    .populate('participants', '-password')
    .populate('admin', '-password')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'name avatar email' },
    });

/**
 * POST /api/chats
 * Access or create a 1-on-1 chat
 */
export const accessOrCreateChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      res.status(400).json({ success: false, message: 'participantId is required' });
      return;
    }

    // Find existing 1-on-1
    let chat = await populateFull(
      Chat.findOne({
        isGroupChat: false,
        participants: { $all: [req.user?._id, participantId], $size: 2 },
      })
    );

    if (chat) {
      res.status(200).json({ success: true, chat });
      return;
    }

    // Create new
    const created = await Chat.create({
      isGroupChat: false,
      participants: [req.user?._id, new mongoose.Types.ObjectId(participantId)],
    });

    chat = await populateFull(Chat.findById(created._id));
    res.status(201).json({ success: true, chat });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/chats
 * Get all chats for current user
 */
export const getMyChats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chats = await Chat.find({ participants: req.user?._id })
      .populate('participants', '-password')
      .populate('admin', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar email' },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: chats.length, chats });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/chats/:chatId
 */
export const getChatById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chat = await populateFull(Chat.findById(req.params.chatId));
    if (!chat) { res.status(404).json({ success: false, message: 'Chat not found' }); return; }

    const isMember = chat.participants.some(
      (p: { _id: mongoose.Types.ObjectId }) => p._id.toString() === req.user?._id.toString()
    );
    if (!isMember) { res.status(403).json({ success: false, message: 'Not a member' }); return; }

    res.status(200).json({ success: true, chat });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/chats/group
 */
export const createGroupChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, participants } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Group name is required' });
      return;
    }
    if (!Array.isArray(participants) || participants.length < 2) {
      res.status(400).json({ success: false, message: 'At least 2 participants required' });
      return;
    }

    const allParticipants = [
      req.user?._id,
      ...participants.map((id: string) => new mongoose.Types.ObjectId(id)),
    ];

    const created = await Chat.create({
      isGroupChat: true,
      name: name.trim(),
      participants: allParticipants,
      admin: req.user?._id,
    });

    const chat = await populateFull(Chat.findById(created._id));
    res.status(201).json({ success: true, chat });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PUT /api/chats/group/:chatId
 */
export const updateGroupChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat || !chat.isGroupChat) {
      res.status(404).json({ success: false, message: 'Group chat not found' });
      return;
    }
    if (chat.admin?.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Only admin can update the group' });
      return;
    }

    const update: Record<string, string> = {};
    if (req.body.name?.trim()) update.name = req.body.name.trim();
    if (req.file) update.avatar = `/uploads/${req.file.filename}`;

    const updated = await populateFull(Chat.findByIdAndUpdate(chatId, update, { new: true }));
    res.status(200).json({ success: true, chat: updated });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PUT /api/chats/group/:chatId/add
 */
export const addToGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat?.isGroupChat) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }
    if (chat.admin?.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Admin only' });
      return;
    }
    if (chat.participants.map(String).includes(userId)) {
      res.status(400).json({ success: false, message: 'Already a member' });
      return;
    }

    const updated = await populateFull(
      Chat.findByIdAndUpdate(
        chatId,
        { $addToSet: { participants: new mongoose.Types.ObjectId(userId) } },
        { new: true }
      )
    );
    res.status(200).json({ success: true, chat: updated });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /api/chats/group/:chatId/remove/:userId
 */
export const removeFromGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatId, userId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat?.isGroupChat) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }
    if (chat.admin?.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Admin only' });
      return;
    }

    const updated = await populateFull(
      Chat.findByIdAndUpdate(
        chatId,
        { $pull: { participants: new mongoose.Types.ObjectId(userId) } },
        { new: true }
      )
    );
    res.status(200).json({ success: true, chat: updated });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /api/chats/:chatId  – leave group (or delete 1-on-1)
 */
export const deleteOrLeaveChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) { res.status(404).json({ success: false, message: 'Chat not found' }); return; }

    if (chat.isGroupChat) {
      await Chat.findByIdAndUpdate(chatId, {
        $pull: { participants: req.user?._id },
      });
      res.status(200).json({ success: true, message: 'Left group' });
    } else {
      await Chat.findByIdAndDelete(chatId);
      res.status(200).json({ success: true, message: 'Chat deleted' });
    }
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};
