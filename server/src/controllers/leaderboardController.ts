import type { Request, Response } from "express";
import { User } from "../models";

type LeaderboardAggregateRow = {
  _id: unknown;
  username: string;
  displayName: string;
  role: "user" | "admin";
  totalPoints: number;
  predictionsCount: number;
  matchesScored: number;
  correctWinners: number;
  exactScores: number;
};

export async function getLeaderboard(
  _req: Request,
  res: Response,
): Promise<void> {
  const users = await User.aggregate<LeaderboardAggregateRow>([
    {
      $lookup: {
        from: "predictions",
        localField: "_id",
        foreignField: "user",
        as: "preds",
      },
    },
    {
      $lookup: {
        from: "matches",
        localField: "preds.match",
        foreignField: "_id",
        as: "matches",
      },
    },
    {
      $project: {
        username: 1,
        displayName: 1,
        role: 1,
        totalPoints: 1,
        predictionsCount: { $size: "$preds" },
        matchesScored: {
          $size: {
            $filter: {
              input: "$matches",
              as: "m",
              cond: { $eq: ["$$m.scored", true] },
            },
          },
        },
        correctWinners: {
          $size: {
            $filter: {
              input: "$preds",
              as: "p",
              cond: { $gt: ["$$p.pointsBreakdown.winner", 0] },
            },
          },
        },
        exactScores: {
          $size: {
            $filter: {
              input: "$preds",
              as: "p",
              cond: { $gt: ["$$p.pointsBreakdown.score", 0] },
            },
          },
        },
      },
    },
    { $sort: { totalPoints: -1, username: 1 } },
  ]);

  let previousPoints: number | null = null;
  let previousRank = 0;

  const leaderboard = users.map((user, index) => {
    const rank =
      previousPoints === user.totalPoints ? previousRank : index + 1;

    previousPoints = user.totalPoints;
    previousRank = rank;

    return {
      rank,
      userId: String(user._id),
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      totalPoints: user.totalPoints,
      predictionsCount: user.predictionsCount,
      matchesScored: user.matchesScored,
      correctWinners: user.correctWinners,
      exactScores: user.exactScores,
    };
  });

  res.json({
    leaderboard,
    lastUpdated: new Date().toISOString(),
  });
}
