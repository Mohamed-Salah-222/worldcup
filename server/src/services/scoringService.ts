import type { Types } from "mongoose";
import { isPotmMatch } from "../lib/potmMatch";
import { AuditLog, type IMatch, type IPrediction, Match, Prediction, User } from "../models";

export const POINTS = {
  WINNER: 1,
  SCORE: 2,
  FIRST_SCORER: 1,
  POTM: 1,
};

export interface ScoreInputs {
  match: IMatch & { _id: Types.ObjectId };
  result: {
    homeScore90: number;
    awayScore90: number;
    firstScorerTeam: "HOME" | "AWAY" | "NONE";
    playerOfTheMatch: string | null;
  };
}

export interface PredictionScoring {
  winner: number;
  score: number;
  firstScorer: number;
  potm: number;
  doubled: boolean;
  total: number;
}

export function computeActualWinner(
  homeScore: number,
  awayScore: number,
): "HOME" | "DRAW" | "AWAY" {
  if (homeScore > awayScore) {
    return "HOME";
  }

  if (awayScore > homeScore) {
    return "AWAY";
  }

  return "DRAW";
}

export function scorePrediction(
  pred: IPrediction,
  result: ScoreInputs["result"],
  actualWinner: "HOME" | "DRAW" | "AWAY",
): PredictionScoring {
  const winner = pred.winner === actualWinner ? POINTS.WINNER : 0;
  const score =
    pred.homeScore === result.homeScore90 &&
    pred.awayScore === result.awayScore90
      ? POINTS.SCORE
      : 0;
  const firstScorer =
    pred.firstScorerTeam === result.firstScorerTeam ? POINTS.FIRST_SCORER : 0;
  const potm = isPotmMatch(
    pred.playerOfTheMatchGuess,
    result.playerOfTheMatch,
  )
    ? POINTS.POTM
    : 0;
  const subtotal = winner + score + firstScorer + potm;
  const doubled = pred.doublerApplied;

  return {
    winner,
    score,
    firstScorer,
    potm,
    doubled,
    total: doubled ? subtotal * 2 : subtotal,
  };
}

export async function scoreMatch(
  matchId: Types.ObjectId,
  opts: { triggeredBy: Types.ObjectId; reScore?: boolean; skipAudit?: boolean },
): Promise<{
  scored: number;
  totalPointsAwarded: number;
  perUser: Array<{
    userId: string;
    username: string;
    pointsThisMatch: number;
    newTotal: number;
  }>;
}> {
  const match = await Match.findById(matchId);

  if (!match?.result) {
    throw new Error("Match result is required before scoring.");
  }

  if (match.scored === true && opts.reScore !== true) {
    throw new Error("Match already scored; pass reScore: true to override.");
  }

  const result = {
    homeScore90: match.result.homeScore90 ?? 0,
    awayScore90: match.result.awayScore90 ?? 0,
    firstScorerTeam: match.result.firstScorerTeam ?? "NONE",
    playerOfTheMatch: match.result.playerOfTheMatch ?? null,
  };
  const actualWinner = computeActualWinner(
    result.homeScore90,
    result.awayScore90,
  );
  const predictions = await Prediction.find({ match: matchId });
  const increments = new Map<string, number>();
  let totalPointsAwarded = 0;

  for (const prediction of predictions) {
    const scoring = scorePrediction(prediction, result, actualWinner);
    const previousPoints = opts.reScore ? prediction.pointsAwarded : 0;
    const netChange = scoring.total - previousPoints;
    const userId = String(prediction.user);

    prediction.pointsAwarded = scoring.total;
    prediction.pointsBreakdown = {
      winner: scoring.winner,
      score: scoring.score,
      firstScorer: scoring.firstScorer,
      potm: scoring.potm,
      doubled: scoring.doubled,
    };
    await prediction.save();

    increments.set(userId, (increments.get(userId) ?? 0) + netChange);
    totalPointsAwarded += scoring.total;
  }

  const perUser: Array<{
    userId: string;
    username: string;
    pointsThisMatch: number;
    newTotal: number;
  }> = [];

  for (const [userId, pointsThisMatch] of increments) {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { totalPoints: pointsThisMatch } },
      { new: true },
    );

    if (updatedUser) {
      perUser.push({
        userId,
        username: updatedUser.username,
        pointsThisMatch,
        newTotal: updatedUser.totalPoints,
      });
    }
  }

  const wasScored = match.scored;
  match.scored = true;
  await match.save();

  if (!opts.skipAudit) {
    await AuditLog.create({
      user: opts.triggeredBy,
      action: wasScored || opts.reScore ? "ADMIN_RESULT_EDIT" : "ADMIN_RESULT_ENTER",
      targetType: "Match",
      targetId: match._id,
      metadata: {
        result,
        scored: predictions.length,
        totalPointsAwarded,
        perUser,
      },
      ip: null,
      userAgent: null,
    });
  }

  return {
    scored: predictions.length,
    totalPointsAwarded,
    perUser,
  };
}
