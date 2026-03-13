import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { AuthRequest } from '../types';

// ─── helpers ─────────────────────────────────────────────
const JWT_SECRET = () => process.env.JWT_SECRET || 'fallback_secret_dev_only';
const JWT_EXPIRE = () => (process.env.JWT_EXPIRE || '7d') as jwt.SignOptions['expiresIn'];

const signToken = (id: string): string =>
  jwt.sign({ id }, JWT_SECRET(), { expiresIn: JWT_EXPIRE() });

const safeUser = (u: InstanceType<typeof User>) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  avatar: u.avatar,
  status: u.status,
  isOnline: u.isOnline,
  lastSeen: u.lastSeen,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ─── controllers ─────────────────────────────────────────

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ success: false, message: 'Name, email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    // Check existing
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    // Create
    const user = await User.create({ name: name.trim(), email, password });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: signToken(user._id.toString()),
      user: safeUser(user),
    });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const match = await user.comparePassword(password);
    if (!match) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    // Mark online
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: signToken(user._id.toString()),
      user: safeUser(user),
    });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    res.status(200).json({ success: true, user: safeUser(req.user as InstanceType<typeof User>) });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PUT /api/auth/change-password
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Both passwords required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password too short' });
      return;
    }

    const user = await User.findById(req.user?._id).select('+password');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const match = await user.comparePassword(currentPassword);
    if (!match) { res.status(401).json({ success: false, message: 'Current password incorrect' }); return; }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, message: e.message });
  }
};
