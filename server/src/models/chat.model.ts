import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  isGroupChat: boolean;
  name: string;
  avatar: string;
  participants: mongoose.Types.ObjectId[];
  admin: mongoose.Types.ObjectId | null;
  lastMessage: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    isGroupChat: { type: Boolean, default: false },
    name: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    admin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
