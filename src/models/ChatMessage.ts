import mongoose, { Schema, Types, type Model } from "mongoose";

// Senior Desk — individual chat messages.
//
// Sender identity is denormalised (senderName, senderRole) so a message
// keeps rendering correctly even after the user is deactivated, removed
// from the office, or has their name/role changed. The live `actorUserId`
// reference is preserved on `senderId` for permission checks (edit/delete).
//
// Soft-deletes only — we set `isDeleted: true` and replace the body with
// a placeholder client-side. This keeps the message-id chain intact so
// reply threads (future) and the activity audit don't develop holes.

export type ChatMessageType = "text" | "system";

export interface IChatMessage {
  _id: Types.ObjectId;
  partnerId: Types.ObjectId;
  roomId: Types.ObjectId;
  senderId: Types.ObjectId | null;
  senderName: string;
  senderRole: string;
  body: string;
  type: ChatMessageType;
  isDeleted: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    senderName: { type: String, default: "", trim: true },
    senderRole: { type: String, default: "", trim: true },
    // Hard cap at 4000 chars enforced at the API; the schema validator is
    // the last line of defence.
    body: { type: String, default: "", maxlength: 4000 },
    type: {
      type: String,
      enum: ["text", "system"],
      default: "text",
    },
    isDeleted: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Paginate a single room's history — newest first, with a `before` cursor
// (`createdAt` desc OR `_id` desc both work because ObjectIds embed time).
ChatMessageSchema.index({ roomId: 1, createdAt: -1 });
// Audit query: "all chat messages this user sent in the last 30 days".
ChatMessageSchema.index({ partnerId: 1, senderId: 1, createdAt: -1 });

export const ChatMessage: Model<IChatMessage> =
  (mongoose.models.ChatMessage as Model<IChatMessage>) ||
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
