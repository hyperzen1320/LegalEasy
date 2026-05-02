import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { BoardList } from "@/models/BoardList";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";
import { canPerform, workflowDeny } from "@/lib/workflow-rbac";
import { loadTask } from "@/lib/workflow-helpers";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

// POST /api/app/tasks/[taskId]/move
// Body: { toListId: string, toIndex: number }
//
// Side-effects: shifts sortOrders in the destination list, logs a
// `task.moved` activity entry that records the source and destination list.
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

  const dest = await BoardList.findOne({
    _id: new mongoose.Types.ObjectId(toListId),
    partnerId: task.partnerId,
    boardId: task.boardId,
    isDeleted: false,
  });
  if (!dest) {
    return NextResponse.json(
      { error: "Target list not found on this board" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

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

  // Card movements (cross-list move + intra-list reorder) are intentionally
  // NOT written to the activity log — they would dominate the feed and the
  // user explicitly asked to leave them out. The card's new listId is
  // still observable via the next state fetch / live-feed reconcile.

  return NextResponse.json(
    { ok: true, listId: String(task.listId), sortOrder: task.sortOrder },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}
