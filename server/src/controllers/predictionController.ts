import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { logAudit } from "../lib/audit";
import { getStageOf, isMatchLocked } from "../lib/matchLock";
import { Doubler, Match, Prediction, User } from "../models";

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-Finals",
  SEMI_FINALS: "Semi-Finals",
  THIRD_PLACE: "Third-Place Match",
  FINAL: "Final",
};

const DOUBLER_STAGES = [
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
] as const;

const predictionBodySchema = z.object({
  matchId: z.string().refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid matchId",
  }),
  winner: z.enum(["HOME", "DRAW", "AWAY"]),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
  firstScorerTeam: z.enum(["HOME", "AWAY", "NONE"]),
  playerOfTheMatchGuess: z.string().min(1).max(60),
  doublerApplied: z.boolean(),
});

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

function isDoublerStage(stage: string): boolean {
  return DOUBLER_STAGES.includes(stage as (typeof DOUBLER_STAGES)[number]);
}

function matchLabel(match: {
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
}): string {
  return `${match.homeTeam?.name ?? "Home"} vs ${match.awayTeam?.name ?? "Away"}`;
}

function validatePredictionConsistency(
  body: z.infer<typeof predictionBodySchema>,
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

export async function upsertPrediction(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = predictionBodySchema.parse(req.body);
  const match = await Match.findById(body.matchId);

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  if (isMatchLocked(match)) {
    res.status(403).json({
      error: "Match is locked. Predictions cannot be changed after kickoff.",
    });
    return;
  }

  const consistencyError = validatePredictionConsistency(body);

  if (consistencyError) {
    res.status(400).json({ error: consistencyError });
    return;
  }

  const stage = getStageOf({ stage: match.stage ?? "" });
  const userId = req.user._id;
  let doublersUsedModified = false;

  if (body.doublerApplied && !isDoublerStage(stage)) {
    res.status(400).json({
      error: `${stageLabel(stage)} is not eligible for a doubler.`,
    });
    return;
  }

  const existingStageDoubler = isDoublerStage(stage)
    ? await Doubler.findOne({ user: userId, stage })
    : null;

  if (body.doublerApplied) {
    if (
      existingStageDoubler &&
      !existingStageDoubler.match.equals(body.matchId)
    ) {
      res.status(409).json({
        error: `You've already used your ${stageLabel(
          stage,
        )} doubler on another match. Remove it there first.`,
      });
      return;
    }

    if (!existingStageDoubler) {
      await Doubler.create({
        user: userId,
        stage,
        match: body.matchId,
      });
    }

    req.user.doublersUsed[stage as keyof typeof req.user.doublersUsed] = true;
    doublersUsedModified = true;
  } else if (isDoublerStage(stage)) {
    const currentMatchDoubler = await Doubler.findOne({
      user: userId,
      stage,
      match: body.matchId,
    });

    if (currentMatchDoubler) {
      await currentMatchDoubler.deleteOne();
      req.user.doublersUsed[stage as keyof typeof req.user.doublersUsed] = false;
      doublersUsedModified = true;
    }
  }

  let prediction = await Prediction.findOne({
    user: userId,
    match: body.matchId,
  });
  let action: "PREDICTION_CREATE" | "PREDICTION_EDIT";

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
    await prediction.save();
    action = "PREDICTION_EDIT";
  } else {
    prediction = await Prediction.create({
      user: userId,
      match: body.matchId,
      winner: body.winner,
      homeScore: body.homeScore,
      awayScore: body.awayScore,
      firstScorerTeam: body.firstScorerTeam,
      playerOfTheMatchGuess: body.playerOfTheMatchGuess,
      doublerApplied: body.doublerApplied,
    });
    action = "PREDICTION_CREATE";
  }

  if (doublersUsedModified) {
    await User.updateOne(
      { _id: userId },
      { $set: { doublersUsed: req.user.doublersUsed } },
    );
  }

  await logAudit({
    user: req.user,
    action,
    targetType: "Prediction",
    targetId: prediction._id,
    req,
  });

  const populated = await Prediction.findById(prediction._id).populate("match");
  res.json({ prediction: populated });
}

export async function getMyPredictions(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const query: Record<string, unknown> = { user: req.user._id };

  if (typeof req.query.matchId === "string") {
    if (!Types.ObjectId.isValid(req.query.matchId)) {
      res.status(400).json({ error: "Invalid matchId" });
      return;
    }

    query.match = req.query.matchId;
  }

  const predictions = await Prediction.find(query)
    .sort({ submittedAt: -1 })
    .populate("match", "utcDate status stage homeTeam awayTeam group");

  res.json({ predictions });
}

export async function getUserPredictionsDetailed(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const predictions = await Prediction.find({ user: req.user._id }).populate(
    "match",
  );
  const sorted = predictions.sort((a, b) => {
    const aMatch = a.match as unknown as { utcDate?: Date };
    const bMatch = b.match as unknown as { utcDate?: Date };
    return (
      new Date(bMatch.utcDate ?? 0).getTime() -
      new Date(aMatch.utcDate ?? 0).getTime()
    );
  });
  const shaped = sorted.map((prediction) => ({
    _id: prediction._id,
    match: prediction.match,
    winner: prediction.winner,
    homeScore: prediction.homeScore,
    awayScore: prediction.awayScore,
    firstScorerTeam: prediction.firstScorerTeam,
    playerOfTheMatchGuess: prediction.playerOfTheMatchGuess,
    doublerApplied: prediction.doublerApplied,
    pointsAwarded: prediction.pointsAwarded,
    pointsBreakdown: prediction.pointsBreakdown,
    submittedAt: prediction.submittedAt,
    editCount: prediction.editHistory.length,
  }));
  const scored = shaped.filter((prediction) => {
    const match = prediction.match as { scored?: boolean };
    return match.scored === true;
  }).length;

  res.json({
    predictions: shaped,
    stats: {
      total: shaped.length,
      scored,
      pending: shaped.length - scored,
      pointsTotal: shaped.reduce(
        (sum, prediction) => sum + prediction.pointsAwarded,
        0,
      ),
    },
  });
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
    .populate("user", "username displayName role")
    .sort({ submittedAt: 1 });
  const publicPredictions = predictions.map((prediction) => ({
    _id: String(prediction._id),
    user: prediction.user,
    winner: prediction.winner,
    homeScore: prediction.homeScore,
    awayScore: prediction.awayScore,
    firstScorerTeam: prediction.firstScorerTeam,
    playerOfTheMatchGuess: prediction.playerOfTheMatchGuess,
    doublerApplied: prediction.doublerApplied,
    submittedAt: prediction.submittedAt.toISOString(),
    editCount: prediction.editHistory.length,
    pointsAwarded: match.scored ? prediction.pointsAwarded : 0,
    pointsBreakdown: match.scored
      ? prediction.pointsBreakdown
      : {
          winner: 0,
          score: 0,
          firstScorer: 0,
          potm: 0,
          doubled: false,
        },
    scored: match.scored,
  }));

  res.json({
    matchId,
    predictions: publicPredictions,
    count: publicPredictions.length,
  });
}

export async function getMyDoublersStatus(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const doublersUsed: Record<
    string,
    { used: boolean; matchId: string | null; matchLabel: string | null }
  > = {};

  for (const stage of DOUBLER_STAGES) {
    const doubler = await Doubler.findOne({
      user: req.user._id,
      stage,
    }).populate("match", "homeTeam awayTeam");
    const match = doubler?.match as
      | ({ _id: Types.ObjectId; homeTeam?: { name?: string }; awayTeam?: { name?: string } })
      | undefined;

    doublersUsed[stage] = {
      used: Boolean(doubler),
      matchId: match ? String(match._id) : null,
      matchLabel: match ? matchLabel(match) : null,
    };
  }

  res.json({ doublersUsed });
}
