import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { isMatchLocked } from "../lib/matchLock";
import { AuditLog, Doubler, Match, Prediction, User } from "../models";
import { scoreMatch } from "../services/scoringService";

const resultSchema = z.object({
  homeScore90: z.number().int().min(0).max(30),
  awayScore90: z.number().int().min(0).max(30),
  firstScorerTeam: z.enum(["HOME", "AWAY", "NONE"]),
  playerOfTheMatch: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .nullable(),
});

const backfillSchema = z.object({
  userId: z.string().refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid userId",
  }),
  matchId: z.string().refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid matchId",
  }),
  winner: z.enum(["HOME", "DRAW", "AWAY"]),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
  firstScorerTeam: z.enum(["HOME", "AWAY", "NONE"]),
  playerOfTheMatchGuess: z.string().min(1).max(60),
  doublerApplied: z.boolean(),
  submittedAt: z.string().datetime().optional(),
});

const DOUBLER_STAGES = [
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
] as const;

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-Finals",
  SEMI_FINALS: "Semi-Finals",
  THIRD_PLACE: "Third-Place Match",
  FINAL: "Final",
};

function validateResultConsistency(body: z.infer<typeof resultSchema>): string | null {
  if (
    body.homeScore90 === 0 &&
    body.awayScore90 === 0 &&
    body.firstScorerTeam !== "NONE"
  ) {
    return "0-0 results must use firstScorerTeam NONE.";
  }

  if (
    (body.homeScore90 > 0 || body.awayScore90 > 0) &&
    body.firstScorerTeam === "NONE"
  ) {
    return "Results with goals must use firstScorerTeam HOME or AWAY.";
  }

  return null;
}

function isDoublerStage(stage: string): boolean {
  return DOUBLER_STAGES.includes(stage as (typeof DOUBLER_STAGES)[number]);
}

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

function matchLabel(match: {
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
}): string {
  return `${match.homeTeam?.name ?? "Home"} vs ${match.awayTeam?.name ?? "Away"}`;
}

function validatePredictionConsistency(
  body: z.infer<typeof backfillSchema>,
): string | null {
  if (body.winner === "DRAW" && body.homeScore !== body.awayScore) {
    return "Draw predictions must have equal home and away scores.";
  }

  if (body.winner === "HOME" && body.homeScore <= body.awayScore) {
    return "Home win predictions must have homeScore greater than awayScore.";
  }

  if (body.winner === "AWAY" && body.awayScore <= body.homeScore) {
    return "Away win predictions must have awayScore greater than homeScore.";
  }

  if (
    body.homeScore === 0 &&
    body.awayScore === 0 &&
    body.firstScorerTeam !== "NONE"
  ) {
    return "0-0 predictions must use firstScorerTeam NONE.";
  }

  if (
    (body.homeScore > 0 || body.awayScore > 0) &&
    body.firstScorerTeam === "NONE"
  ) {
    return "Predictions with goals must use firstScorerTeam HOME or AWAY.";
  }

  return null;
}

function scoringStatus(match: {
  result?: unknown;
  scored: boolean;
  utcDate: Date;
}): "NOT_READY" | "SCORED" | "LOCKED_AWAITING_RESULT" {
  if (match.scored) {
    return "SCORED";
  }

  if (isMatchLocked(match)) {
    return "LOCKED_AWAITING_RESULT";
  }

  return "NOT_READY";
}

export async function getMatchPredictions(
  req: Request,
  res: Response,
): Promise<void> {
  const { matchId } = req.params;

  if (typeof matchId !== "string" || !Types.ObjectId.isValid(matchId)) {
    res.status(400).json({ error: "Invalid matchId" });
    return;
  }

  const match = await Match.findById(matchId);

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const predictions = await Prediction.find({ match: matchId })
    .sort({ submittedAt: -1 })
    .populate("user", "displayName username");

  res.json({ match, predictions });
}

export async function getUsersWithPredictionStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const { matchId } = req.params;

  if (typeof matchId !== "string" || !Types.ObjectId.isValid(matchId)) {
    res.status(400).json({ error: "Invalid matchId" });
    return;
  }

  const match = await Match.findById(matchId);

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const [users, predictions, doublers] = await Promise.all([
    User.find({}, "username displayName role").sort({ username: 1 }).lean(),
    Prediction.find({ match: matchId }, "user").lean(),
    isDoublerStage(match.stage ?? "")
      ? Doubler.find({ stage: match.stage })
          .populate("match", "homeTeam awayTeam")
          .lean()
      : Promise.resolve([]),
  ]);
  const predictionUserIds = new Set(
    predictions.map((prediction) => String(prediction.user)),
  );
  const doublerByUser = new Map<string, { matchId: string; matchLabel: string }>();

  for (const doubler of doublers) {
    const populatedMatch = doubler.match as unknown as
      | { _id: Types.ObjectId; homeTeam?: { name?: string }; awayTeam?: { name?: string } }
      | undefined;

    if (populatedMatch) {
      doublerByUser.set(String(doubler.user), {
        matchId: String(populatedMatch._id),
        matchLabel: matchLabel(populatedMatch),
      });
    }
  }

  res.json({
    users: users.map((user) => ({
      _id: String(user._id),
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      hasPrediction: predictionUserIds.has(String(user._id)),
      stageDoubler: doublerByUser.get(String(user._id)) ?? null,
    })),
  });
}

export async function enterResult(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { matchId } = req.params;

  if (typeof matchId !== "string" || !Types.ObjectId.isValid(matchId)) {
    res.status(400).json({ error: "Invalid matchId" });
    return;
  }

  const body = resultSchema.parse(req.body);
  const consistencyError = validateResultConsistency(body);

  if (consistencyError) {
    res.status(400).json({ error: consistencyError });
    return;
  }

  const match = await Match.findById(matchId);

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const reScore = Boolean(match.result && match.scored);
  match.result = {
    homeScore90: body.homeScore90,
    awayScore90: body.awayScore90,
    firstScorerTeam: body.firstScorerTeam,
    playerOfTheMatch: body.playerOfTheMatch,
    enteredBy: req.user._id,
    enteredAt: new Date(),
  };
  await match.save();

  try {
    const summary = await scoreMatch(match._id, {
      triggeredBy: req.user._id,
      reScore,
    });
    res.json(summary);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Could not score match.",
    });
  }
}

export async function adminListMatches(req: Request, res: Response): Promise<void> {
  const filters: Record<string, unknown> = {};

  if (req.query.needsScoring === "true") {
    filters.scored = false;
    filters.utcDate = { $lte: new Date() };
  }

  const matches = await Match.find(filters).sort({ utcDate: -1 }).limit(300);

  res.json({
    matches: matches.map((match) => ({
      ...match.toObject(),
      scoringStatus: scoringStatus(match),
    })),
  });
}

export async function backfillPrediction(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = backfillSchema.parse(req.body);
  const [match, targetUser] = await Promise.all([
    Match.findById(body.matchId),
    User.findById(body.userId),
  ]);

  if (!match || !targetUser) {
    res.status(404).json({ error: "Match or user not found" });
    return;
  }

  const consistencyError = validatePredictionConsistency(body);

  if (consistencyError) {
    res.status(400).json({ error: consistencyError });
    return;
  }

  const stage = match.stage ?? "";

  if (body.doublerApplied && !isDoublerStage(stage)) {
    res.status(400).json({
      error: `${stageLabel(stage)} is not eligible for a doubler.`,
    });
    return;
  }

  let doublersUsedModified = false;
  const existingStageDoubler = isDoublerStage(stage)
    ? await Doubler.findOne({ user: body.userId, stage }).populate(
        "match",
        "homeTeam awayTeam",
      )
    : null;

  if (body.doublerApplied) {
    if (
      existingStageDoubler &&
      !existingStageDoubler.match.equals(body.matchId)
    ) {
      const existingMatch = existingStageDoubler.match as unknown as {
        homeTeam?: { name?: string };
        awayTeam?: { name?: string };
      };
      res.status(409).json({
        error: `User ${targetUser.displayName} already used their ${stageLabel(
          stage,
        )} doubler on ${matchLabel(existingMatch)}.`,
      });
      return;
    }

    if (!existingStageDoubler) {
      await Doubler.create({
        user: body.userId,
        stage,
        match: body.matchId,
      });
    }

    targetUser.doublersUsed[stage as keyof typeof targetUser.doublersUsed] = true;
    doublersUsedModified = true;
  } else if (isDoublerStage(stage)) {
    const currentMatchDoubler = await Doubler.findOne({
      user: body.userId,
      stage,
      match: body.matchId,
    });

    if (currentMatchDoubler) {
      await currentMatchDoubler.deleteOne();
      targetUser.doublersUsed[stage as keyof typeof targetUser.doublersUsed] = false;
      doublersUsedModified = true;
    }
  }

  let prediction = await Prediction.findOne({
    user: body.userId,
    match: body.matchId,
  });

  if (prediction) {
    prediction.editHistory.push({
      at: new Date(),
      winner: prediction.winner,
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      firstScorerTeam: prediction.firstScorerTeam,
      playerOfTheMatchGuess: prediction.playerOfTheMatchGuess,
      doublerApplied: prediction.doublerApplied,
    });
    prediction.winner = body.winner;
    prediction.homeScore = body.homeScore;
    prediction.awayScore = body.awayScore;
    prediction.firstScorerTeam = body.firstScorerTeam;
    prediction.playerOfTheMatchGuess = body.playerOfTheMatchGuess;
    prediction.doublerApplied = body.doublerApplied;
    if (body.submittedAt) {
      prediction.submittedAt = new Date(body.submittedAt);
    }
    await prediction.save();
  } else {
    prediction = await Prediction.create({
      user: body.userId,
      match: body.matchId,
      winner: body.winner,
      homeScore: body.homeScore,
      awayScore: body.awayScore,
      firstScorerTeam: body.firstScorerTeam,
      playerOfTheMatchGuess: body.playerOfTheMatchGuess,
      doublerApplied: body.doublerApplied,
      submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
    });
  }

  if (doublersUsedModified) {
    await User.updateOne(
      { _id: targetUser._id },
      { $set: { doublersUsed: targetUser.doublersUsed } },
    );
  }

  let summary: Awaited<ReturnType<typeof scoreMatch>> | null = null;
  const wasMatchScored = match.scored === true;

  if (wasMatchScored) {
    summary = await scoreMatch(match._id, {
      triggeredBy: req.user._id,
      reScore: true,
      skipAudit: true,
    });
    prediction = await Prediction.findById(prediction._id) ?? prediction;
  }

  const freshUser = await User.findById(body.userId);

  await AuditLog.create({
    user: req.user._id,
    action: "ADMIN_PREDICTION_BACKFILL",
    targetType: "Prediction",
    targetId: prediction._id,
    metadata: {
      targetUserId: body.userId,
      targetUsername: targetUser.username,
      matchId: body.matchId,
      matchLabel: matchLabel(match),
      prediction: {
        winner: body.winner,
        homeScore: body.homeScore,
        awayScore: body.awayScore,
        firstScorerTeam: body.firstScorerTeam,
        playerOfTheMatchGuess: body.playerOfTheMatchGuess,
        doublerApplied: body.doublerApplied,
      },
      wasMatchScored,
      rescoredHere: Boolean(summary),
    },
    ip: req.ip,
    userAgent: req.get("user-agent") ?? null,
  });

  res.json({
    prediction,
    scored: Boolean(summary),
    pointsAwarded: summary ? prediction.pointsAwarded : undefined,
    userNewTotal: summary ? freshUser?.totalPoints : undefined,
  });
}
