import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MatchPredictionsRow } from "@/components/MatchPredictionsRow";
import { formatCairoTime, timeUntilKickoff } from "@/lib/format";
import { isMatchLocked } from "@/lib/matchLock";
import type { Match, Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";

type MatchCardProps = {
  match: Match;
  prediction?: Prediction;
  locked: boolean;
  predictionsRefreshTrigger: number;
  onClick: () => void;
};

function winnerLabel(prediction: Prediction): string {
  if (prediction.winner === "DRAW") {
    return "Draw";
  }

  return prediction.winner === "HOME" ? "Home wins" : "Away wins";
}

function stageLabel(match: Match): string {
  return `${match.stage}${match.group ? ` • ${match.group}` : ""}`;
}

function TeamBlock({ side, team }: { side: "left" | "right"; team?: Match["homeTeam"] }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 sm:gap-3",
        side === "right" && "justify-end text-right",
      )}
    >
      {side === "left" && team?.crest ? (
        <img className="h-8 w-8 shrink-0 rounded-full object-contain sm:h-10 sm:w-10" src={team.crest} alt="" />
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold sm:text-base">
          {team?.tla || "---"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{team?.name || "TBD"}</p>
      </div>
      {side === "right" && team?.crest ? (
        <img className="h-8 w-8 shrink-0 rounded-full object-contain sm:h-10 sm:w-10" src={team.crest} alt="" />
      ) : null}
    </div>
  );
}

export function MatchCard({
  match,
  prediction,
  locked,
  predictionsRefreshTrigger,
  onClick,
}: MatchCardProps) {
  const resultBadge =
    match.result?.homeScore90 !== undefined &&
    match.result?.awayScore90 !== undefined
      ? `${match.result.homeScore90} – ${match.result.awayScore90}`
      : null;
  const lockedOrCountdown = locked ? "Locked" : `in ${timeUntilKickoff(match.utcDate)}`;

  return (
    <Card
      className="overflow-hidden transition-colors hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
          <span className="truncate">{stageLabel(match)}</span>
          <span className="shrink-0">{lockedOrCountdown}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <TeamBlock side="left" team={match.homeTeam} />
          <div className="shrink-0 px-2 text-center">
            {resultBadge ? (
              <div className="whitespace-nowrap text-base font-semibold sm:text-lg">
                {resultBadge}
              </div>
            ) : isMatchLocked(match) ? (
              <Badge variant="secondary">Locked</Badge>
            ) : (
              <div className="text-xs text-muted-foreground">vs</div>
            )}
          </div>
          <TeamBlock side="right" team={match.awayTeam} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
          <span>{formatCairoTime(match.utcDate)}</span>
          {match.result?.homeScore90 !== undefined &&
          match.result?.awayScore90 !== undefined ? (
            <Badge variant="outline">Final: {match.result.homeScore90}-{match.result.awayScore90}</Badge>
          ) : null}
        </div>

        {prediction ? (
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <Badge variant="secondary">
              Predicted: {prediction.homeScore}-{prediction.awayScore},{" "}
              {winnerLabel(prediction)}
            </Badge>
            {prediction.doublerApplied ? <Badge variant="default">×2</Badge> : null}
          </div>
        ) : null}

        <Button
          className="w-full sm:w-auto"
          variant={locked ? "outline" : "default"}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          {locked
            ? prediction
              ? "View prediction"
              : "Locked"
            : prediction
              ? "Edit prediction"
              : "Predict"}
        </Button>

        <MatchPredictionsRow
          match={match}
          refreshTrigger={predictionsRefreshTrigger}
        />
      </CardContent>
    </Card>
  );
}
