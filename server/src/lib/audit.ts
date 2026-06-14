import type { Request } from "express";
import type { Types } from "mongoose";
import { AuditLog, type AuditAction } from "../models";

type LogAuditArgs = {
  user?: { _id: Types.ObjectId } | Types.ObjectId | null;
  action: AuditAction;
  targetType?: string | null;
  targetId?: Types.ObjectId | null;
  metadata?: unknown;
  req: Request;
};

function getUserId(user: LogAuditArgs["user"]): Types.ObjectId | null {
  if (!user) {
    return null;
  }

  if ("_id" in user) {
    return user._id;
  }

  return user;
}

export async function logAudit({
  user,
  action,
  targetType = null,
  targetId = null,
  metadata = null,
  req,
}: LogAuditArgs): Promise<void> {
  try {
    await AuditLog.create({
      user: getUserId(user),
      action,
      targetType,
      targetId,
      metadata,
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
