import { Response } from 'express';
import { User } from '../models/user.model';
import { AuthRequest } from '../types';

/**
 * GET /api/users?search=&limit=
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = (req.query.search as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const filter: Record<string, unknown> = { _id: { $ne: req.user?._id } };
    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').limit(limit).sort({ name: 1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/users/:id
 */
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.status(200).json({ success: true, user });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PUT /api/users/profile  – update name / status / avatar
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, status } = req.body;
    const update: Record<string, string> = {};
    if (name?.trim()) update.name = name.trim();
    if (status !== undefined) update.status = status;
    if (req.file) update.avatar = `/uploads/${req.file.filename}`;

    if (Object.keys(update).length === 0) {
      res.status(400).json({ success: false, message: 'No fields to update' });
      return;
    }

    const user = await User.findByIdAndUpdate(req.user?._id, update, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({ success: true, user });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/users/online  – currently online users
 */
export const getOnlineUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({ isOnline: true, _id: { $ne: req.user?._id } }).select('-password').limit(50);
    res.status(200).json({ success: true, users });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};
