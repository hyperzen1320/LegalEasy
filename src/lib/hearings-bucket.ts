import mongoose from "mongoose";
import { Case } from "@/models/Case";
import { Client } from "@/models/Client";
import { istDayStart } from "@/lib/ist-day";

export type Bucket = "today" | "tomorrow" | "pending";

export type HearingRow = {
  id: string;
  caseNo: string;
  fileNo: string;
  cnr: string;
  clientName: string;
  clientPhone: string;
  clientWhatsapp: string;
  oppositeParty: string;
  courtName: string;
  courtPlace: string;
  status: string;
  nextHearingDate: string | null;
  lastHearingDate: string | null;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loadHearingsBucket(
  partnerId: mongoose.Types.ObjectId,
  bucket: Bucket
): Promise<{
  items: HearingRow[];
  counts: { today: number; tomorrow: number; pending: number };
}> {
  // Disposed cases never appear in any hearing bucket (today/tomorrow/
  // pending) — they're archived and live in /app/disposed-cases.
  const baseFilter: Record<string, unknown> = {
    partnerId,
    isDeleted: false,
    disposedAt: null,
  };

  // IST day boundaries computed once and reused for both the filter and
  // the per-bucket counts. Each call is server-side dynamic, so the page
  // always uses "now" as of the request — no stale-time issues.
  const now = new Date();
  const todayStart = istDayStart(now, 0);
  const todayEnd = istDayStart(now, 1);
  const tomorrowEnd = istDayStart(now, 2);

  // The pending bucket gathers two kinds of matters:
  //   • Cases with no next hearing date at all (null).
  //   • Cases whose next hearing date has passed today — `< todayStart`
  //     in IST. The advocate forgot to re-list it after the last hearing,
  //     so it needs attention.
  // We run them as two separate queries so we can sort each meaningfully
  // and concatenate (overdue ascending = oldest first, then undated):
  // mixing them into one query with one sort would either bury overdues
  // at the bottom or put nulls in the middle.
  //
  // The shared count uses an explicit `$ne: null` in the overdue branch
  // so we don't accidentally double-count or rely on cross-type
  // comparison behaviour.
  const overdueFilter: Record<string, unknown> = {
    ...baseFilter,
    nextHearingDate: { $ne: null, $lt: todayStart },
  };
  const undatedFilter: Record<string, unknown> = {
    ...baseFilter,
    nextHearingDate: null,
  };

  let docsPromise: Promise<unknown[]>;
  if (bucket === "pending") {
    docsPromise = Promise.all([
      Case.find(overdueFilter).sort({ nextHearingDate: 1 }).lean(),
      Case.find(undatedFilter)
        .sort({ lastHearingDate: -1, updatedAt: -1 })
        .lean(),
    ]).then(([overdue, undated]) => [...overdue, ...undated]);
  } else {
    const offset = bucket === "today" ? 0 : 1;
    const start = istDayStart(now, offset);
    const end = istDayStart(now, offset + 1);
    docsPromise = Case.find({
      ...baseFilter,
      nextHearingDate: { $gte: start, $lt: end },
    })
      .sort({ courtName: 1, caseNo: 1 })
      .lean() as Promise<unknown[]>;
  }

  const [docsUnknown, todayCount, tomorrowCount, pendingCount] =
    await Promise.all([
      docsPromise,
      Case.countDocuments({
        ...baseFilter,
        nextHearingDate: { $gte: todayStart, $lt: todayEnd },
      }),
      Case.countDocuments({
        ...baseFilter,
        nextHearingDate: { $gte: todayEnd, $lt: tomorrowEnd },
      }),
      Case.countDocuments({
        ...baseFilter,
        $or: [
          { nextHearingDate: null },
          { nextHearingDate: { $ne: null, $lt: todayStart } },
        ],
      }),
    ]);

  const docs = docsUnknown as Array<{
    _id: mongoose.Types.ObjectId;
    caseNo: string;
    fileNo: string;
    cnr: string;
    clientId: mongoose.Types.ObjectId | null;
    clientName: string;
    clientPhone: string;
    clientWhatsapp: string;
    oppositeParty: string;
    courtName: string;
    courtPlace: string;
    status: string;
    nextHearingDate: Date | null;
    lastHearingDate: Date | null;
  }>;

  // Client-contact fallback: when a case doesn't have phone/WhatsApp directly,
  // use the linked Client's contact details.
  const clientIds = Array.from(
    new Set(
      docs
        .map((d) => (d.clientId ? String(d.clientId) : null))
        .filter((x): x is string => Boolean(x))
    )
  );
  const clientNames = Array.from(
    new Set(
      docs.map((d) => (d.clientName || "").trim().toLowerCase()).filter(Boolean)
    )
  );

  const orClauses: Record<string, unknown>[] = [];
  if (clientIds.length) {
    orClauses.push({
      _id: {
        $in: clientIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    });
  }
  if (clientNames.length) {
    orClauses.push({
      name: {
        $in: clientNames.map(
          (n) => new RegExp(`^${escapeRegex(n)}$`, "i")
        ),
      },
    });
  }

  const clientLookup =
    orClauses.length > 0
      ? await Client.find({
          partnerId,
          isDeleted: false,
          $or: orClauses,
        })
          .select("name phone whatsapp")
          .lean()
      : [];

  const byId = new Map<string, { phone: string; whatsapp: string }>();
  const byName = new Map<string, { phone: string; whatsapp: string }>();
  for (const cl of clientLookup) {
    const entry = { phone: cl.phone || "", whatsapp: cl.whatsapp || "" };
    byId.set(String(cl._id), entry);
    if (cl.name) byName.set(cl.name.toLowerCase(), entry);
  }

  const items: HearingRow[] = docs.map((c) => {
    const fromId = c.clientId ? byId.get(String(c.clientId)) : undefined;
    const fromName = byName.get((c.clientName || "").toLowerCase());
    const fb = fromId || fromName || { phone: "", whatsapp: "" };
    return {
      id: String(c._id),
      caseNo: c.caseNo,
      fileNo: c.fileNo,
      cnr: c.cnr,
      clientName: c.clientName,
      clientPhone: c.clientPhone || fb.phone,
      clientWhatsapp: c.clientWhatsapp || fb.whatsapp,
      oppositeParty: c.oppositeParty,
      courtName: c.courtName,
      courtPlace: c.courtPlace,
      status: c.status,
      nextHearingDate: c.nextHearingDate
        ? c.nextHearingDate.toISOString()
        : null,
      lastHearingDate: c.lastHearingDate
        ? c.lastHearingDate.toISOString()
        : null,
    };
  });

  return {
    items,
    counts: {
      today: todayCount,
      tomorrow: tomorrowCount,
      pending: pendingCount,
    },
  };
}
