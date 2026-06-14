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
  const [firstScorerTeam, setFirstScorerTeam] = useState<FirstScorerTeam>("NONE");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPotm, setSelectedPotm] = useState<string | null>(null);
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
    setSelectedPotm(match.result?.playerOfTheMatch ?? null);
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

  const potmOptions = useMemo(() => dedupePotmGuesses(predictions), [predictions]);

  if (!match) {
    return null;
  }

  const homeTla = match.homeTeam?.tla ?? "Home";
  const awayTla = match.awayTeam?.tla ?? "Away";

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
      typedPotm.trim() || (selectedPotm != null ? selectedPotm.trim() : null);

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
    if (!match) return;
    if (match.scored) {
      setConfirmOpen(true);
      return;
    }
    void submitResult();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md sm:max-w-lg p-0 gap-0 max-h-[90dvh] overflow-hidden flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
            <DialogTitle>
              {match.homeTeam?.name ?? "Home"} vs {match.awayTeam?.name ?? "Away"}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {formatCairoTime(match.utcDate)}
            </p>
          </DialogHeader>

          <div className="overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 flex-1">
            <form id="enter-result-form" className="space-y-5" onSubmit={handleSubmit}>
              {match.scored ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-3 py-2 text-xs sm:text-sm text-amber-800 dark:text-amber-400">
                  Editing will recalculate points for all predictions.
                </div>
              ) : null}

              {/* Score inputs */}
              <div className="space-y-2">
                <Label>Score (90 min)</Label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    inputMode="numeric"
                    className="h-10 text-base text-center"
                    value={homeScore90}
                    onChange={(e) => setHomeScore90(Number(e.target.value))}
                    aria-label={`${homeTla} score`}
                  />
                  <span className="text-muted-foreground select-none">–</span>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    inputMode="numeric"
                    className="h-10 text-base text-center"
                    value={awayScore90}
                    onChange={(e) => setAwayScore90(Number(e.target.value))}
                    aria-label={`${awayTla} score`}
                  />
                </div>
              </div>

              {/* First scorer */}
              <div className="space-y-2">
                <Label>First scorer team</Label>
                <RadioGroup
                  value={firstScorerTeam}
                  onValueChange={(v) => setFirstScorerTeam(v as FirstScorerTeam)}
                  disabled={homeScore90 === 0 && awayScore90 === 0}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-3"
                >
                  {[
                    { value: "HOME", label: homeTla },
                    { value: "AWAY", label: awayTla },
                    { value: "NONE", label: "No goals" },
                  ].map((opt) => (
                    <Label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2.5 sm:flex-1 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value={opt.value} />
                      {opt.label}
                    </Label>
                  ))}
                </RadioGroup>
                {validationError ? (
                  <p className="text-sm text-destructive">{validationError}</p>
                ) : null}
              </div>

              <Separator />

              {/* POTM picker */}
              <div className="space-y-2">
                <Label>POTM</Label>
                <div className="rounded-md border max-h-56 overflow-y-auto divide-y">
                  <button
                    type="button"
                    onClick={() => setSelectedPotm(null)}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors ${selectedPotm === null ? "bg-muted font-medium" : ""}`}
                  >
                    No one got it
                  </button>
                  {potmOptions.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setSelectedPotm(g.label)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors ${selectedPotm === g.label ? "bg-muted font-medium" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{g.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {g.count} guess{g.count === 1 ? "" : "es"}
                        </span>
                      </div>
                    </button>
                  ))}
                  {potmOptions.length === 0 && (
                    <div className="px-3 py-3 text-xs text-muted-foreground">
                      No POTM guesses submitted.
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="potm-custom" className="text-xs text-muted-foreground">
                    Or enter manually
                  </Label>
                  <Input
                    id="potm-custom"
                    placeholder="Player name"
                    className="h-10 text-base"
                    value={typedPotm}
                    onChange={(e) => setTypedPotm(e.target.value)}
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="px-4 sm:px-6 py-3 border-t shrink-0 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="enter-result-form"
              className="w-full sm:w-auto sm:ml-auto"
              disabled={submitting || Boolean(validationError)}
            >
              {submitting ? "Scoring..." : match.scored ? "Re-score" : "Save result"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-sm sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Recalculate predictions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will recalculate all predictions and update user totals. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto"
              onClick={() => void submitResult()}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
