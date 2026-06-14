import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { formatCairoTime } from "@/lib/format";
import type { Match, PublicMatchPrediction } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function winnerLabel(prediction: PublicMatchPrediction, match: Match): string {
  if (prediction.winner === "DRAW") {
    return "Draw";
  }

  return prediction.winner === "HOME"
    ? `${match.homeTeam?.tla || "Home"} wins`
    : `${match.awayTeam?.tla || "Away"} wins`;
}

function firstScorerLabel(
  team: PublicMatchPrediction["firstScorerTeam"],
  match: Match,
): string {
  if (team === "NONE") {
    return "No goals";
  }

  return team === "HOME"
    ? match.homeTeam?.tla || "Home"
    : match.awayTeam?.tla || "Away";
}

function Row({
  label,
  hit,
  value,
  bold,
}: {
  label: string;
  hit?: boolean;
  value: string | number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {hit !== undefined ? (
          hit ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <X className="h-3.5 w-3.5 text-muted-foreground/60" />
          )
        ) : null}
        <span className={cn(bold && "font-medium text-foreground")}>{label}</span>
      </span>
      <span className={cn("tabular-nums", bold && "font-semibold")}>
        {value}
      </span>
    </div>
  );
}

export function UserPredictionViewDialog({
  prediction,
  match,
  open,
  onOpenChange,
}: {
  prediction: PublicMatchPrediction | null;
  match: Match;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!prediction) {
    return null;
  }

  const subtotal =
    prediction.pointsBreakdown.winner +
    prediction.pointsBreakdown.score +
    prediction.pointsBreakdown.firstScorer +
    prediction.pointsBreakdown.potm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback>{initials(prediction.user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold sm:text-lg">
                {prediction.user.displayName}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                @{prediction.user.username}
                {prediction.user.role === "admin" ? " • admin" : ""}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {match.homeTeam?.tla || "HOME"}
            </span>
            <span>vs</span>
            <span className="font-medium text-foreground">
              {match.awayTeam?.tla || "AWAY"}
            </span>
            <span>•</span>
            <span>{formatCairoTime(match.utcDate)}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Their prediction</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Winner</dt>
              <dd className="font-medium">{winnerLabel(prediction, match)}</dd>

              <dt className="text-muted-foreground">Score</dt>
              <dd className="font-medium tabular-nums">
                {prediction.homeScore} – {prediction.awayScore}
              </dd>

              <dt className="text-muted-foreground">First scorer</dt>
              <dd className="font-medium">
                {firstScorerLabel(prediction.firstScorerTeam, match)}
              </dd>

              <dt className="text-muted-foreground">POTM guess</dt>
              <dd className="break-words font-medium">
                {prediction.playerOfTheMatchGuess}
              </dd>

              <dt className="text-muted-foreground">Doubler</dt>
              <dd className="font-medium">
                {prediction.doublerApplied ? <Badge>×2 Applied</Badge> : "—"}
              </dd>
            </dl>
          </section>

          {prediction.scored ? (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Result</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Score</dt>
                  <dd className="font-medium tabular-nums">
                    {match.result?.homeScore90} – {match.result?.awayScore90}
                  </dd>

                  <dt className="text-muted-foreground">First scorer</dt>
                  <dd className="font-medium">
                    {match.result?.firstScorerTeam
                      ? firstScorerLabel(match.result.firstScorerTeam, match)
                      : "Not entered"}
                  </dd>

                  <dt className="text-muted-foreground">POTM</dt>
                  <dd className="break-words font-medium">
                    {match.result?.playerOfTheMatch || "No one got it"}
                  </dd>
                </dl>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Points breakdown</h3>
                <dl className="space-y-1 text-sm">
                  <Row
                    label="Winner"
                    hit={prediction.pointsBreakdown.winner > 0}
                    value={prediction.pointsBreakdown.winner}
                  />
                  <Row
                    label="Score"
                    hit={prediction.pointsBreakdown.score > 0}
                    value={prediction.pointsBreakdown.score}
                  />
                  <Row
                    label="First scorer"
                    hit={prediction.pointsBreakdown.firstScorer > 0}
                    value={prediction.pointsBreakdown.firstScorer}
                  />
                  <Row
                    label="POTM"
                    hit={prediction.pointsBreakdown.potm > 0}
                    value={prediction.pointsBreakdown.potm}
                  />
                  <div className="my-1 h-px bg-border" />
                  <Row label="Subtotal" value={subtotal} bold />
                  {prediction.pointsBreakdown.doubled ? (
                    <Row label="Doubler ×2" value={`→ ${prediction.pointsAwarded}`} bold />
                  ) : null}
                </dl>
                <div className="flex items-baseline justify-between rounded-md bg-muted px-3 py-2">
                  <span className="text-sm font-medium">Total points</span>
                  <span className="text-lg font-bold tabular-nums">
                    {prediction.pointsAwarded}
                  </span>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Awaiting match result.
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Submitted {formatCairoTime(prediction.submittedAt)}
            {prediction.editCount > 0
              ? ` • Edited ${prediction.editCount} times`
              : ""}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
