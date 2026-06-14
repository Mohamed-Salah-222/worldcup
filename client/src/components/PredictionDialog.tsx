import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiPost } from "@/lib/api";
import type {
  DoublerStatus,
  FirstScorerTeam,
  Match,
  Prediction,
  PredictionWinner,
} from "@/lib/types";

type PredictionDialogProps = {
  match: Match | null;
  prediction?: Prediction;
  locked: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doublers: DoublerStatus | null;
  onSaved: () => Promise<void>;
};

const DOUBLER_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-Finals",
  SEMI_FINALS: "Semi-Finals",
  FINAL: "Final",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Prediction could not be saved";
}

function validateForm(
  winner: PredictionWinner,
  homeScore: number,
  awayScore: number,
  firstScorerTeam: FirstScorerTeam,
): string | null {
  if (winner === "DRAW" && homeScore !== awayScore) {
    return "Draw predictions need equal scores.";
  }

  if (winner === "HOME" && homeScore <= awayScore) {
    return "Home win needs the home score to be higher.";
  }

  if (winner === "AWAY" && awayScore <= homeScore) {
    return "Away win needs the away score to be higher.";
  }

  if (homeScore === 0 && awayScore === 0 && firstScorerTeam !== "NONE") {
    return "A 0-0 prediction must use No goals.";
  }

  if ((homeScore > 0 || awayScore > 0) && firstScorerTeam === "NONE") {
    return "Choose Home or Away as first scorer when goals are predicted.";
  }

  return null;
}

export function PredictionDialog({
  match,
  prediction,
  locked,
  open,
  onOpenChange,
  doublers,
  onSaved,
}: PredictionDialogProps) {
  const [winner, setWinner] = useState<PredictionWinner>("HOME");
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);
  const [firstScorerTeam, setFirstScorerTeam] =
    useState<FirstScorerTeam>("HOME");
  const [playerOfTheMatchGuess, setPlayerOfTheMatchGuess] = useState("");
  const [doublerApplied, setDoublerApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!match) {
      return;
    }

    setWinner(prediction?.winner ?? "HOME");
    setHomeScore(prediction?.homeScore ?? 1);
    setAwayScore(prediction?.awayScore ?? 0);
    setFirstScorerTeam(prediction?.firstScorerTeam ?? "HOME");
    setPlayerOfTheMatchGuess(prediction?.playerOfTheMatchGuess ?? "");
    setDoublerApplied(prediction?.doublerApplied ?? false);
  }, [match, prediction, open]);

  useEffect(() => {
    if (homeScore === 0 && awayScore === 0) {
      setFirstScorerTeam("NONE");
    }
  }, [homeScore, awayScore]);

  const isDoublerStage = match?.stage && match.stage !== "THIRD_PLACE";
  const doublerStatus =
    match && match.stage !== "THIRD_PLACE" ? doublers?.[match.stage] : null;
  const doublerOnAnotherMatch =
    Boolean(doublerStatus?.used && doublerStatus.matchId !== match?._id);
  const validationError = useMemo(
    () => validateForm(winner, homeScore, awayScore, firstScorerTeam),
    [winner, homeScore, awayScore, firstScorerTeam],
  );

  if (!match) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!match || validationError) {
      return;
    }

    setSubmitting(true);

    try {
      await apiPost<{ prediction: Prediction }>("/api/predictions", {
        matchId: match._id,
        winner,
        homeScore,
        awayScore,
        firstScorerTeam,
        playerOfTheMatchGuess,
        doublerApplied,
      });
      toast.success("Prediction saved");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {match.homeTeam?.name || "Home"} vs {match.awayTeam?.name || "Away"}
          </DialogTitle>
          <DialogDescription>
            Submit or review your prediction for this match.
          </DialogDescription>
        </DialogHeader>

        {locked ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Predictions locked — kickoff has passed.
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Winner</Label>
            <Select
              value={winner}
              onValueChange={(value) => setWinner(value as PredictionWinner)}
              disabled={locked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOME">
                  {match.homeTeam?.tla || "Home"} wins
                </SelectItem>
                <SelectItem value="DRAW">Draw</SelectItem>
                <SelectItem value="AWAY">
                  {match.awayTeam?.tla || "Away"} wins
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Score</Label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Input
                type="number"
                min={0}
                max={30}
                value={homeScore}
                disabled={locked}
                onChange={(event) => setHomeScore(Number(event.target.value))}
              />
              <span className="text-sm text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                max={30}
                value={awayScore}
                disabled={locked}
                onChange={(event) => setAwayScore(Number(event.target.value))}
              />
            </div>
            {validationError ? (
              <p className="text-sm text-destructive">{validationError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>First scorer team</Label>
            <Select
              value={firstScorerTeam}
              onValueChange={(value) => setFirstScorerTeam(value as FirstScorerTeam)}
              disabled={locked || (homeScore === 0 && awayScore === 0)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOME">{match.homeTeam?.tla || "Home"}</SelectItem>
                <SelectItem value="AWAY">{match.awayTeam?.tla || "Away"}</SelectItem>
                <SelectItem value="NONE">No goals (0-0)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="potm">Player of the match guess</Label>
            <Input
              id="potm"
              placeholder="Name of any player from either team"
              value={playerOfTheMatchGuess}
              disabled={locked}
              onChange={(event) => setPlayerOfTheMatchGuess(event.target.value)}
              required
            />
          </div>

          {isDoublerStage ? (
            <div
              className="flex items-start gap-3 rounded-md border p-3"
              title={
                doublerOnAnotherMatch && doublerStatus?.matchLabel
                  ? `Already used on ${doublerStatus.matchLabel}`
                  : undefined
              }
            >
              <Checkbox
                id="doubler"
                checked={doublerApplied}
                disabled={locked || doublerOnAnotherMatch}
                onCheckedChange={(checked) => setDoublerApplied(Boolean(checked))}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="doubler">
                  Apply {DOUBLER_LABELS[match.stage]} doubler
                </Label>
                {doublerOnAnotherMatch ? (
                  <p className="text-sm text-muted-foreground">
                    Already used on {doublerStatus?.matchLabel}.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {!locked ? (
            <Button
              className="w-full"
              type="submit"
              disabled={submitting || Boolean(validationError)}
            >
              {submitting ? "Saving..." : "Save prediction"}
            </Button>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
