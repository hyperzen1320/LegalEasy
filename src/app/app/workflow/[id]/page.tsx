import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Board";
import { BOARD_COLOR_STYLES } from "@/lib/board-defaults";

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

  await connectDB();
  const board = await Board.findOne({
    _id: new mongoose.Types.ObjectId(id),
    partnerId: new mongoose.Types.ObjectId(session.user.partnerId),
    isDeleted: false,
  }).lean();

  if (!board) notFound();

  const styles = BOARD_COLOR_STYLES[board.color] ?? BOARD_COLOR_STYLES.copper;

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1280px]">
        <Link
          href="/app/workflow"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          <span aria-hidden>&larr;</span> All boards
        </Link>

        <div
          className="fade-up-sm relative mt-5 overflow-hidden rounded-2xl px-9 py-9"
          style={{
            background: `linear-gradient(135deg, ${styles.gradient[0]}, ${styles.gradient[1]})`,
            color: styles.text,
            minHeight: 200,
          }}
        >
          <span
            className="absolute top-6 left-6 h-2.5 w-2.5 rounded-full opacity-90"
            style={{ backgroundColor: styles.accent }}
          />
          <h1
            className="text-[44px] font-semibold leading-[1.05] tracking-tight"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
            }}
          >
            {board.title}
          </h1>
          {board.description ? (
            <p
              className="mt-3 max-w-[640px] text-[14px] leading-[1.55]"
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

        <div
          className="mt-6 rounded-xl px-6 py-12 text-center"
          style={{
            backgroundColor: "var(--color-app-paper)",
            border: "1px dashed var(--color-app-edge)",
          }}
        >
          <h3
            className="text-[24px] font-semibold tracking-tight"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-ink)",
            }}
          >
            Kanban columns coming next.
          </h3>
          <p
            className="mx-auto mt-2 max-w-md text-[13px] leading-7"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            This board is created and saved. Lists, task cards, drag-and-drop
            and assignment land in the next iteration.
          </p>
        </div>
      </div>
    </div>
  );
}
