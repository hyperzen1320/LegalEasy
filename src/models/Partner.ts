import mongoose, { Schema, Types, type Model } from "mongoose";

export type Plan = "trial" | "solo" | "office" | "chambers";
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "cancelled"
  | "suspended";

export interface IPartner {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  primaryEmail: string;
  primaryContactName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  plan: Plan;
  subscription: {
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date;
    seatLimit: number;
    matterLimit: number;
  };
  branding: {
    officeName: string | null;
    letterhead: string | null;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    primaryEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    primaryContactName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    plan: {
      type: String,
      enum: ["trial", "solo", "office", "chambers"],
      default: "trial",
      required: true,
    },
    subscription: {
      status: {
        type: String,
        enum: ["trial", "active", "past_due", "cancelled", "suspended"],
        default: "trial",
        required: true,
      },
      startDate: { type: Date, required: true, default: () => new Date() },
      endDate: { type: Date, required: true },
      seatLimit: { type: Number, default: 1 },
      matterLimit: { type: Number, default: 100 },
    },
    branding: {
      officeName: { type: String, default: null },
      letterhead: { type: String, default: null },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// slug + primaryEmail unique indexes are set on the fields themselves.
PartnerSchema.index({ "subscription.status": 1, isDeleted: 1 });

export const Partner: Model<IPartner> =
  (mongoose.models.Partner as Model<IPartner>) ||
  mongoose.model<IPartner>("Partner", PartnerSchema);
