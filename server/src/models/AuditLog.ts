import mongoose, { Schema, Types } from "mongoose";

export type AuditAction =
  | "REGISTER"
  | "LOGIN"
  | "PREDICTION_CREATE"
  | "PREDICTION_EDIT"
  | "DOUBLER_APPLY"
  | "ADMIN_PREDICTION_BACKFILL"
  | "ADMIN_RESULT_ENTER"
  | "ADMIN_RESULT_EDIT"
  | "MATCH_SYNC";

export interface IAuditLog {
  user: Types.ObjectId | null;
  action: AuditAction;
  targetType: string | null;
  targetId: Types.ObjectId | null;
  metadata?: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "REGISTER",
        "LOGIN",
        "PREDICTION_CREATE",
        "PREDICTION_EDIT",
        "DOUBLER_APPLY",
        "ADMIN_PREDICTION_BACKFILL",
        "ADMIN_RESULT_ENTER",
        "ADMIN_RESULT_EDIT",
        "MATCH_SYNC",
      ],
    },
    targetType: {
      type: String,
      default: null,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
