import { Router } from "express";
import {
  getMyDoublersStatus,
  getMyPredictions,
  getUserPredictionsDetailed,
  upsertPrediction,
} from "../controllers/predictionController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMyPredictions);
router.get("/me/detailed", requireAuth, getUserPredictionsDetailed);
router.get("/doublers", requireAuth, getMyDoublersStatus);
router.post("/", requireAuth, upsertPrediction);

export default router;
