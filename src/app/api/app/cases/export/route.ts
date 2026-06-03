import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Case } from "@/models/Case";
import { Partner } from "@/models/Partner";
import { User } from "@/models/User";
import { Court } from "@/models/Court";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";
import {
  buildCaseFilter,
  readCaseFilterParams,
  type CaseFilterInput,
} from "@/lib/case-filter";
import {
  resolveColumns,
  type CaseExportInput,
  type CaseExportRow,
  companyName,
} from "@/lib/case-export/types";
import { generateXlsx } from "@/lib/case-export/xlsx";
import { generateDocx } from "@/lib/case-export/docx";
import { generatePdf } from "@/lib/case-export/pdf";

// The PDF (pdfkit) generator loads AFM font files at runtime via
// `fs.readFileSync` — that requires the full Node runtime, NOT the edge
// runtime that some Next deployments default to. Be explicit so the
// route is never silently rebuilt to edge.
export const runtime = "nodejs";
// And don't try to pre-render — every export is a fresh server call
// with auth, filters and partner branding.
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

// Hard cap on rows exported in a single request. 5000 is a comfortable
// margin above what a real chambers will ever export at once; it also
// keeps any single export under ~5s on the existing libraries.
const MAX_EXPORT_ROWS = 5000;

type ExportBody = {
  format?: string;
  filters?: Record<string, unknown>;
  columns?: unknown;
};

const FORMAT_META: Record<
  "xlsx" | "docx" | "pdf",
  { mime: string; ext: string }
> = {
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
  },
  pdf: { mime: "application/pdf", ext: "pdf" },
};

export async function POST(request: Request) {
  const guard = await requirePartner(request);
  if ("error" in guard) return guard.error;

  // Exporting the rolls is office-admin only. The UI hides the menu for
  // everyone else; this is the server half so a crafted POST can't pull
  // the whole case register out as a file. (partner_admin is coerced to
  // role "admin", so the role check covers it.)
  if (guard.ctx.user.role !== "admin") {
    return NextResponse.json(
      { error: "Only the office admin can export the case rolls." },
      {
        status: 403,
        headers: guard.ctx.isMobile ? corsHeaders() : undefined,
      }
    );
  }

  const body = (await request.json().catch(() => ({}))) as ExportBody;
  const format = body.format;
  if (format !== "xlsx" && format !== "docx" && format !== "pdf") {
    return NextResponse.json(
      { error: "Unsupported format. Pick xlsx, docx, or pdf." },
      {
        status: 400,
        headers: guard.ctx.isMobile ? corsHeaders() : undefined,
      }
    );
  }

  // Filter source can be either query string-style values in `filters`
  // (the table sends them that way for symmetry with GET) or top-level
  // keys. readCaseFilterParams normalises both.
  const filterSource =
    body.filters && typeof body.filters === "object"
      ? body.filters
      : (body as unknown as Record<string, unknown>);
  const columnKeys = Array.isArray(body.columns)
    ? body.columns.filter((c): c is string => typeof c === "string")
    : null;

  await connectDB();
  const partnerObjId = new mongoose.Types.ObjectId(guard.ctx.user.partnerId);
  const filterInput: CaseFilterInput = {
    partnerId: partnerObjId,
    ...readCaseFilterParams(filterSource),
  };
  const filter = buildCaseFilter(filterInput);

  const [docs, partner] = await Promise.all([
    Case.find(filter)
      .sort({ nextHearingDate: 1, updatedAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean(),
    Partner.findById(partnerObjId).lean(),
  ]);

  // Advocate name lookup (createdBy -> User) for the rows we're
  // exporting; one round-trip total.
  const creatorIds = Array.from(
    new Set(
      docs
        .map((d) => (d.createdBy ? String(d.createdBy) : null))
        .filter((x): x is string => Boolean(x))
    )
  );
  const advocates: Array<{
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
  }> = creatorIds.length > 0
    ? await User.find({
        _id: {
          $in: creatorIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        partnerId: partnerObjId,
      })
        .select("firstName lastName email")
        .lean()
    : [];
  const advocateMap = new Map<string, string>();
  for (const u of advocates) {
    const name =
      `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
    advocateMap.set(String(u._id), name);
  }

  const cases: CaseExportRow[] = docs.map((c) => ({
    id: String(c._id),
    caseNo: c.caseNo || "",
    fileNo: c.fileNo || "",
    iaNumbers: c.iaNumbers || "",
    cnr: c.cnr || "",
    clientName: c.clientName || "",
    clientPhone: c.clientPhone || "",
    clientWhatsapp: c.clientWhatsapp || "",
    appearingFor: c.appearingFor || "",
    oppositeParty: c.oppositeParty || "",
    oppositeAdvocate: c.oppositeAdvocate || "",
    courtName: c.courtName || "",
    courtNumber: c.courtNumber || "",
    courtHall: c.courtHall || "",
    courtPlace: c.courtPlace || "",
    status: c.status || "",
    advocateName: c.createdBy
      ? advocateMap.get(String(c.createdBy)) || ""
      : "",
    nextHearingDate: c.nextHearingDate
      ? c.nextHearingDate.toISOString()
      : null,
    lastHearingDate: c.lastHearingDate
      ? c.lastHearingDate.toISOString()
      : null,
  }));

  const columns = resolveColumns(columnKeys);
  const filterSummary = await buildFilterSummary(filterInput, partnerObjId);

  const exportInput: CaseExportInput = {
    cases,
    partner: {
      name: partner?.name || "",
      officeName: partner?.branding?.officeName || "",
      primaryContactName: partner?.primaryContactName || "",
      city: partner?.city || "",
      state: partner?.state || "",
      phone: partner?.phone || "",
    },
    columns,
    filters: filterSummary,
    generatedAt: new Date(),
  };

  let buffer: Buffer;
  try {
    if (format === "xlsx") buffer = await generateXlsx(exportInput);
    else if (format === "docx") buffer = await generateDocx(exportInput);
    else buffer = await generatePdf(exportInput);
  } catch (err) {
    // Log the actual error with context so a 500 in production isn't
    // an opaque "Couldn't generate" — Vercel function logs will carry
    // the stack and the format that broke.
    console.error(
      `[case-export] ${format} generator failed for partner ${guard.ctx.user.partnerId}:`,
      err
    );
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Couldn't generate the ${format.toUpperCase()} export. ${detail}`,
      },
      {
        status: 500,
        headers: guard.ctx.isMobile ? corsHeaders() : undefined,
      }
    );
  }

  const meta = FORMAT_META[format];
  const dateSlug = exportInput.generatedAt
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const safeCompany = slugify(companyName(exportInput.partner));
  const filename = `${safeCompany}-case-report-${dateSlug}.${meta.ext}`;

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": meta.mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
      ...(guard.ctx.isMobile ? corsHeaders() : {}),
    },
  });
}

// Builds the "Filter: …" summary lines that ride under the report
// title. The Court line resolves a courtId/place into the friendly
// label the user actually picked from the filter dropdown.
async function buildFilterSummary(
  input: CaseFilterInput,
  partnerId: mongoose.Types.ObjectId
): Promise<{ lines: string[] }> {
  const lines: string[] = [];

  if (input.courtId && mongoose.isValidObjectId(input.courtId)) {
    const court = await Court.findOne({
      _id: new mongoose.Types.ObjectId(input.courtId),
      partnerId,
    })
      .select("name number place")
      .lean();
    if (court) {
      const meta = [court.number, court.place].filter(Boolean).join(" · ");
      lines.push(`Court — ${court.name}${meta ? ` (${meta})` : ""}`);
    }
  } else if (input.courtPlace && input.courtPlace.trim()) {
    lines.push(`Court place — ${input.courtPlace.trim()}`);
  }

  if (input.advocateId && mongoose.isValidObjectId(input.advocateId)) {
    const advocate = await User.findOne({
      _id: new mongoose.Types.ObjectId(input.advocateId),
      partnerId,
    })
      .select("firstName lastName email")
      .lean();
    if (advocate) {
      const name =
        `${advocate.firstName || ""} ${advocate.lastName || ""}`.trim() ||
        advocate.email;
      lines.push(`Advocate — ${name}`);
    }
  }

  if (input.fromDate || input.toDate) {
    const from = input.fromDate ? formatShort(input.fromDate) : "—";
    const to = input.toDate ? formatShort(input.toDate) : "—";
    lines.push(`Next hearing date — ${from} → ${to}`);
  }

  if (input.search && input.search.trim()) {
    lines.push(`Search — "${input.search.trim()}"`);
  }

  return { lines };
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "case-report"
  );
}
