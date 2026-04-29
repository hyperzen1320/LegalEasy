import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { requireAdmin } from "@/lib/admin-auth";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders() });
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  await connectDB();
  const docs = await Plan.find({}).sort({ sortOrder: 1 }).lean();

  const plans = docs.map((p) => ({
    key: p.key,
    label: p.label,
    tagline: p.tagline,
    description: p.description,
    priceAmount: p.priceAmount,
    priceLabel: p.priceLabel,
    priceSuffix: p.priceSuffix,
    billingCycle: p.billingCycle,
    features: p.features,
    seatLimit: p.seatLimit,
    matterLimit: p.matterLimit,
    isTrial: p.isTrial,
    isPopular: p.isPopular,
    showOnLanding: p.showOnLanding,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    ctaLabel: p.ctaLabel,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return NextResponse.json({ plans }, { headers: corsHeaders() });
}
