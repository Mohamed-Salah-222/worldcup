import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCairoTime } from "@/lib/format";
import type { Match } from "@/lib/types";

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "3rd",
  FINAL: "Final",
};

function ScoringStatusBadge({ status }: { status?: Match["scoringStatus"] }) {
  if (status === "SCORED") {
    return (
      <Badge className="text-[10px] shrink-0 bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-700">
        Scored
      </Badge>
    );
  }

  if (status === "LOCKED_AWAITING_RESULT") {
    return (
      <Badge className="text-[10px] shrink-0 bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-700">
        Awaiting result
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
      Upcoming
    </Badge>
  );
}

export function AdminMatchCardMobile({
  match,
  onEnterResult,
  onBackfill,
}: {
  match: Match;
  onEnterResult: (match: Match) => void;
  onBackfill: (match: Match) => void;
}) {
  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="text-[10px] shrink-0">
              {stageLabel}
            </Badge>
            <span className="text-muted-foreground truncate">
              {formatCairoTime(match.utcDate)}
            </span>
          </div>
          <ScoringStatusBadge status={match.scoringStatus} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {match.homeTeam?.crest ? (
              <img
                src={match.homeTeam.crest}
                alt=""
                className="h-7 w-7 shrink-0 object-contain"
              />
            ) : null}
            <div className="font-semibold text-sm truncate">
              {match.homeTeam?.tla ?? "HOME"}
            </div>
          </div>

          <div className="shrink-0 px-2 text-center">
            {match.result?.homeScore90 !== undefined &&
            match.result?.awayScore90 !== undefined ? (
              <div className="font-bold text-base whitespace-nowrap tabular-nums">
                {match.result.homeScore90}–{match.result.awayScore90}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">vs</div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex items-center gap-2 justify-end text-right">
            <div className="font-semibold text-sm truncate">
              {match.awayTeam?.tla ?? "AWAY"}
            </div>
            {match.awayTeam?.crest ? (
              <img
                src={match.awayTeam.crest}
                alt=""
                className="h-7 w-7 shrink-0 object-contain"
              />
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={match.scored ? "outline" : "default"}
            onClick={() => onEnterResult(match)}
            className="w-full"
          >
            {match.scored ? "Edit result" : "Enter result"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBackfill(match)}
            className="w-full"
          >
            Backfill
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
