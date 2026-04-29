import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requirePartner } from "@/lib/partner-auth";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

const VALID_ROLES = ["admin", "advocate", "junior", "clerk", "viewer"] as const;

function serialize(u: {
  _id: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  role: string;
  phone: string;
  designation: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: String(u._id),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    name: `${u.firstName} ${u.lastName}`.trim(),
    userType: u.userType,
    role: u.role || (u.userType === "partner_admin" ? "admin" : "junior"),
    phone: u.phone || "",
    designation: u.designation || "",
    active: u.active,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}

async function loadOne(id: string, partnerId: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return User.findOne({
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

  if (guard.ctx.user.userType !== "partner_admin") {
    return NextResponse.json(
      { error: "Only the office admin can manage users." },
      { status: 403, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

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
      { error: "User not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  const isSelf = String(doc._id) === guard.ctx.user.id;

  // Name
  if (typeof body.firstName === "string" && body.firstName.trim()) {
    doc.firstName = body.firstName.trim();
  }
  if (typeof body.lastName === "string") {
    doc.lastName = body.lastName.trim();
  }
  if (typeof body.designation === "string") {
    doc.designation = body.designation.trim();
  }
  if (typeof body.phone === "string") {
    doc.phone = body.phone.trim();
  }

  // Role change — only for staff (not other admins). Cannot promote anyone
  // to "admin" via this endpoint; that role is reserved for partner_admin.
  if (typeof body.role === "string") {
    const next = body.role.trim().toLowerCase();
    if (
      !VALID_ROLES.includes(next as (typeof VALID_ROLES)[number]) ||
      next === "admin"
    ) {
      return NextResponse.json(
        { error: "Invalid role." },
        {
          status: 400,
          headers: guard.ctx.isMobile ? corsHeaders() : undefined,
        }
      );
    }
    if (doc.userType === "partner_admin") {
      return NextResponse.json(
        { error: "Office admin's role cannot be changed here." },
        {
          status: 400,
          headers: guard.ctx.isMobile ? corsHeaders() : undefined,
        }
      );
    }
    doc.role = next as (typeof VALID_ROLES)[number];
  }

  // Active toggle — cannot deactivate self or another partner_admin
  if (typeof body.active === "boolean") {
    if (isSelf) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account." },
        {
          status: 400,
          headers: guard.ctx.isMobile ? corsHeaders() : undefined,
        }
      );
    }
    if (doc.userType === "partner_admin" && body.active === false) {
      return NextResponse.json(
        { error: "Office admins cannot be deactivated from this screen." },
        {
          status: 400,
          headers: guard.ctx.isMobile ? corsHeaders() : undefined,
        }
      );
    }
    doc.active = body.active;
  }

  // Optional password reset
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        {
          status: 400,
          headers: guard.ctx.isMobile ? corsHeaders() : undefined,
        }
      );
    }
    doc.passwordHash = await bcrypt.hash(body.password, 10);
  }

  await doc.save();

  return NextResponse.json(
    { ok: true, user: serialize(doc) },
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

  if (guard.ctx.user.userType !== "partner_admin") {
    return NextResponse.json(
      { error: "Only the office admin can remove users." },
      { status: 403, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  const doc = await loadOne(id, guard.ctx.user.partnerId);
  if (!doc) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  if (String(doc._id) === guard.ctx.user.id) {
    return NextResponse.json(
      { error: "You cannot remove your own account." },
      { status: 400, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  if (doc.userType === "partner_admin") {
    return NextResponse.json(
      { error: "Office admins cannot be removed from this screen." },
      { status: 400, headers: guard.ctx.isMobile ? corsHeaders() : undefined }
    );
  }

  doc.isDeleted = true;
  doc.active = false;
  await doc.save();

  return NextResponse.json(
    { ok: true },
    { headers: guard.ctx.isMobile ? corsHeaders() : undefined }
  );
}
