import { Response } from 'express';
import { FriendRequest } from '../models/friendRequest.model';
import { AuthRequest } from '../types';
import { io } from '../index';

// ── helper: populate sender/receiver ─────────────────────
const populate = (q: ReturnType<typeof FriendRequest.find> | ReturnType<typeof FriendRequest.findOne>) =>
  q.populate('sender',   'name avatar email isOnline')
   .populate('receiver', 'name avatar email isOnline');

// ─────────────────────────────────────────────────────────
/**
 * POST /api/friend-requests/send
 * Send a follow/friend request to another user
 */
export const sendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user?._id.toString();

    if (!receiverId) {
      res.status(400).json({ success: false, message: 'receiverId is required' });
      return;
    }

    if (receiverId === senderId) {
      res.status(400).json({ success: false, message: 'Cannot send request to yourself' });
      return;
    }

    // Check if a request already exists in either direction
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: senderId,   receiver: receiverId },
        { sender: receiverId, receiver: senderId   },
      ],
    });

    if (existing) {
      if (existing.status === 'pending') {
        res.status(409).json({ success: false, message: 'Request already sent' });
        return;
      }
      if (existing.status === 'accepted') {
        res.status(409).json({ success: false, message: 'You are already friends' });
        return;
      }
      // If previously rejected — delete old one and allow re-send
      if (existing.status === 'rejected') {
        await FriendRequest.findByIdAndDelete(existing._id);
      }
    }

    const request = await FriendRequest.create({ sender: senderId, receiver: receiverId });
    const populated = await populate(FriendRequest.findById(request._id));

    // Real-time: notify the receiver
    io.to(`user_${receiverId}`).emit('friend_request_received', populated);
    

    res.status(201).json({ success: true, request: populated });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─────────────────────────────────────────────────────────
/**
 * PUT /api/friend-requests/:requestId/accept
 */
export const acceptRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    if (request.receiver.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Not your request' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Request already handled' });
      return;
    }

    request.status = 'accepted';
    await request.save();

   const populated = await FriendRequest.findById(request._id)
  .populate('sender', 'name avatar email isOnline')
  .populate('receiver', 'name avatar email isOnline')
  .lean();

    // Notify sender that their request was accepted
    io.to(`user_${request.sender.toString()}`).emit('friend_request_accepted', populated);

    res.status(200).json({ success: true, request: populated });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─────────────────────────────────────────────────────────
/**
 * PUT /api/friend-requests/:requestId/reject
 */
export const rejectRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' }); return;
    }
    if (request.receiver.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Not your request' }); return;
    }

    request.status = 'rejected';
    await request.save();

    // Notify sender that request was rejected
    io.to(`user_${request.sender.toString()}`).emit('friend_request_rejected', {
      requestId: request._id,
      senderId:  request.sender,
    });

    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─────────────────────────────────────────────────────────
/**
 * GET /api/friend-requests/pending
 * Get all pending requests received by me
 */
export const getPendingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await populate(
      FriendRequest.find({ receiver: req.user?._id, status: 'pending' })
    ).sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─────────────────────────────────────────────────────────
/**
 * GET /api/friend-requests/friends
 * Get all accepted friends (both directions)
 */
export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?._id;

    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ sender: myId }, { receiver: myId }],
    })
      .populate('sender',   'name avatar email isOnline lastSeen')
      .populate('receiver', 'name avatar email isOnline lastSeen');

    // Return the "other" user from each accepted request
    const friends = accepted.map(r => {
      const s = r.sender as unknown as { _id: { toString(): string } };
      return s._id.toString() === myId?.toString() ? r.receiver : r.sender;
    });

    res.status(200).json({ success: true, friends });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─────────────────────────────────────────────────────────
/**
 * GET /api/friend-requests/status/:userId
 * Get request status between me and another user
 * Returns: none | pending_sent | pending_received | accepted | rejected
 */
export const getStatusWith = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const myId     = req.user?._id.toString();
    const otherId  = req.params.userId;

    const request = await FriendRequest.findOne({
      $or: [
        { sender: myId,   receiver: otherId },
        { sender: otherId, receiver: myId  },
      ],
    });

    if (!request) {
      res.status(200).json({ success: true, status: 'none', requestId: null });
      return;
    }

    let status = request.status as string;
    // Differentiate who sent it
    if (request.status === 'pending') {
      status = request.sender.toString() === myId ? 'pending_sent' : 'pending_received';
    }

    res.status(200).json({ success: true, status, requestId: request._id });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

export const cancelRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    const myId = req.user?._id.toString();

    // Only sender can cancel
    if (request.sender.toString() !== myId) {
      res.status(403).json({ success: false, message: 'Only sender can cancel this request' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Request already handled' });
      return;
    }

    // DELETE instead of marking rejected → clean state
    await FriendRequest.findByIdAndDelete(request._id);

    // Optional socket event
    io.to(`user_${request.receiver.toString()}`).emit('friend_request_cancelled', {
      requestId: request._id,
    });

    res.status(200).json({ success: true, message: 'Request cancelled' });

  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};