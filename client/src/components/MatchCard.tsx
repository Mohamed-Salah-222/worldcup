import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCairoTime, timeUntilKickoff } from "@/lib/format";
import { isMatchLocked } from "@/lib/matchLock";
import type { Match, Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";

type MatchCardProps = {
  match: Match;
  prediction?: Prediction;
  locked: boolean;
  onClick: () => void;
};

function winnerLabel(prediction: Prediction): string {
  if (prediction.winner === "DRAW") {
    return "Draw";
  }

  return prediction.winner === "HOME" ? "Home wins" : "Away wins";
}

function TeamBlock({ side, team }: { side: "left" | "right"; team?: Match["homeTeam"] }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3",
        side === "right" && "justify-end text-right",
      )}
    >
      {side === "left" && team?.crest ? (
        <img className="h-8 w-8 rounded-full object-contain" src={team.crest} alt="" />
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">
          {team?.tla || "---"}
        </p>
        <p className="truncate text-sm font-medium">{team?.name || "TBD"}</p>
      </div>
      {side === "right" && team?.crest ? (
        <img className="h-8 w-8 rounded-full object-contain" src={team.crest} alt="" />
      ) : null}
    </div>
  );
}

export function MatchCard({ match, prediction, locked, onClick }: MatchCardProps) {
  const resultBadge =
    match.result?.homeScore90 !== undefined &&
    match.result?.awayScore90 !== undefined
      ? `Final: ${match.result.homeScore90}-${match.result.awayScore90}`
      : null;

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <TeamBlock side="left" team={match.homeTeam} />
          <div className="flex w-20 shrink-0 justify-center">
            {resultBadge ? (
              <Badge variant="secondary">{resultBadge}</Badge>
            ) : isMatchLocked(match) ? (
              <Badge variant="secondary">Locked</Badge>
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">vs</span>
            )}
          </div>
          <TeamBlock side="right" team={match.awayTeam} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{formatCairoTime(match.utcDate)}</span>
          <span>{locked ? "Locked" : `in ${timeUntilKickoff(match.utcDate)}`}</span>
        </div>

        {prediction ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              Predicted: {prediction.homeScore}-{prediction.awayScore},{" "}
              {winnerLabel(prediction)}
            </Badge>
            {prediction.doublerApplied ? <Badge>Doubler</Badge> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
