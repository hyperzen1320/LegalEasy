import mongoose, { Schema, Types, type Model } from "mongoose";

export type ActivityAction =
  | "partner_created"
  | "partner_updated"
  | "partner_password_reset"
  | "partner_suspended"
  | "partner_unsuspended"
  | "partner_plan_changed"
  | "partner_trial_extended"
  | "partner_deleted"
  | "user_login"
  | "system";

export interface IActivity {
  _id: Types.ObjectId;
  actorUserId: Types.ObjectId | null;
  actorName: string;
  actorEmail: string;
  actorType: "global_admin" | "partner_admin" | "user" | "system";
  action: ActivityAction;
  targetType: "partner" | "user" | "system";
  targetId: Types.ObjectId | null;
  targetName: string;
  message: string;
  metadata: Record<string, unknown>;
  partnerId: Types.ObjectId | null;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorName: { type: String, required: true },
    actorEmail: { type: String, required: true, lowercase: true },
    actorType: {
      type: String,
      enum: ["global_admin", "partner_admin", "user", "system"],
      required: true,
    },
    action: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["partner", "user", "system"],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetName: { type: String, default: "" },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ partnerId: 1, createdAt: -1 });
ActivitySchema.index({ actorUserId: 1, createdAt: -1 });
ActivitySchema.index({ action: 1, createdAt: -1 });

export const Activity: Model<IActivity> =
  (mongoose.models.Activity as Model<IActivity>) ||
  mongoose.model<IActivity>("Activity", ActivitySchema);
