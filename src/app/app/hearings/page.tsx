import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Partner } from "@/models/Partner";
import { loadHearingsBucket, type Bucket } from "@/lib/hearings-bucket";
import HearingTrackClient from "./HearingTrackClient";

export const dynamic = "force-dynamic";

export default async function HearingTrackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined;
  const bucket: Bucket =
    tabParam === "tomorrow" || tabParam === "pending" ? tabParam : "today";

  const session = await auth();
  const partnerId = session?.user?.partnerId
    ? new mongoose.Types.ObjectId(session.user.partnerId)
    : null;

  let items: Awaited<ReturnType<typeof loadHearingsBucket>>["items"] = [];
  let counts = { today: 0, tomorrow: 0, pending: 0 };
  let officeName = "";

  if (partnerId) {
    await connectDB();
    const [bucketData, partner] = await Promise.all([
      loadHearingsBucket(partnerId, bucket),
      Partner.findById(partnerId).lean(),
    ]);
    items = bucketData.items;
    counts = bucketData.counts;
    officeName = partner?.branding?.officeName || partner?.name || "";
  }

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1280px]">
        <HearingTrackClient
          bucket={bucket}
          items={items}
          counts={counts}
          officeName={officeName}
        />
      </div>
    </div>
  );
}
