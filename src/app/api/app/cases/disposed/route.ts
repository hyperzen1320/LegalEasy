import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Case } from "@/models/Case";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";

// GET /api/app/cases/disposed
// Returns disposed cases for the partner, newest disposal first.
// Tenant-scoped via requirePartner; deleted matters are still excluded.

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(request: Request) {
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

  await connectDB();
  const partnerId = new mongoose.Types.ObjectId(guard.ctx.user.partnerId);

  // Disposed = `disposedAt` is set. Sorted by disposal date desc so the
  // most recently archived matter is the first thing the user sees.
  const docs = await Case.find({
    partnerId,
    isDeleted: false,
    disposedAt: { $ne: null },
  })
    .sort({ disposedAt: -1 })
    .limit(500)
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
    disposedAt: c.disposedAt
      ? c.disposedAt.toISOString()
      : null,
    disposalRemarks: c.disposalRemarks || "",
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
