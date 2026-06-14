import { Router } from "express";
import {
  adminResync,
  listAll,
  listUpcoming,
} from "../controllers/matchController";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.get("/upcoming", requireAuth, listUpcoming);
router.get("/", requireAuth, listAll);
router.post("/admin/resync", requireAuth, requireAdmin, adminResync);

export default router;
