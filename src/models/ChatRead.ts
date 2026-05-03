import mongoose, { Schema, Types, type Model } from "mongoose";

// Senior Desk — per-user read markers.
//
// One row per (user, room) pairing. Stores the id of the last message
// the user has acknowledged in that room; the unread badge is then a
// simple `count where _id > lastReadMessageId`. We deliberately do NOT
// expose this to other users (no WhatsApp-style read ticks in v1) — it's
// a private bookkeeping record.
//
// Group room is the same shape: every user gets one ChatRead row scoped
// to the partner's group room. Created lazily on first "mark as read".

export interface IChatRead {
  _id: Types.ObjectId;
  partnerId: Types.ObjectId;
  userId: Types.ObjectId;
  roomId: Types.ObjectId;
  lastReadMessageId: Types.ObjectId | null;
  lastReadAt: Date;
}

const ChatReadSchema = new Schema<IChatRead>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    lastReadMessageId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    lastReadAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

// One read marker per (user, room). Atomic upsert keys on this.
ChatReadSchema.index({ userId: 1, roomId: 1 }, { unique: true });
// "Unread totals for me across all rooms" — partner-scoped sweep.
ChatReadSchema.index({ partnerId: 1, userId: 1 });

export const ChatRead: Model<IChatRead> =
  (mongoose.models.ChatRead as Model<IChatRead>) ||
  mongoose.model<IChatRead>("ChatRead", ChatReadSchema);
