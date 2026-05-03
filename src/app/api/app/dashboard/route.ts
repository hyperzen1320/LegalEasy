import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Case } from "@/models/Case";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(request: Request) {
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

  const partnerId = new mongoose.Types.ObjectId(guard.ctx.user.partnerId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfToday.getDate() + 1);
  const startOfDayAfter = new Date(startOfToday);
  startOfDayAfter.setDate(startOfToday.getDate() + 2);
  const twoWeeksOut = new Date(startOfToday);
  twoWeeksOut.setDate(startOfToday.getDate() + 14);

  await connectDB();

  // Disposed cases are excluded from every dashboard tile and from the
  // upcoming-hearings cause-list. The Disposed Cases section is the
  // only place they show up.
  const activeFilter = {
    partnerId,
    isDeleted: false,
    disposedAt: null,
  } as const;

  const [todayHearings, tomorrowHearings, pendingDates, caseVault, boardDocs] =
    await Promise.all([
      Case.countDocuments({
        ...activeFilter,
        nextHearingDate: { $gte: startOfToday, $lt: startOfTomorrow },
      }),
      Case.countDocuments({
        ...activeFilter,
        nextHearingDate: { $gte: startOfTomorrow, $lt: startOfDayAfter },
      }),
      Case.countDocuments({
        ...activeFilter,
        $or: [
          { nextHearingDate: null },
          { nextHearingDate: { $lt: startOfToday } },
        ],
      }),
      Case.countDocuments(activeFilter),
      Case.find({
        ...activeFilter,
        nextHearingDate: { $gte: startOfToday, $lt: twoWeeksOut },
      })
        .sort({ nextHearingDate: 1 })
        .limit(5)
        .lean(),
    ]);

  const todaysBoard = boardDocs.map((c) => ({
    id: String(c._id),
    caseNo: c.caseNo,
    status: c.status,
    clientName: c.clientName,
    courtName: c.courtName,
    courtPlace: c.courtPlace,
    nextHearingDate: c.nextHearingDate
      ? c.nextHearingDate.toISOString()
      : null,
  }));

  return NextResponse.json(
    {
      stats: { todayHearings, tomorrowHearings, pendingDates, caseVault },
      todaysBoard,
    },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}
