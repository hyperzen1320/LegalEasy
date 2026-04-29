import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Board";
import { BOARD_DEFAULTS } from "@/lib/board-defaults";
import BoardsClient, { type BoardRow } from "./BoardsClient";

export const dynamic = "force-dynamic";

export default async function WorkflowPage() {
  const session = await auth();
  const partnerId = session?.user?.partnerId
    ? new mongoose.Types.ObjectId(session.user.partnerId)
    : null;

  let boards: BoardRow[] = [];

  if (partnerId) {
    await connectDB();

    // Lazy-seed defaults the first time this partner visits.
    const count = await Board.countDocuments({
      partnerId,
      isDeleted: false,
    });
    if (count === 0) {
      await Board.insertMany(
        BOARD_DEFAULTS.map((b, idx) => ({
          partnerId,
          title: b.title,
          description: b.description,
          color: b.color,
          sortOrder: idx,
          isSeeded: true,
        }))
      );
    }

    const docs = await Board.find({ partnerId, isDeleted: false })
      .sort({ updatedAt: -1, sortOrder: 1 })
      .lean();

    boards = docs.map((b) => ({
      id: String(b._id),
      title: b.title,
      description: b.description,
      color: b.color,
      isSeeded: b.isSeeded,
      cardCount: 0,
      updatedAt: b.updatedAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
    }));
  }

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1280px]">
        <BoardsClient initialBoards={boards} />
      </div>
    </div>
  );
}
