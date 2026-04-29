import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Partner } from "@/models/Partner";
import { User } from "@/models/User";
import { uniquePartnerSlug } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/admin-auth";
import { corsHeaders } from "@/lib/cors";

type Plan = "trial" | "solo" | "office" | "chambers";

type CreatePartnerInput = {
  name: string;
  primaryEmail: string;
  primaryContactName: string;
  phone: string;
  city?: string;
  state?: string;
  plan: Plan;
  trialDays: number;
  password: string;
};

function validate(body: unknown): CreatePartnerInput | { error: string } {
  if (!body || typeof body !== "object")
    return { error: "Invalid request body" };
  const b = body as Record<string, unknown>;
  const required = (k: string) =>
    typeof b[k] === "string" && (b[k] as string).trim().length > 0;

  if (!required("name")) return { error: "Chambers name is required" };
  if (!required("primaryEmail")) return { error: "Login email is required" };
  if (!required("primaryContactName"))
    return { error: "Contact name is required" };
  if (!required("phone")) return { error: "Phone is required" };
  if (!required("password")) return { error: "Password is required" };

  const password = b.password as string;
  if (password.length < 6)
    return { error: "Password must be at least 6 characters" };

  const plan = b.plan as string;
  if (!["trial", "solo", "office", "chambers"].includes(plan))
    return { error: "Invalid plan" };

  const trialDays = Number(b.trialDays ?? 0);
  if (plan === "trial") {
    if (!Number.isFinite(trialDays) || trialDays < 1 || trialDays > 90)
      return { error: "Trial days must be between 1 and 90" };
  }

  const primaryEmail = (b.primaryEmail as string).toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(primaryEmail))
    return { error: "Login email looks invalid" };

  return {
    name: (b.name as string).trim(),
    primaryEmail,
    primaryContactName: (b.primaryContactName as string).trim(),
    phone: (b.phone as string).trim(),
    city: typeof b.city === "string" ? (b.city as string).trim() : "",
    state: typeof b.state === "string" ? (b.state as string).trim() : "",
    plan: plan as Plan,
    trialDays,
    password,
  };
}

const SEAT_LIMITS: Record<Plan, number> = {
  trial: 5,
  solo: 1,
  office: 10,
  chambers: 999999,
};
const MATTER_LIMITS: Record<Plan, number> = {
  trial: 50,
  solo: 100,
  office: 1000,
  chambers: 999999,
};
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  await connectDB();
  const docs = await Partner.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  const partners = docs.map((p) => ({
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    primaryEmail: p.primaryEmail,
    primaryContactName: p.primaryContactName,
    phone: p.phone,
    city: p.city,
    state: p.state,
    plan: p.plan,
    status: p.subscription.status,
    startDate: p.subscription.startDate.toISOString(),
    endDate: p.subscription.endDate.toISOString(),
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json({ partners }, { headers: corsHeaders() });
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = validate(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: corsHeaders() }
    );
  }

  await connectDB();
  const [existingUser, existingPartner] = await Promise.all([
    User.findOne({ email: parsed.primaryEmail }),
    Partner.findOne({ primaryEmail: parsed.primaryEmail }),
  ]);
  if (existingUser || existingPartner) {
    return NextResponse.json(
      {
        error:
          "This email is already in use. Each email can belong to only one chambers.",
      },
      { status: 409, headers: corsHeaders() }
    );
  }

  const slug = await uniquePartnerSlug(parsed.name);
  const now = new Date();
  const isTrial = parsed.plan === "trial";
  const subscription = {
    status: (isTrial ? "trial" : "active") as "trial" | "active",
    startDate: now,
    endDate: new Date(
      now.getTime() +
        (isTrial ? parsed.trialDays * 24 * 60 * 60 * 1000 : ONE_YEAR_MS)
    ),
    seatLimit: SEAT_LIMITS[parsed.plan],
    matterLimit: MATTER_LIMITS[parsed.plan],
  };

  const partner = await Partner.create({
    name: parsed.name,
    slug,
    primaryEmail: parsed.primaryEmail,
    primaryContactName: parsed.primaryContactName,
    phone: parsed.phone,
    city: parsed.city ?? "",
    state: parsed.state ?? "",
    plan: parsed.plan,
    subscription,
  });

  const passwordHash = await bcrypt.hash(parsed.password, 12);
  const [firstName, ...rest] = parsed.primaryContactName.split(" ");
  const lastName = rest.join(" ") || "—";

  try {
    await User.create({
      email: parsed.primaryEmail,
      passwordHash,
      firstName,
      lastName,
      userType: "partner_admin",
      partnerId: partner._id,
      active: true,
    });
  } catch (err) {
    await Partner.deleteOne({ _id: partner._id });
    return NextResponse.json(
      {
        error:
          "Could not create the partner-admin user. The chambers was rolled back.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500, headers: corsHeaders() }
    );
  }

  await logActivity({
    actor: {
      id: guard.ctx.user.id,
      name: `${guard.ctx.user.firstName} ${guard.ctx.user.lastName}`.trim(),
      email: guard.ctx.user.email,
      type: "global_admin",
    },
    action: "partner_created",
    targetType: "partner",
    targetId: String(partner._id),
    targetName: partner.name,
    message: `Created chambers ${partner.name} on the ${parsed.plan} plan${
      isTrial ? ` (${parsed.trialDays}-day trial)` : ""
    }.${guard.ctx.isMobile ? " · via mobile" : ""}`,
    metadata: {
      plan: parsed.plan,
      trialDays: isTrial ? parsed.trialDays : null,
      via: guard.ctx.isMobile ? "mobile" : "web",
    },
    partnerId: String(partner._id),
  });

  return NextResponse.json(
    {
      ok: true,
      partner: {
        id: String(partner._id),
        slug: partner.slug,
        name: partner.name,
        primaryEmail: partner.primaryEmail,
      },
    },
    { status: 201, headers: corsHeaders() }
  );
}
