import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Case } from "@/models/Case";
import { Partner } from "@/models/Partner";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";
import { logWorkflowActivity } from "@/lib/activity";
import { canDirectDeleteGeneric } from "@/lib/delete-eligibility";
import { DeleteRequest } from "@/models/DeleteRequest";

const VALID_STATUSES = [
  "Filed",
  "Notice",
  "Pleadings",
  "Issues",
  "Evidence",
  "Arguments",
  "Reserved",
  "Judgment",
  "Disposed",
];

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

async function loadCaseForPartner(
  id: string,
  partnerId: string
) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const partnerObj = new mongoose.Types.ObjectId(partnerId);
  const doc = await Case.findOne({
    _id: new mongoose.Types.ObjectId(id),
    partnerId: partnerObj,
    isDeleted: false,
  });
  return doc;
}

function serialize(c: NonNullable<Awaited<ReturnType<typeof loadCaseForPartner>>>) {
  return {
    id: String(c._id),
    caseNo: c.caseNo,
    fileNo: c.fileNo,
    cnr: c.cnr,
    title: c.title,
    clientName: c.clientName,
    clientPhone: c.clientPhone,
    clientWhatsapp: c.clientWhatsapp,
    clientAddress: c.clientAddress,
    oppositeParty: c.oppositeParty,
    appearingFor: c.appearingFor,
    oppositeAdvocate: c.oppositeAdvocate,
    iaNumbers: c.iaNumbers,
    courtName: c.courtName,
    courtHall: c.courtHall,
    courtPlace: c.courtPlace,
    status: c.status,
    nextHearingDate: c.nextHearingDate ? c.nextHearingDate.toISOString() : null,
    lastHearingDate: c.lastHearingDate ? c.lastHearingDate.toISOString() : null,
    hearings: c.hearings.map((h) => ({
      date: h.date.toISOString(),
      status: h.status,
      outcome: h.outcome,
      nextDate: h.nextDate ? h.nextDate.toISOString() : null,
    })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

  const doc = await loadCaseForPartner(id, guard.ctx.user.partnerId);
  if (!doc) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  const partner = await Partner.findById(
    new mongoose.Types.ObjectId(guard.ctx.user.partnerId)
  ).lean();
  const officeName =
    partner?.branding?.officeName || partner?.name || "";

  return NextResponse.json(
    { case: serialize(doc), officeName },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

  const doc = await loadCaseForPartner(id, guard.ctx.user.partnerId);
  if (!doc) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  const before = {
    caseNo: doc.caseNo,
    status: doc.status,
    nextHearingDate: doc.nextHearingDate
      ? doc.nextHearingDate.toISOString()
      : null,
    fieldsSnapshot: {
      fileNo: doc.fileNo,
      cnr: doc.cnr,
      title: doc.title,
      clientName: doc.clientName,
      clientPhone: doc.clientPhone,
      clientWhatsapp: doc.clientWhatsapp,
      clientAddress: doc.clientAddress,
      oppositeParty: doc.oppositeParty,
      appearingFor: doc.appearingFor,
      oppositeAdvocate: doc.oppositeAdvocate,
      iaNumbers: doc.iaNumbers,
      courtName: doc.courtName,
      courtHall: doc.courtHall,
      courtPlace: doc.courtPlace,
    } as Record<string, string>,
  };

  const stringFields = [
    "caseNo",
    "fileNo",
    "cnr",
    "title",
    "clientName",
    "clientPhone",
    "clientWhatsapp",
    "clientAddress",
    "oppositeParty",
    "appearingFor",
    "oppositeAdvocate",
    "iaNumbers",
    "courtName",
    "courtHall",
    "courtPlace",
  ] as const;

  for (const f of stringFields) {
    if (typeof body[f] === "string") {
      doc[f] = (body[f] as string).trim();
    }
  }

  // Status — validate against known list but allow custom strings as well
  if (typeof body.status === "string" && body.status.trim()) {
    doc.status = body.status.trim();
  }

  // Update next hearing — when changed, push the OLD nextHearingDate to
  // the hearings history and set lastHearingDate.
  if (typeof body.nextHearingDate === "string" || body.nextHearingDate === null) {
    const newNext =
      body.nextHearingDate && typeof body.nextHearingDate === "string"
        ? new Date(body.nextHearingDate)
        : null;
    const oldNext = doc.nextHearingDate;
    if (
      (oldNext && (!newNext || newNext.getTime() !== oldNext.getTime())) ||
      (!oldNext && newNext)
    ) {
      // archive previous hearing if there was one
      if (oldNext) {
        doc.hearings.push({
          date: oldNext,
          status: doc.status,
          outcome: "",
          nextDate: newNext,
        });
        doc.lastHearingDate = oldNext;
      }
      doc.nextHearingDate = newNext;
    }
  }

  await doc.save();

  // Activity logs — emit specific events for the noteworthy bits
  const changedFields: string[] = [];
  for (const f of stringFields) {
    if ((doc[f] || "") !== (before.fieldsSnapshot[f] || "")) {
      changedFields.push(f);
    }
  }
  if (changedFields.length > 0) {
    await logWorkflowActivity(guard.ctx, {
      action: "case.updated",
      targetType: "case",
      targetId: String(doc._id),
      targetName: doc.caseNo,
      message: `updated case **${doc.caseNo}** (${changedFields.join(", ")})`,
      metadata: { fields: changedFields },
    });
  }
  if (before.status !== doc.status) {
    await logWorkflowActivity(guard.ctx, {
      action: "case.status_changed",
      targetType: "case",
      targetId: String(doc._id),
      targetName: doc.caseNo,
      message: `set status of **${doc.caseNo}** to **${doc.status}**`,
      metadata: { from: before.status, to: doc.status },
    });
  }
  const newNextIso = doc.nextHearingDate
    ? doc.nextHearingDate.toISOString()
    : null;
  if (before.nextHearingDate !== newNextIso) {
    await logWorkflowActivity(guard.ctx, {
      action: "case.hearing_updated",
      targetType: "case",
      targetId: String(doc._id),
      targetName: doc.caseNo,
      message: newNextIso
        ? `set next hearing for **${doc.caseNo}** to ${doc.nextHearingDate!.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
        : `cleared the next hearing on **${doc.caseNo}**`,
      metadata: { from: before.nextHearingDate, to: newNextIso },
    });
  }

  return NextResponse.json(
    { ok: true, case: serialize(doc) },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

  const doc = await loadCaseForPartner(id, guard.ctx.user.partnerId);
  if (!doc) {
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  // Cases are top-level — admin always; non-admin must raise a delete request.
  const eligibility = canDirectDeleteGeneric({
    isAdmin: guard.ctx.user.role === "admin",
    userId: guard.ctx.user.id,
  });
  if (!eligibility.ok) {
    return NextResponse.json(
      {
        error: eligibility.reason,
        code: "delete_request_required",
        targetType: "case",
        targetId: String(doc._id),
        targetName: doc.caseNo,
      },
      {
        status: 403,
        headers: guard.ctx.isMobile ? corsHeaders() : undefined,
      }
    );
  }

  await DeleteRequest.updateMany(
    {
      partnerId: doc.partnerId,
      targetType: "case",
      targetId: doc._id,
      status: "pending",
    },
    { $set: { status: "obsolete", reviewerNote: "Target deleted directly." } }
  );

  doc.isDeleted = true;
  await doc.save();

  await logWorkflowActivity(guard.ctx, {
    action: "case.deleted",
    targetType: "case",
    targetId: String(doc._id),
    targetName: doc.caseNo,
    message: `deleted case **${doc.caseNo}**`,
    metadata: { caseNo: doc.caseNo, fileNo: doc.fileNo, cnr: doc.cnr },
  });

  return NextResponse.json(
    { ok: true },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}

// Export valid statuses for clients that want them (the form uses its own list)
export { VALID_STATUSES };
