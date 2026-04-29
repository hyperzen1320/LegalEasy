import mongoose, { Schema, Types, type Model } from "mongoose";

export type BoardColor =
  | "forest"
  | "copper"
  | "sea"
  | "terracotta"
  | "ochre"
  | "plum"
  | "ink";

export interface IBoard {
  _id: Types.ObjectId;
  partnerId: Types.ObjectId;
  title: string;
  description: string;
  color: BoardColor;
  sortOrder: number;
  isSeeded: boolean;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const BoardSchema = new Schema<IBoard>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    color: {
      type: String,
      enum: ["forest", "copper", "sea", "terracotta", "ochre", "plum", "ink"],
      default: "copper",
      required: true,
    },
    sortOrder: { type: Number, default: 0 },
    isSeeded: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BoardSchema.index({ partnerId: 1, isDeleted: 1, sortOrder: 1, updatedAt: -1 });

export const Board: Model<IBoard> =
  (mongoose.models.Board as Model<IBoard>) ||
  mongoose.model<IBoard>("Board", BoardSchema);
