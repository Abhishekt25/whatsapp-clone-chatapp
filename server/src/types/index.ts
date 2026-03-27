import { Request } from 'express';
import { IUser } from '../models/user.model';

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

export interface SocketUser {
  userId: string;
  socketId: string;
}
