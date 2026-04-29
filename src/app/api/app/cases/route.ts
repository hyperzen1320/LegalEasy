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

  await connectDB();
  const partnerId = new mongoose.Types.ObjectId(guard.ctx.user.partnerId);

  const docs = await Case.find({ partnerId, isDeleted: false })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  const cases = docs.map((c) => ({
    id: String(c._id),
    caseNo: c.caseNo,
    fileNo: c.fileNo,
    cnr: c.cnr,
    title: c.title,
    clientName: c.clientName,
    clientPhone: c.clientPhone,
    clientWhatsapp: c.clientWhatsapp,
    oppositeParty: c.oppositeParty,
    courtName: c.courtName,
    courtHall: c.courtHall,
    courtPlace: c.courtPlace,
    status: c.status,
    appearingFor: c.appearingFor,
    nextHearingDate: c.nextHearingDate
      ? c.nextHearingDate.toISOString()
      : null,
    lastHearingDate: c.lastHearingDate
      ? c.lastHearingDate.toISOString()
      : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return NextResponse.json(
    { cases },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}

export async function POST(request: Request) {
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

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

  const caseNo = typeof body.caseNo === "string" ? body.caseNo.trim() : "";
  if (!caseNo) {
    return NextResponse.json(
      { error: "Case number is required" },
      { status: 400, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  const str = (k: string): string =>
    typeof body[k] === "string" ? (body[k] as string).trim() : "";

  await connectDB();
  const partnerId = new mongoose.Types.ObjectId(guard.ctx.user.partnerId);

  const nextHearingDate =
    typeof body.nextHearingDate === "string" && body.nextHearingDate.length > 0
      ? new Date(body.nextHearingDate)
      : null;
  const lastHearingDate =
    typeof body.lastHearingDate === "string" && body.lastHearingDate.length > 0
      ? new Date(body.lastHearingDate)
      : null;

  const doc = await Case.create({
    partnerId,
    caseNo,
    fileNo: str("fileNo"),
    cnr: str("cnr"),
    title: str("title"),

    clientName: str("clientName"),
    clientPhone: str("clientPhone"),
    clientWhatsapp: str("clientWhatsapp"),
    clientAddress: str("clientAddress"),
    oppositeParty: str("oppositeParty"),

    appearingFor: str("appearingFor"),
    oppositeAdvocate: str("oppositeAdvocate"),
    iaNumbers: str("iaNumbers"),

    courtName: str("courtName"),
    courtHall: str("courtHall"),
    courtPlace: str("courtPlace"),

    status: str("status") || "Filed",
    nextHearingDate,
    lastHearingDate,

    createdBy: guard.ctx.user.id
      ? new mongoose.Types.ObjectId(guard.ctx.user.id)
      : null,
  });

  return NextResponse.json(
    { ok: true, id: String(doc._id) },
    { status: 201, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}
