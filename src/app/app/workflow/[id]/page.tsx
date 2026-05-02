import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Board";
import { BoardList } from "@/models/BoardList";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { BOARD_COLOR_STYLES } from "@/lib/board-defaults";
import { summarizeChecklists } from "@/lib/workflow-helpers";
import BoardCanvas from "./BoardCanvas";

export const dynamic = "force-dynamic";

export default async function BoardDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  const session = await auth();
  if (!session?.user?.partnerId) notFound();
  const partnerId = new mongoose.Types.ObjectId(session.user.partnerId);
  const boardObjId = new mongoose.Types.ObjectId(id);

  await connectDB();

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

  if (!board) notFound();

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

  const role =
    session.user.userType === "partner_admin" ? "admin" : "junior";

  const styles =
    BOARD_COLOR_STYLES[board.color] ?? BOARD_COLOR_STYLES.copper;

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1500px]">
        <Link
          href="/app/workflow"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors hover:opacity-70"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          <span aria-hidden>&larr;</span> All boards
        </Link>

        {/* Hero strip */}
        <div
          className="fade-up-sm relative mt-5 overflow-hidden rounded-2xl px-9 py-7"
          style={{
            background: `linear-gradient(135deg, ${styles.gradient[0]}, ${styles.gradient[1]})`,
            color: styles.text,
          }}
        >
          <span
            className="absolute top-6 left-6 h-2.5 w-2.5 rounded-full opacity-90"
            style={{ backgroundColor: styles.accent }}
          />
          <h1
            className="text-[36px] font-semibold leading-[1.05] tracking-tight"
            style={{ fontFamily: "var(--font-crimson), Georgia, serif" }}
          >
            {board.title}
          </h1>
          {board.description ? (
            <p
              className="mt-1.5 max-w-[640px] text-[13px] leading-[1.55]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: styles.text,
                opacity: 0.85,
              }}
            >
              {board.description}
            </p>
          ) : null}
        </div>

        <BoardCanvas
          boardId={String(board._id)}
          accent={styles.accent}
          initialLists={lists.map((l) => ({
            id: String(l._id),
            title: l.title,
            sortOrder: l.sortOrder,
          }))}
          initialTasks={tasks.map((t) => ({
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
            hasDescription: Boolean(
              t.description && t.description.trim().length > 0
            ),
            updatedAt: t.updatedAt.toISOString(),
          }))}
          members={Array.from(memberById.values())}
          role={role}
        />
      </div>
    </div>
  );
}
