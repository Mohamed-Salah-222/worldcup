import { Router } from "express";
import {
  adminListMatches,
  backfillPrediction,
  createAdminMatch,
  enterResult,
  getMatchPredictions,
  getUsersWithPredictionStatus,
  updateAdminMatch,
} from "../controllers/adminController";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/matches", requireAuth, requireAdmin, adminListMatches);
router.post("/matches", requireAuth, requireAdmin, createAdminMatch);
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
router.patch("/matches/:matchId", requireAuth, requireAdmin, updateAdminMatch);
router.post("/matches/:matchId/result", requireAuth, requireAdmin, enterResult);
router.post(
  "/predictions/backfill",
  requireAuth,
  requireAdmin,
  backfillPrediction,
);

export default router;
