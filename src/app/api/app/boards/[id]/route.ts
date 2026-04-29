import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Board";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

const VALID_COLORS = [
  "forest",
  "copper",
  "sea",
  "terracotta",
  "ochre",
  "plum",
  "ink",
] as const;

async function loadOne(id: string, partnerId: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return Board.findOne({
    _id: new mongoose.Types.ObjectId(id),
    partnerId: new mongoose.Types.ObjectId(partnerId),
    isDeleted: false,
  });
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

  const doc = await loadOne(id, guard.ctx.user.partnerId);
  if (!doc) {
    return NextResponse.json(
      { error: "Board not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  if (typeof body.title === "string" && body.title.trim()) {
    doc.title = body.title.trim();
  }
  if (typeof body.description === "string") {
    doc.description = body.description.trim();
  }
  if (typeof body.color === "string") {
    const c = body.color.trim().toLowerCase();
    if (VALID_COLORS.includes(c as (typeof VALID_COLORS)[number])) {
      doc.color = c as (typeof VALID_COLORS)[number];
    }
  }

  await doc.save();

  return NextResponse.json(
    {
      ok: true,
      board: {
        id: String(doc._id),
        title: doc.title,
        description: doc.description,
        color: doc.color,
        isSeeded: doc.isSeeded,
        cardCount: 0,
        updatedAt: doc.updatedAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
      },
    },
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

  const doc = await loadOne(id, guard.ctx.user.partnerId);
  if (!doc) {
    return NextResponse.json(
      { error: "Board not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  doc.isDeleted = true;
  await doc.save();

  return NextResponse.json(
    { ok: true },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}
