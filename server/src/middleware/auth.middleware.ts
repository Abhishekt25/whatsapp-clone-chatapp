import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { AuthRequest, JwtPayload } from '../types';

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const token = header.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret_dev_only';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ success: false, message: 'User no longer exists' });
      return;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    const e = err as Error;
    if (e.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }
};
