import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { Partner } from "@/models/Partner";
import { Board } from "@/models/Board";
import { User } from "@/models/User";
import ActivityClient, {
  type ActivityRow,
  type ActivityActor,
  type ActivityBoardOption,
} from "./ActivityClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.partnerId) {
    return null;
  }
  const partnerId = new mongoose.Types.ObjectId(session.user.partnerId);
  const isAdmin = session.user.userType === "partner_admin";

  await connectDB();

  // Lazy auto-prune on landing
  const partner = await Partner.findById(partnerId).select("settings").lean();
  const days = partner?.settings?.activityRetentionDays ?? null;
  if (days && Number.isFinite(days) && days >= 1) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await Activity.deleteMany({ partnerId, createdAt: { $lt: cutoff } });
  }

  const [docs, boards, users] = await Promise.all([
    Activity.find({ partnerId })
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1)
      .lean(),
    Board.find({ partnerId, isDeleted: false })
      .select("title color")
      .sort({ title: 1 })
      .lean(),
    User.find({ partnerId, isDeleted: false })
      .select("firstName lastName")
      .sort({ firstName: 1 })
      .lean(),
  ]);

  const hasMore = docs.length > PAGE_SIZE;
  const trimmed = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

  const activity: ActivityRow[] = trimmed.map((a) => ({
    id: String(a._id),
    actorUserId: a.actorUserId ? String(a.actorUserId) : null,
    actorName: a.actorName,
    action: a.action,
    targetType: a.targetType,
    targetId: a.targetId ? String(a.targetId) : null,
    targetName: a.targetName,
    message: a.message,
    metadata: (a.metadata as Record<string, unknown>) ?? {},
    boardId: a.boardId ? String(a.boardId) : null,
    createdAt: a.createdAt.toISOString(),
  }));

  const actors: ActivityActor[] = users.map((u) => ({
    id: String(u._id),
    name: `${u.firstName} ${u.lastName}`.trim(),
  }));

  const boardOptions: ActivityBoardOption[] = boards.map((b) => ({
    id: String(b._id),
    title: b.title,
    color: b.color as string,
  }));

  const nextCursor = hasMore
    ? trimmed[trimmed.length - 1].createdAt.toISOString()
    : null;

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1100px]">
        <ActivityClient
          initialActivity={activity}
          initialNextCursor={nextCursor}
          actors={actors}
          boards={boardOptions}
          isAdmin={isAdmin}
          retentionDays={days ?? null}
        />
      </div>
    </div>
  );
}
