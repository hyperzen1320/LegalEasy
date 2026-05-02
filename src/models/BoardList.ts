import mongoose, { Schema, Types, type Model } from "mongoose";

export interface IBoardList {
  _id: Types.ObjectId;
  partnerId: Types.ObjectId;
  boardId: Types.ObjectId;
  title: string;
  sortOrder: number;
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
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Primary canvas query: every list of a board, in left-to-right order
BoardListSchema.index({
  partnerId: 1,
  boardId: 1,
  isDeleted: 1,
  sortOrder: 1,
});

export const BoardList: Model<IBoardList> =
  (mongoose.models.BoardList as Model<IBoardList>) ||
  mongoose.model<IBoardList>("BoardList", BoardListSchema);
