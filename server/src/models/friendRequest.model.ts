import mongoose, { Document, Schema } from 'mongoose';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface IFriendRequest extends Document {
  _id: mongoose.Types.ObjectId;
  sender:    mongoose.Types.ObjectId;   // User who sent request
  receiver:  mongoose.Types.ObjectId;   // User who received request
  status:    FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    sender:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:   {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate pending requests between same two users
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', friendRequestSchema);