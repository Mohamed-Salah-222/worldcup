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
  const [firstScorerTeam, setFirstScorerTeam] =
    useState<FirstScorerTeam>("HOME");
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

  const selectedUser = users.find((user) => user._id === selectedUserId) ?? null;
  const existingPrediction = useMemo(
    () => predictions.find((prediction) => userIdOf(prediction) === selectedUserId),
    [predictions, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

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

  const isDoublerStage = match.stage !== "THIRD_PLACE";
  const doublerOnAnotherMatch =
    Boolean(
      selectedUser?.stageDoubler &&
        selectedUser.stageDoubler.matchId !== match._id,
    );
  const validationError = validatePrediction(
    winner,
    homeScore,
    awayScore,
    firstScorerTeam,
  );

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
            ? `Awarded ${response.pointsAwarded ?? 0} points (new total ${
                response.userNewTotal ?? 0
              }).`
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Backfill: {match.homeTeam?.name || "Home"} vs{" "}
            {match.awayTeam?.name || "Away"}
          </DialogTitle>
          <DialogDescription>
            {formatCairoTime(match.utcDate)} | {match.stage}
          </DialogDescription>
        </DialogHeader>

        {selectedUser ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Backfilling on behalf of {selectedUser.displayName}. This bypasses
            the kickoff lock and is logged in the audit trail.
          </div>
        ) : null}

        {match.scored ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
            This match is already scored. Submitting will award points immediately.
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.displayName} @{user.username}
                    {user.hasPrediction ? " (already predicted)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Winner</Label>
            <Select
              value={winner}
              onValueChange={(value) => setWinner(value as PredictionWinner)}
              disabled={!selectedUser}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Home score</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={homeScore}
                disabled={!selectedUser}
                onChange={(event) => setHomeScore(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Away score</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={awayScore}
                disabled={!selectedUser}
                onChange={(event) => setAwayScore(Number(event.target.value))}
              />
            </div>
          </div>
          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}

          <div className="space-y-2">
            <Label>First scorer</Label>
            <Select
              value={firstScorerTeam}
              onValueChange={(value) => setFirstScorerTeam(value as FirstScorerTeam)}
              disabled={!selectedUser || (homeScore === 0 && awayScore === 0)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOME">{match.homeTeam?.tla || "Home"}</SelectItem>
                <SelectItem value="AWAY">{match.awayTeam?.tla || "Away"}</SelectItem>
                <SelectItem value="NONE">No goals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backfillPotm">POTM guess</Label>
            <Input
              id="backfillPotm"
              value={playerOfTheMatchGuess}
              disabled={!selectedUser}
              onChange={(event) => setPlayerOfTheMatchGuess(event.target.value)}
              placeholder="Name of any player from either team"
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="submittedAt">Submitted at</Label>
            <Input
              id="submittedAt"
              type="datetime-local"
              value={submittedAt}
              disabled={!selectedUser}
              onChange={(event) => setSubmittedAt(event.target.value)}
            />
          </div>

          <Button
            className="w-full"
            type="submit"
            disabled={!selectedUser || submitting || Boolean(validationError)}
          >
            {submitting ? "Backfilling..." : "Backfill prediction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
