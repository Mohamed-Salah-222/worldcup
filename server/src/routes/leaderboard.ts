import { Router } from "express";
import { getLeaderboard } from "../controllers/leaderboardController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, getLeaderboard);

export default router;
