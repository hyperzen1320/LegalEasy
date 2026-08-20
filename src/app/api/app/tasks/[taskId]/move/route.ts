import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { BoardList } from "@/models/BoardList";
import { Board } from "@/models/Board";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";
import { canPerform, workflowDeny } from "@/lib/workflow-rbac";
import { loadTask } from "@/lib/workflow-helpers";
import { logWorkflowActivity } from "@/lib/activity";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

// POST /api/app/tasks/[taskId]/move
// Body: { toListId: string, toIndex: number }
//
// The destination list may live on a different board of the same
// chambers — that is how a card is handed from one board to another. The
// task's boardId follows its list, so nothing downstream has to reconcile
// the two.
//
// Side-effects: shifts sortOrders in the destination list, logs a
// `task.moved` activity entry that records the source and destination
// list (and board, when it changed).
export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

  if (!canPerform(guard.ctx.user.role, "taskEdit")) {
    return workflowDeny("taskEdit", guard.ctx.isMobile, corsHeaders);
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json(
      { error: "Invalid body" },
      { status: 400, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  const toListId =
    typeof body.toListId === "string" ? body.toListId.trim() : "";
  const toIndex = Number(body.toIndex);
  if (
    !mongoose.isValidObjectId(toListId) ||
    !Number.isFinite(toIndex) ||
    toIndex < 0
  ) {
    return NextResponse.json(
      { error: "toListId and toIndex are required" },
      { status: 400, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  await connectDB();
  const task = await loadTask(taskId, guard.ctx.user.partnerId);
  if (!task) {
    return NextResponse.json(
      { error: "Card not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  // The destination may be a list on ANOTHER board — that's how a card
  // gets handed from, say, "For Preparation" to "Evidence". The only hard
  // boundary is the tenant: partnerId still has to match, so a card can
  // never cross into another chambers' board.
  const dest = await BoardList.findOne({
    _id: new mongoose.Types.ObjectId(toListId),
    partnerId: task.partnerId,
    isDeleted: false,
  });
  if (!dest) {
    return NextResponse.json(
      { error: "Target list not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  // Snapshot the source list before we mutate the task. We only log
  // cross-list moves; intra-list reorders stay out of the audit feed
  // because they're noise (every drag would fire one).
  const fromListIdBefore = task.listId;
  const fromBoardIdBefore = task.boardId;
  const isCrossListMove =
    String(fromListIdBefore) !== String(dest._id);
  const isCrossBoardMove =
    String(fromBoardIdBefore) !== String(dest.boardId);
  const fromList = isCrossListMove
    ? await BoardList.findOne({ _id: fromListIdBefore })
        .select("title")
        .lean()
    : null;
  // Only needed for the audit line, and only when the board actually
  // changed — one extra read on a rare action.
  const toBoard = isCrossBoardMove
    ? await Board.findOne({ _id: dest.boardId }).select("title").lean()
    : null;

  // Pull all destination tasks (excluding the one being moved) ordered;
  // we'll reinsert this task at toIndex and rewrite sortOrders for the lot.
  const destTasks = await Task.find({
    partnerId: task.partnerId,
    listId: dest._id,
    isDeleted: false,
    _id: { $ne: task._id },
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select("_id sortOrder")
    .lean();

  const orderedIds: mongoose.Types.ObjectId[] = destTasks.map((t) => t._id);
  const insertAt = Math.min(toIndex, orderedIds.length);
  orderedIds.splice(insertAt, 0, task._id);

  task.listId = dest._id;
  task.boardId = dest.boardId;
  task.sortOrder = insertAt;
  await task.save();

  // Bulk write sortOrder for everyone in the destination list
  if (orderedIds.length > 0) {
    await Task.bulkWrite(
      orderedIds.map((id, idx) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sortOrder: idx } },
        },
      }))
    );
  }

  // Cross-list moves are real workflow events and DO fire activity.
  // Intra-list reorders are noise and stay out of the feed.
  if (isCrossListMove) {
    const fromTitle = fromList?.title ?? "another list";
    // Where the card went is only a mystery on the board that LOST it —
    // on the destination it is sitting there in plain sight. So a
    // cross-board move is filed against the source board's feed, and the
    // destination is named in the line. The card's own history is queried
    // by targetId, so it carries the move either way, and the office feed
    // still gets exactly one entry.
    const destLabel = toBoard
      ? `${toBoard.title} · ${dest.title}`
      : dest.title;
    await logWorkflowActivity(guard.ctx, {
      action: "task.moved",
      targetType: "task",
      targetId: String(task._id),
      targetName: task.title,
      boardId: String(isCrossBoardMove ? fromBoardIdBefore : task.boardId),
      message: `moved **${task.title}** from **${fromTitle}** → **${destLabel}**`,
      metadata: {
        fromListId: String(fromListIdBefore),
        fromListTitle: fromTitle,
        toListId: String(dest._id),
        toListTitle: dest.title,
        toIndex: insertAt,
        ...(isCrossBoardMove
          ? {
              fromBoardId: String(fromBoardIdBefore),
              toBoardId: String(dest.boardId),
              toBoardTitle: toBoard?.title ?? "",
            }
          : {}),
      },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      listId: String(task.listId),
      boardId: String(task.boardId),
      sortOrder: task.sortOrder,
    },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}
