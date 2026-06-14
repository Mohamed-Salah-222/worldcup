import mongoose, { Schema } from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser {
  username: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  doublersUsed: {
    GROUP_STAGE: boolean;
    LAST_32: boolean;
    LAST_16: boolean;
    QUARTER_FINALS: boolean;
    SEMI_FINALS: boolean;
    FINAL: boolean;
  };
  totalPoints: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    doublersUsed: {
      GROUP_STAGE: { type: Boolean, default: false },
      LAST_32: { type: Boolean, default: false },
      LAST_16: { type: Boolean, default: false },
      QUARTER_FINALS: { type: Boolean, default: false },
      SEMI_FINALS: { type: Boolean, default: false },
      FINAL: { type: Boolean, default: false },
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ totalPoints: -1 });

export const User = mongoose.model<IUser>("User", userSchema);
