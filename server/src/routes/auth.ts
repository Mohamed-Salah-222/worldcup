import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  loginSchema,
  me,
  register,
  registerSchema,
} from "../controllers/authController";
import { validateBody } from "../lib/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", registerLimiter, validateBody(registerSchema), register);
router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
