import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCairoTime } from "@/lib/format";
import { isMatchLocked } from "@/lib/matchLock";
import type { Match, Prediction } from "@/lib/types";

function getMatch(prediction: Prediction): Match {
  return prediction.match as Match;
}

function statusLabel(match: Match): { label: string; className: string } {
  if (match.scored) {
    return { label: "Scored", className: "bg-emerald-100 text-emerald-700" };
  }

  if (isMatchLocked(match)) {
    return {
      label: "Locked, awaiting result",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return { label: "Pending", className: "bg-slate-100 text-slate-700" };
}

function winnerText(winner: Prediction["winner"]): string {
  if (winner === "DRAW") {
    return "Draw";
  }

  return winner === "HOME" ? "Home" : "Away";
}

function BreakdownLine({
  label,
  points,
}: {
  label: string;
  points: number;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}: {points > 0 ? "yes" : "no"}</span>
      <span>{points > 0 ? `+${points}` : "0"}</span>
    </div>
  );
}

export function PredictionResultCard({
  prediction,
}: {
  prediction: Prediction;
}) {
  const match = getMatch(prediction);
  const status = statusLabel(match);
  const subtotal =
    prediction.pointsBreakdown.winner +
    prediction.pointsBreakdown.score +
    prediction.pointsBreakdown.firstScorer +
    prediction.pointsBreakdown.potm;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              {match.homeTeam?.crest ? (
                <img className="h-6 w-6 object-contain" src={match.homeTeam.crest} alt="" />
              ) : null}
              <span>{match.homeTeam?.tla || "HOME"}</span>
              <span className="text-muted-foreground">
                {match.result?.homeScore90 !== undefined &&
                match.result?.awayScore90 !== undefined
                  ? `${match.result.homeScore90}-${match.result.awayScore90}`
                  : "vs"}
              </span>
              <span>{match.awayTeam?.tla || "AWAY"}</span>
              {match.awayTeam?.crest ? (
                <img className="h-6 w-6 object-contain" src={match.awayTeam.crest} alt="" />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCairoTime(match.utcDate)}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="outline">{match.stage}</Badge>
            <Badge className={status.className}>{status.label}</Badge>
            {prediction.editCount ? (
              <Badge variant="secondary">Edited {prediction.editCount} times</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="rounded-md bg-muted p-4 text-sm">
          <h3 className="mb-2 font-medium">Your prediction</h3>
          <div className="grid gap-1 text-muted-foreground">
            <p>Winner: {winnerText(prediction.winner)}</p>
            <p>Score: {prediction.homeScore}-{prediction.awayScore}</p>
            <p>First scorer: {prediction.firstScorerTeam}</p>
            <p>POTM: {prediction.playerOfTheMatchGuess}</p>
            {prediction.doublerApplied ? <p>Doubler applied</p> : null}
          </div>
        </section>

        {match.scored ? (
          <section className="rounded-md border p-4">
            <h3 className="mb-2 font-medium">Result</h3>
            <div className="mb-3 grid gap-1 text-sm text-muted-foreground">
              <p>
                Actual score: {match.result?.homeScore90}-{match.result?.awayScore90}
              </p>
              <p>First scorer: {match.result?.firstScorerTeam}</p>
              <p>POTM: {match.result?.playerOfTheMatch || "No one got it"}</p>
            </div>
            <div className="space-y-1">
              <BreakdownLine label="Winner" points={prediction.pointsBreakdown.winner} />
              <BreakdownLine label="Score" points={prediction.pointsBreakdown.score} />
              <BreakdownLine
                label="First scorer"
                points={prediction.pointsBreakdown.firstScorer}
              />
              <BreakdownLine label="POTM" points={prediction.pointsBreakdown.potm} />
              <div className="flex justify-between border-t pt-2 text-sm font-medium">
                <span>Subtotal</span>
                <span>{subtotal}</span>
              </div>
              {prediction.pointsBreakdown.doubled ? (
                <div className="flex justify-between text-sm font-medium">
                  <span>Doubler: x2</span>
                  <span>{prediction.pointsAwarded}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-semibold">
                <span>Points earned</span>
                <span>{prediction.pointsAwarded}</span>
              </div>
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
