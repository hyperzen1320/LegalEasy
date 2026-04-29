import mongoose, { Schema, Types, type Model } from "mongoose";

export type PlanKey = "trial" | "solo" | "office" | "chambers";
export type BillingCycle = "trial" | "monthly" | "yearly" | "bespoke";

export interface IPlan {
  _id: Types.ObjectId;
  key: PlanKey;
  label: string;
  tagline: string;
  description: string;
  priceAmount: number;             // in INR rupees, 0 for trial, 0 for bespoke
  priceLabel: string;              // e.g. "₹1,499", "Bespoke", "Free"
  priceSuffix: string;             // e.g. "/ mo", "", "· time-limited"
  billingCycle: BillingCycle;
  features: string[];
  seatLimit: number;
  matterLimit: number;
  isTrial: boolean;
  isPopular: boolean;
  showOnLanding: boolean;
  isActive: boolean;
  sortOrder: number;
  ctaLabel: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["trial", "solo", "office", "chambers"],
    },
    label: { type: String, required: true, trim: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    priceAmount: { type: Number, required: true, default: 0 },
    priceLabel: { type: String, required: true, default: "" },
    priceSuffix: { type: String, default: "" },
    billingCycle: {
      type: String,
      enum: ["trial", "monthly", "yearly", "bespoke"],
      required: true,
      default: "monthly",
    },
    features: { type: [String], default: [] },
    seatLimit: { type: Number, required: true, default: 1 },
    matterLimit: { type: Number, required: true, default: 100 },
    isTrial: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    showOnLanding: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    ctaLabel: { type: String, default: "Get started" },
  },
  { timestamps: true }
);

PlanSchema.index({ sortOrder: 1 });
PlanSchema.index({ showOnLanding: 1, isActive: 1, sortOrder: 1 });

export const Plan: Model<IPlan> =
  (mongoose.models.Plan as Model<IPlan>) ||
  mongoose.model<IPlan>("Plan", PlanSchema);
