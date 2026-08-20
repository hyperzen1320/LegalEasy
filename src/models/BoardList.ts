import mongoose, { Schema, Types, type Model } from "mongoose";

export interface IBoardList {
  _id: Types.ObjectId;
  partnerId: Types.ObjectId;
  boardId: Types.ObjectId;
  title: string;
  // Free-form note shown in the list's ⋮ menu; collaboratively editable.
  description: string;
  // A date the list carries. Defaults (in the UI) to the list's creation
  // date and is editable from the ⋮ menu. null until the user sets one,
  // in which case the serializers fall back to createdAt.
  listDate: Date | null;
  sortOrder: number;
  // Free-form canvas position (used by the React Flow board canvas)
  position: { x: number; y: number };
  width: number;
  // Optional per-list colour override of the board accent
  color: string | null;
  // Set when this column stands for a person — the Works by Person board
  // keeps one per member of the office. It is what makes the roster sync
  // idempotent: a column the office deleted on purpose is not grown back,
  // because the id it carried is still on record.
  seedUserId: Types.ObjectId | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const BoardListSchema = new Schema<IBoardList>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    listDate: { type: Date, default: null },
    sortOrder: { type: Number, default: 0 },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    width: { type: Number, default: 320 },
    color: { type: String, default: null },
    seedUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BoardListSchema.index({
  partnerId: 1,
  boardId: 1,
  isDeleted: 1,
  sortOrder: 1,
});
// Roster sync asks "does this person already have a column here?" — and
// deliberately ignores isDeleted, so a removed column stays removed.
BoardListSchema.index({ boardId: 1, seedUserId: 1 });

export const BoardList: Model<IBoardList> =
  (mongoose.models.BoardList as Model<IBoardList>) ||
  mongoose.model<IBoardList>("BoardList", BoardListSchema);
