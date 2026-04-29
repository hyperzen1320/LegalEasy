import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/admin-auth";
import { corsHeaders } from "@/lib/cors";

const VALID_KEYS = ["trial", "solo", "office", "chambers"] as const;
const VALID_CYCLES = ["trial", "monthly", "yearly", "bespoke"] as const;

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  if (!(VALID_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json(
      { error: "Invalid plan key" },
      { status: 400, headers: corsHeaders() }
    );
  }

  await connectDB();
  const plan = await Plan.findOne({ key }).lean();
  if (!plan) {
    return NextResponse.json(
      { error: "Plan not found" },
      { status: 404, headers: corsHeaders() }
    );
  }

  return NextResponse.json(
    {
      plan: {
        key: plan.key,
        label: plan.label,
        tagline: plan.tagline,
        description: plan.description,
        priceAmount: plan.priceAmount,
        priceLabel: plan.priceLabel,
        priceSuffix: plan.priceSuffix,
        billingCycle: plan.billingCycle,
        features: plan.features,
        seatLimit: plan.seatLimit,
        matterLimit: plan.matterLimit,
        isTrial: plan.isTrial,
        isPopular: plan.isPopular,
        showOnLanding: plan.showOnLanding,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        ctaLabel: plan.ctaLabel,
        updatedAt: plan.updatedAt.toISOString(),
      },
    },
    { headers: corsHeaders() }
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  if (!(VALID_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json(
      { error: "Invalid plan key" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid body" },
      { status: 400, headers: corsHeaders() }
    );
  }

  await connectDB();
  const plan = await Plan.findOne({ key });
  if (!plan) {
    return NextResponse.json(
      { error: "Plan not found" },
      { status: 404, headers: corsHeaders() }
    );
  }

  type Diff = { field: string; before: unknown; after: unknown };
  const changes: Diff[] = [];

  // Strings
  for (const f of ["label", "tagline", "description", "priceLabel", "priceSuffix", "ctaLabel"] as const) {
    if (typeof body[f] === "string" && body[f] !== plan[f]) {
      const before = plan[f];
      plan[f] = (body[f] as string).trim();
      changes.push({ field: f, before, after: plan[f] });
    }
  }

  // Numbers
  for (const f of ["priceAmount", "seatLimit", "matterLimit", "sortOrder"] as const) {
    if (typeof body[f] === "number" && Number.isFinite(body[f]) && body[f] !== plan[f]) {
      const before = plan[f];
      const v = Math.max(0, Math.floor(body[f] as number));
      plan[f] = v;
      changes.push({ field: f, before, after: v });
    }
  }

  // Booleans
  for (const f of ["isPopular", "showOnLanding", "isActive"] as const) {
    if (typeof body[f] === "boolean" && body[f] !== plan[f]) {
      const before = plan[f];
      plan[f] = body[f] as boolean;
      changes.push({ field: f, before, after: plan[f] });
    }
  }

  // Billing cycle
  if (
    typeof body.billingCycle === "string" &&
    (VALID_CYCLES as readonly string[]).includes(body.billingCycle) &&
    body.billingCycle !== plan.billingCycle
  ) {
    const before = plan.billingCycle;
    plan.billingCycle = body.billingCycle as (typeof VALID_CYCLES)[number];
    changes.push({ field: "billingCycle", before, after: plan.billingCycle });
  }

  // Features array
  if (Array.isArray(body.features)) {
    const cleaned = (body.features as unknown[])
      .filter((f): f is string => typeof f === "string")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    if (
      cleaned.length !== plan.features.length ||
      cleaned.some((f, i) => f !== plan.features[i])
    ) {
      const before = [...plan.features];
      plan.features = cleaned;
      changes.push({ field: "features", before, after: cleaned });
    }
  }

  if (changes.length === 0) {
    return NextResponse.json(
      { error: "No changes to save" },
      { status: 400, headers: corsHeaders() }
    );
  }

  await plan.save();

  await logActivity({
    actor: {
      id: guard.ctx.user.id,
      name: `${guard.ctx.user.firstName} ${guard.ctx.user.lastName}`.trim(),
      email: guard.ctx.user.email,
      type: "global_admin",
    },
    action: "plan_updated",
    targetType: "system",
    targetId: String(plan._id),
    targetName: plan.label,
    message: `Updated subscription plan ${plan.label} (${plan.key}).`,
    metadata: { changes, key: plan.key, via: guard.ctx.isMobile ? "mobile" : "web" },
    partnerId: null,
  });

  // Invalidate caches so landing + add-partner show new pricing immediately
  revalidatePath("/");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/subscriptions/" + plan.key);
  revalidatePath("/admin/partners/new");

  return NextResponse.json(
    { ok: true, changes: changes.map((c) => c.field) },
    { headers: corsHeaders() }
  );
}
