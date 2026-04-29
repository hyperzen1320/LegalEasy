import mongoose, { Schema, Types, type Model } from "mongoose";

export type UserType = "global_admin" | "partner_admin" | "user";

// Within-office RBAC role. Independent of `userType`, which is the auth scope.
// `partner_admin` always carries `role: "admin"`; `user` defaults to "junior".
export type UserRole =
  | "admin"
  | "advocate"
  | "junior"
  | "clerk"
  | "viewer";

export const USER_ROLES: UserRole[] = [
  "admin",
  "advocate",
  "junior",
  "clerk",
  "viewer",
];

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  role: UserRole;
  partnerId: Types.ObjectId | null;
  // Profile / identity (matches the requirements doc's "profiles" table)
  phone: string;
  state: string;
  country: string;
  officeAddress: string;
  barEnrolmentNo: string;
  designation: string;
  profilePhoto: string;
  active: boolean;
  isDeleted: boolean;
  invite?: {
    tokenHash: string | null;
    expiresAt: Date | null;
    acceptedAt: Date | null;
  };
  passwordReset?: {
    tokenHash: string | null;
    expiresAt: Date | null;
  };
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    userType: {
      type: String,
      enum: ["global_admin", "partner_admin", "user"],
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "advocate", "junior", "clerk", "viewer"],
      default: "junior",
      required: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
      validate: {
        validator: function (this: IUser, v: Types.ObjectId | null) {
          // global_admin must NOT have a partnerId; everyone else must.
          if (this.userType === "global_admin") return v === null;
          return v !== null && v !== undefined;
        },
        message:
          "partnerId is required for partner_admin/user, must be null for global_admin",
      },
    },
    phone: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    country: { type: String, default: "India", trim: true },
    officeAddress: { type: String, default: "", trim: true },
    barEnrolmentNo: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },
    profilePhoto: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    invite: {
      tokenHash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      acceptedAt: { type: Date, default: null },
    },
    passwordReset: {
      tokenHash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound + secondary indexes (email's unique index is set on the field itself).
UserSchema.index({ partnerId: 1, isDeleted: 1 });
UserSchema.index({ userType: 1 });

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
