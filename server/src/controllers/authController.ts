import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { z } from "zod";
import { logAudit } from "../lib/audit";
import { signToken } from "../lib/jwt";
import { User, type IUser } from "../models";

export const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(30),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

type AuthUser = IUser & {
  _id: unknown;
};

function serializeUser(user: AuthUser) {
  return {
    id: String(user._id),
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    totalPoints: user.totalPoints,
    doublersUsed: user.doublersUsed,
  };
}

function authResponse(user: AuthUser) {
  return {
    token: signToken({
      userId: String(user._id),
      role: user.role,
    }),
    user: serializeUser(user),
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body);
  const username = body.username.toLowerCase();
  const passwordHash = await bcrypt.hash(body.password, 10);

  const user = await User.create({
    username,
    displayName: body.displayName,
    passwordHash,
  });

  await logAudit({ user, action: "REGISTER", req });

  res.status(201).json(authResponse(user as unknown as AuthUser));
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const username = body.username.toLowerCase();
  const user = await User.findOne({ username }).select("+passwordHash");

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isValid = await bcrypt.compare(body.password, user.passwordHash);

  if (!isValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await logAudit({ user, action: "LOGIN", req });

  res.json(authResponse(user as unknown as AuthUser));
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({
    user: serializeUser(user as unknown as AuthUser),
  });
}
