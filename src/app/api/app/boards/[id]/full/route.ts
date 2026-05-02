import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Board";
import { BoardList } from "@/models/BoardList";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";
import { summarizeChecklists } from "@/lib/workflow-helpers";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid board id" },
      { status: 400, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  await connectDB();
  const partnerId = new mongoose.Types.ObjectId(guard.ctx.user.partnerId);
  const boardObjId = new mongoose.Types.ObjectId(id);

  const [board, lists, tasks, members] = await Promise.all([
    Board.findOne({
      _id: boardObjId,
      partnerId,
      isDeleted: false,
    }).lean(),
    BoardList.find({
      partnerId,
      boardId: boardObjId,
      isDeleted: false,
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean(),
    Task.find({
      partnerId,
      boardId: boardObjId,
      isDeleted: false,
    })
      .sort({ listId: 1, sortOrder: 1, createdAt: 1 })
      .lean(),
    User.find({ partnerId, isDeleted: false, active: true })
      .select("firstName lastName role userType")
      .sort({ firstName: 1 })
      .lean(),
  ]);

  if (!board) {
    return NextResponse.json(
      { error: "Board not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  const memberById = new Map<
    string,
    { id: string; name: string; role: string }
  >();
  for (const m of members) {
    memberById.set(String(m._id), {
      id: String(m._id),
      name: `${m.firstName} ${m.lastName}`.trim(),
      role: m.role || (m.userType === "partner_admin" ? "admin" : "junior"),
    });
  }

  const serializedTasks = tasks.map((t) => ({
    id: String(t._id),
    listId: String(t.listId),
    title: t.title,
    description: t.description || "",
    sortOrder: t.sortOrder,
    assignee: t.assignedToUserId
      ? memberById.get(String(t.assignedToUserId)) || null
      : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    priority: t.priority,
    checklistSummary: summarizeChecklists(t.checklists || []),
    hasDescription: Boolean(t.description && t.description.trim().length > 0),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return NextResponse.json(
    {
      board: {
        id: String(board._id),
        title: board.title,
        description: board.description,
        color: board.color,
      },
      lists: lists.map((l) => ({
        id: String(l._id),
        title: l.title,
        sortOrder: l.sortOrder,
      })),
      tasks: serializedTasks,
      members: Array.from(memberById.values()),
      role: guard.ctx.user.role,
      currentUserId: guard.ctx.user.id,
    },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}
