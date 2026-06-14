import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";
import { verifyToken } from "../lib/jwt";
import { type IUser, User } from "../models";

declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: Types.ObjectId };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = user as unknown as IUser & { _id: Types.ObjectId };
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
