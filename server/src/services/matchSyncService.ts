import type { Types } from "mongoose";
import { AuditLog, Match } from "../models";

type SyncOptions = {
  triggeredBy?: Types.ObjectId;
};

type TeamInput = {
  id?: number | null;
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
};

function mapTeam(team?: TeamInput | null) {
  return {
    id: team?.id ?? 0,
    name: team?.name ?? "",
    shortName: team?.shortName ?? "",
    tla: team?.tla ?? "",
    crest: team?.crest ?? "",
  };
}

function mapMatch(match: any) {
  return {
    externalId: match.id,
    competition: "WC",
    stage: match.stage,
    group: match.group ?? null,
    utcDate: new Date(match.utcDate),
    status: match.status,
    homeTeam: mapTeam(match.homeTeam),
    awayTeam: mapTeam(match.awayTeam),
  };
}

export async function syncMatches(
  rawApiResponse: any,
  opts: SyncOptions = {},
): Promise<{ inserted: number; updated: number; total: number }> {
  const matches = Array.isArray(rawApiResponse?.matches)
    ? rawApiResponse.matches
    : [];
  let inserted = 0;
  let updated = 0;
  let total = 0;

  for (const match of matches) {
    if (match?.competition?.code !== "WC") {
      continue;
    }

    const mapped = mapMatch(match);
    const existing = await Match.exists({ externalId: mapped.externalId });

    await Match.findOneAndUpdate(
      { externalId: mapped.externalId },
      {
        $set: mapped,
        $setOnInsert: {
          result: null,
          scored: false,
        },
      },
      { upsert: true, new: true },
    );

    if (existing) {
      updated += 1;
    } else {
      inserted += 1;
    }

    total += 1;
  }

  await AuditLog.create({
    user: opts.triggeredBy ?? null,
    action: "MATCH_SYNC",
    targetType: "Match",
    targetId: null,
    metadata: {
      inserted,
      updated,
      total,
    },
    ip: null,
    userAgent: null,
  });

  return { inserted, updated, total };
}
