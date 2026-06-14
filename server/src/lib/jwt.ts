import jwt from "jsonwebtoken";

type TokenPayload = {
  userId: string;
  role: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  return secret;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.userId === "string" &&
      typeof decoded.role === "string"
    ) {
      return {
        userId: decoded.userId,
        role: decoded.role,
      };
    }

    return null;
  } catch {
    return null;
  }
}
