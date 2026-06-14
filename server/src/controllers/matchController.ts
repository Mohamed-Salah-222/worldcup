import { addDays, endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Request, Response } from "express";
import { fetchAllWorldCupMatches } from "../services/footballDataClient";
import { syncMatches } from "../services/matchSyncService";
import { Match } from "../models";

export async function listUpcoming(_req: Request, res: Response): Promise<void> {
  const tz = "Africa/Cairo";
  const now = new Date();
  const todayStartCairo = startOfDay(toZonedTime(now, tz));
  const tomorrowEndCairo = endOfDay(addDays(todayStartCairo, 1));
  const fromUtc = fromZonedTime(todayStartCairo, tz);
  const toUtc = fromZonedTime(tomorrowEndCairo, tz);

  const matches = await Match.find({
    utcDate: { $gte: fromUtc, $lte: toUtc },
  }).sort({ utcDate: 1 });

  res.json({ matches });
}

export async function listAll(req: Request, res: Response): Promise<void> {
  const filters: Record<string, unknown> = {};

  if (typeof req.query.stage === "string") {
    filters.stage = req.query.stage;
  }

  const matches = await Match.find(filters).sort({ utcDate: 1 }).limit(200);

  res.json({ matches });
}

export async function adminResync(req: Request, res: Response): Promise<void> {
  try {
    const result = await fetchAllWorldCupMatches();
    const counts = await syncMatches(result, { triggeredBy: req.user?._id });
    res.json(counts);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Football-data.org sync failed.",
    });
  }
}
