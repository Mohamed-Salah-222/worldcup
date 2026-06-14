import { Router } from "express";
import {
  adminListMatches,
  backfillPrediction,
  enterResult,
  getMatchPredictions,
  getUsersWithPredictionStatus,
} from "../controllers/adminController";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/matches", requireAuth, requireAdmin, adminListMatches);
router.get(
  "/matches/:matchId/predictions",
  requireAuth,
  requireAdmin,
  getMatchPredictions,
);
router.get(
  "/matches/:matchId/users",
  requireAuth,
  requireAdmin,
  getUsersWithPredictionStatus,
);
router.post("/matches/:matchId/result", requireAuth, requireAdmin, enterResult);
router.post(
  "/predictions/backfill",
  requireAuth,
  requireAdmin,
  backfillPrediction,
);

export default router;
