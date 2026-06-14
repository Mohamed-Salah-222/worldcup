import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiPost } from "@/lib/api";
import { formatCairoTime } from "@/lib/format";
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
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="text-base font-semibold sm:text-lg">
            Submit prediction
          </DialogTitle>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {match.homeTeam?.tla || "Home"}
            </span>
            <span>vs</span>
            <span className="font-medium text-foreground">
              {match.awayTeam?.tla || "Away"}
            </span>
            <span>•</span>
            <span>{formatCairoTime(match.utcDate)}</span>
          </div>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {locked ? (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                Predictions locked — kickoff has passed.
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Winner</Label>
              <Select
                value={winner}
                onValueChange={(value) => setWinner(value as PredictionWinner)}
                disabled={locked}
              >
                <SelectTrigger className="h-10 w-full text-base">
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

            <div className="space-y-1.5">
              <Label>Score</Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  className="h-10 text-center text-base"
                  value={homeScore}
                  disabled={locked}
                  onChange={(event) => setHomeScore(Number(event.target.value))}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  className="h-10 text-center text-base"
                  value={awayScore}
                  disabled={locked}
                  onChange={(event) => setAwayScore(Number(event.target.value))}
                />
              </div>
              {validationError ? (
                <p className="text-sm text-destructive">{validationError}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>First scorer team</Label>
              <RadioGroup
                value={firstScorerTeam}
                onValueChange={(value) => setFirstScorerTeam(value as FirstScorerTeam)}
                disabled={locked || (homeScore === 0 && awayScore === 0)}
                className="flex flex-col gap-2 sm:flex-row sm:gap-4"
              >
                {[
                  { value: "HOME", label: match.homeTeam?.tla || "Home" },
                  { value: "AWAY", label: match.awayTeam?.tla || "Away" },
                  { value: "NONE", label: "No goals (0–0)" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 has-[[data-state=checked]]:border-primary sm:border-0 sm:p-0"
                  >
                    <RadioGroupItem value={option.value} />
                    <span>{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="potm">Player of the match guess</Label>
              <Input
                id="potm"
                className="h-10 text-base"
                placeholder="Player name (any team)"
                value={playerOfTheMatchGuess}
                disabled={locked}
                onChange={(event) => setPlayerOfTheMatchGuess(event.target.value)}
                required
              />
            </div>

            {isDoublerStage ? (
              <Label
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary"
                title={
                  doublerOnAnotherMatch && doublerStatus?.matchLabel
                    ? `Already used on ${doublerStatus.matchLabel}`
                    : undefined
                }
              >
                <Checkbox
                  id="doubler"
                  className="mt-0.5"
                  checked={doublerApplied}
                  disabled={locked || doublerOnAnotherMatch}
                  onCheckedChange={(checked) => setDoublerApplied(Boolean(checked))}
                />
                <div className="text-sm">
                  <div className="font-medium">
                    Apply {DOUBLER_LABELS[match.stage]} Doubler (×2)
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    One per stage. Doubles all points earned on this match.
                  </div>
                  {doublerOnAnotherMatch ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Already used on {doublerStatus?.matchLabel}.
                    </div>
                  ) : null}
                </div>
              </Label>
            ) : null}
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
            {!locked ? (
              <Button
                className="w-full sm:w-auto"
                type="submit"
                disabled={submitting || Boolean(validationError)}
              >
                {submitting ? "Saving..." : "Save prediction"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
