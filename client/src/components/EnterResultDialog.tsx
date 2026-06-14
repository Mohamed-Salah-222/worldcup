import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCairoTime } from "@/lib/format";
import type {
  AdminMatchPredictionsResponse,
  FirstScorerTeam,
  Match,
  Prediction,
  ScoreSummary,
} from "@/lib/types";

type PotmOption = {
  key: string;
  label: string;
  count: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Result could not be saved";
}

function dedupePotmGuesses(predictions: Prediction[]): PotmOption[] {
  const map = new Map<string, PotmOption>();

  for (const prediction of predictions) {
    const label = prediction.playerOfTheMatchGuess.trim();
    const key = label.toLowerCase();

    if (!label) {
      continue;
    }

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { key, label, count: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function EnterResultDialog({
  match,
  open,
  onOpenChange,
  onSaved,
}: {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [homeScore90, setHomeScore90] = useState(0);
  const [awayScore90, setAwayScore90] = useState(0);
  const [firstScorerTeam, setFirstScorerTeam] =
    useState<FirstScorerTeam>("NONE");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPotm, setSelectedPotm] = useState("__NONE__");
  const [typedPotm, setTypedPotm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!match || !open) {
      return;
    }

    setHomeScore90(match.result?.homeScore90 ?? 0);
    setAwayScore90(match.result?.awayScore90 ?? 0);
    setFirstScorerTeam(match.result?.firstScorerTeam ?? "NONE");
    setSelectedPotm(match.result?.playerOfTheMatch ?? "__NONE__");
    setTypedPotm("");

    apiGet<AdminMatchPredictionsResponse>(
      `/api/admin/matches/${match._id}/predictions`,
    )
      .then((data) => setPredictions(data.predictions))
      .catch((error) => toast.error(getErrorMessage(error)));
  }, [match, open]);

  useEffect(() => {
    if (homeScore90 === 0 && awayScore90 === 0) {
      setFirstScorerTeam("NONE");
    }
  }, [homeScore90, awayScore90]);

  const potmOptions = useMemo(
    () => dedupePotmGuesses(predictions),
    [predictions],
  );

  if (!match) {
    return null;
  }

  const validationError =
    homeScore90 === 0 && awayScore90 === 0 && firstScorerTeam !== "NONE"
      ? "A 0-0 result must use No goals."
      : (homeScore90 > 0 || awayScore90 > 0) && firstScorerTeam === "NONE"
        ? "Choose Home or Away as first scorer when goals were scored."
        : null;

  async function submitResult() {
    if (!match || validationError) {
      return;
    }

    const playerOfTheMatch =
      typedPotm.trim() ||
      (selectedPotm === "__NONE__" ? null : selectedPotm.trim());

    setSubmitting(true);
    try {
      const summary = await apiPost<ScoreSummary>(
        `/api/admin/matches/${match._id}/result`,
        {
          homeScore90,
          awayScore90,
          firstScorerTeam,
          playerOfTheMatch,
        },
      );
      toast.success(
        `Scored. ${summary.scored} predictions, ${summary.totalPointsAwarded} points awarded across ${summary.perUser.length} users.`,
      );
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentMatch = match;

    if (!currentMatch) {
      return;
    }

    if (currentMatch.scored) {
      setConfirmOpen(true);
      return;
    }

    void submitResult();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {match.homeTeam?.name || "Home"} vs {match.awayTeam?.name || "Away"}
            </DialogTitle>
            <DialogDescription>{formatCairoTime(match.utcDate)}</DialogDescription>
          </DialogHeader>

          {match.scored ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Editing will recalculate points for all predictions.
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="homeScore90">Home score</Label>
                <Input
                  id="homeScore90"
                  type="number"
                  min={0}
                  max={30}
                  value={homeScore90}
                  onChange={(event) => setHomeScore90(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awayScore90">Away score</Label>
                <Input
                  id="awayScore90"
                  type="number"
                  min={0}
                  max={30}
                  value={awayScore90}
                  onChange={(event) => setAwayScore90(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>First scorer team</Label>
              <RadioGroup
                value={firstScorerTeam}
                onValueChange={(value) => setFirstScorerTeam(value as FirstScorerTeam)}
                className="grid grid-cols-3 gap-3"
                disabled={homeScore90 === 0 && awayScore90 === 0}
              >
                {[
                  { value: "HOME", label: match.homeTeam?.tla || "Home" },
                  { value: "AWAY", label: match.awayTeam?.tla || "Away" },
                  { value: "NONE", label: "No goals" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    className="flex items-center gap-2 rounded-md border p-3"
                  >
                    <RadioGroupItem value={option.value} />
                    {option.label}
                  </Label>
                ))}
              </RadioGroup>
              {validationError ? (
                <p className="text-sm text-destructive">{validationError}</p>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>POTM picker</Label>
              <RadioGroup value={selectedPotm} onValueChange={setSelectedPotm}>
                <Label className="flex items-center justify-between rounded-md border p-3">
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value="__NONE__" />
                    No one got it
                  </span>
                </Label>
                {potmOptions.map((option) => (
                  <Label
                    key={option.key}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <span className="flex items-center gap-2">
                      <RadioGroupItem value={option.label} />
                      {option.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {option.count}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
              <div className="space-y-2">
                <Label htmlFor="typedPotm">Or enter the actual POTM</Label>
                <Input
                  id="typedPotm"
                  value={typedPotm}
                  onChange={(event) => setTypedPotm(event.target.value)}
                  placeholder="Player name"
                />
              </div>
            </div>

            <Button
              className="w-full"
              type="submit"
              disabled={submitting || Boolean(validationError)}
            >
              {submitting ? "Scoring..." : match.scored ? "Edit result" : "Enter result"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalculate predictions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will recalculate all predictions and update user totals.
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitResult()}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
