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
  const baseFilter: Record<string, unknown> = {
    partnerId,
    isDeleted: false,
  };

  let filter: Record<string, unknown>;
  let sort: Record<string, 1 | -1>;

  if (bucket === "pending") {
    filter = { ...baseFilter, nextHearingDate: null };
    sort = { lastHearingDate: -1, updatedAt: -1 };
  } else {
    const offset = bucket === "today" ? 0 : 1;
    const now = new Date();
    const start = istDayStart(now, offset);
    const end = istDayStart(now, offset + 1);
    filter = {
      ...baseFilter,
      nextHearingDate: { $gte: start, $lt: end },
    };
    sort = { courtName: 1, caseNo: 1 };
  }

  const now = new Date();
  const todayStart = istDayStart(now, 0);
  const todayEnd = istDayStart(now, 1);
  const tomorrowEnd = istDayStart(now, 2);

  const [docs, todayCount, tomorrowCount, pendingCount] = await Promise.all([
    Case.find(filter).sort(sort).lean(),
    Case.countDocuments({
      ...baseFilter,
      nextHearingDate: { $gte: todayStart, $lt: todayEnd },
    }),
    Case.countDocuments({
      ...baseFilter,
      nextHearingDate: { $gte: todayEnd, $lt: tomorrowEnd },
    }),
    Case.countDocuments({ ...baseFilter, nextHearingDate: null }),
  ]);

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
