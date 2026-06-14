import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCairoTime } from "@/lib/format";
import type {
  AdminMatchPredictionsResponse,
  FirstScorerTeam,
  Match,
  Prediction,
  PredictionWinner,
} from "@/lib/types";

type BackfillUser = {
  _id: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  hasPrediction: boolean;
  stageDoubler: { matchId: string; matchLabel: string } | null;
};

type UsersResponse = {
  users: BackfillUser[];
};

type BackfillResponse = {
  prediction: Prediction;
  scored: boolean;
  pointsAwarded?: number;
  userNewTotal?: number;
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
  return "Prediction could not be backfilled";
}

function userIdOf(prediction: Prediction): string {
  return typeof prediction.user === "string" ? prediction.user : prediction.user._id;
}

function defaultSubmittedAt(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function validatePrediction(
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

export function BackfillPredictionDialog({
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
  const [users, setUsers] = useState<BackfillUser[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [winner, setWinner] = useState<PredictionWinner>("HOME");
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);
  const [firstScorerTeam, setFirstScorerTeam] = useState<FirstScorerTeam>("HOME");
  const [playerOfTheMatchGuess, setPlayerOfTheMatchGuess] = useState("");
  const [doublerApplied, setDoublerApplied] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(defaultSubmittedAt());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!match || !open) {
      return;
    }

    setUsers([]);
    setPredictions([]);
    setSelectedUserId("");
    setWinner("HOME");
    setHomeScore(1);
    setAwayScore(0);
    setFirstScorerTeam("HOME");
    setPlayerOfTheMatchGuess("");
    setDoublerApplied(false);
    setSubmittedAt(defaultSubmittedAt());

    Promise.all([
      apiGet<UsersResponse>(`/api/admin/matches/${match._id}/users`),
      apiGet<AdminMatchPredictionsResponse>(
        `/api/admin/matches/${match._id}/predictions`,
      ),
    ])
      .then(([usersData, predictionsData]) => {
        setUsers(usersData.users);
        setPredictions(predictionsData.predictions);
      })
      .catch((error) => toast.error(getErrorMessage(error)));
  }, [match, open]);

  const selectedUser = users.find((u) => u._id === selectedUserId) ?? null;
  const existingPrediction = useMemo(
    () => predictions.find((p) => userIdOf(p) === selectedUserId),
    [predictions, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUserId) return;

    if (existingPrediction) {
      setWinner(existingPrediction.winner);
      setHomeScore(existingPrediction.homeScore);
      setAwayScore(existingPrediction.awayScore);
      setFirstScorerTeam(existingPrediction.firstScorerTeam);
      setPlayerOfTheMatchGuess(existingPrediction.playerOfTheMatchGuess);
      setDoublerApplied(existingPrediction.doublerApplied);
      setSubmittedAt(existingPrediction.submittedAt.slice(0, 16));
    } else {
      setWinner("HOME");
      setHomeScore(1);
      setAwayScore(0);
      setFirstScorerTeam("HOME");
      setPlayerOfTheMatchGuess("");
      setDoublerApplied(false);
      setSubmittedAt(defaultSubmittedAt());
    }
  }, [existingPrediction, selectedUserId]);

  useEffect(() => {
    if (homeScore === 0 && awayScore === 0) {
      setFirstScorerTeam("NONE");
    }
  }, [homeScore, awayScore]);

  if (!match) {
    return null;
  }

  const homeTla = match.homeTeam?.tla ?? "Home";
  const awayTla = match.awayTeam?.tla ?? "Away";
  const isDoublerStage = match.stage !== "THIRD_PLACE";
  const doublerOnAnotherMatch = Boolean(
    selectedUser?.stageDoubler &&
      selectedUser.stageDoubler.matchId !== match._id,
  );
  const validationError = validatePrediction(winner, homeScore, awayScore, firstScorerTeam);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!match || !selectedUser || validationError) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost<BackfillResponse>(
        "/api/admin/predictions/backfill",
        {
          userId: selectedUser._id,
          matchId: match._id,
          winner,
          homeScore,
          awayScore,
          firstScorerTeam,
          playerOfTheMatchGuess,
          doublerApplied,
          submittedAt: submittedAt ? new Date(submittedAt).toISOString() : undefined,
        },
      );

      toast.success(
        `Backfilled prediction for ${selectedUser.displayName}. ${
          response.scored
            ? `Awarded ${response.pointsAwarded ?? 0} points (new total ${response.userNewTotal ?? 0}).`
            : "Will be scored when admin enters the result."
        }`,
      );
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
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md sm:max-w-lg p-0 gap-0 max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <DialogTitle>
            Backfill: {match.homeTeam?.name ?? "Home"} vs{" "}
            {match.awayTeam?.name ?? "Away"}
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {formatCairoTime(match.utcDate)} · {match.stage}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 flex-1">
          <form id="backfill-form" className="space-y-4" onSubmit={handleSubmit}>
            {/* Warning banners */}
            <div className="rounded-md border bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 px-3 py-2 text-xs sm:text-sm text-amber-800 dark:text-amber-400">
              ⚠️ Backfilling on behalf of another user. Logged in audit trail.
            </div>
            {match.scored ? (
              <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 px-3 py-2 text-xs sm:text-sm text-emerald-800 dark:text-emerald-400">
                This match is already scored. Submitting will award points immediately.
              </div>
            ) : null}

            {/* User select */}
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-10 text-base">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.displayName} @{u.username}
                      {u.hasPrediction ? " (already predicted)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submitted at */}
            <div className="space-y-1.5">
              <Label htmlFor="submittedAt" className="text-xs text-muted-foreground">
                Submitted at (optional)
              </Label>
              <Input
                id="submittedAt"
                type="datetime-local"
                className="h-10 text-base"
                value={submittedAt}
                disabled={!selectedUser}
                onChange={(e) => setSubmittedAt(e.target.value)}
              />
            </div>

            {/* Winner */}
            <div className="space-y-1.5">
              <Label>Winner</Label>
              <Select
                value={winner}
                onValueChange={(v) => setWinner(v as PredictionWinner)}
                disabled={!selectedUser}
              >
                <SelectTrigger className="w-full h-10 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOME">{homeTla} wins</SelectItem>
                  <SelectItem value="DRAW">Draw</SelectItem>
                  <SelectItem value="AWAY">{awayTla} wins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Score inputs */}
            <div className="space-y-1.5">
              <Label>Score</Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  inputMode="numeric"
                  className="h-10 text-base text-center"
                  value={homeScore}
                  disabled={!selectedUser}
                  onChange={(e) => setHomeScore(Number(e.target.value))}
                  aria-label={`${homeTla} score`}
                />
                <span className="text-muted-foreground select-none">–</span>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  inputMode="numeric"
                  className="h-10 text-base text-center"
                  value={awayScore}
                  disabled={!selectedUser}
                  onChange={(e) => setAwayScore(Number(e.target.value))}
                  aria-label={`${awayTla} score`}
                />
              </div>
              {validationError ? (
                <p className="text-sm text-destructive">{validationError}</p>
              ) : null}
            </div>

            {/* First scorer */}
            <div className="space-y-1.5">
              <Label>First scorer</Label>
              <RadioGroup
                value={firstScorerTeam}
                onValueChange={(v) => setFirstScorerTeam(v as FirstScorerTeam)}
                disabled={!selectedUser || (homeScore === 0 && awayScore === 0)}
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
            </div>

            {/* POTM */}
            <div className="space-y-1.5">
              <Label htmlFor="backfillPotm">POTM guess</Label>
              <Input
                id="backfillPotm"
                className="h-10 text-base"
                value={playerOfTheMatchGuess}
                disabled={!selectedUser}
                onChange={(e) => setPlayerOfTheMatchGuess(e.target.value)}
                placeholder="Name of any player from either team"
              />
            </div>

            {/* Doubler */}
            {isDoublerStage ? (
              <div
                className="flex items-start gap-3 rounded-md border p-3"
                title={
                  doublerOnAnotherMatch
                    ? `Already used on ${selectedUser?.stageDoubler?.matchLabel}`
                    : undefined
                }
              >
                <Checkbox
                  id="backfillDoubler"
                  checked={doublerApplied}
                  disabled={!selectedUser || doublerOnAnotherMatch}
                  onCheckedChange={(checked) => setDoublerApplied(Boolean(checked))}
                />
                <div className="space-y-1">
                  <Label htmlFor="backfillDoubler">
                    Apply {DOUBLER_LABELS[match.stage] ?? match.stage} doubler
                  </Label>
                  {doublerOnAnotherMatch ? (
                    <p className="text-sm text-muted-foreground">
                      Already used on {selectedUser?.stageDoubler?.matchLabel}.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
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
            form="backfill-form"
            className="w-full sm:w-auto sm:ml-auto"
            disabled={!selectedUser || submitting || Boolean(validationError)}
          >
            {submitting ? "Backfilling..." : "Backfill prediction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
