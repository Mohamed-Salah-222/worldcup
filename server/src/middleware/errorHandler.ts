import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

type DuplicateKeyError = Error & {
  code?: number;
  keyPattern?: Record<string, unknown>;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: "ValidationError",
      details: error.flatten(),
    });
    return;
  }

  const maybeDuplicate = error as DuplicateKeyError;
  if (maybeDuplicate.code === 11000) {
    const field = Object.keys(maybeDuplicate.keyPattern ?? {})[0] ?? "unknown";
    res.status(409).json({
      error: "Duplicate",
      field,
    });
    return;
  }

  res.status(500).json({ error: "Internal" });
};
