import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { ApiError, apiPatch, apiPost } from "@/lib/api";
import type { Match, Stage, Team } from "@/lib/types";

const STAGES: Array<{ value: Stage; label: string }> = [
  { value: "LAST_32", label: "Round of 32" },
  { value: "LAST_16", label: "Round of 16" },
  { value: "QUARTER_FINALS", label: "Quarter-finals" },
  { value: "SEMI_FINALS", label: "Semi-finals" },
  { value: "THIRD_PLACE", label: "Third-place match" },
  { value: "FINAL", label: "Final" },
  { value: "GROUP_STAGE", label: "Group stage" },
];

type TeamForm = {
  name: string;
  shortName: string;
  tla: string;
  crest: string;
};

type TeamPreset = TeamForm & {
  flagCode: string;
};

type FixturePayload = {
  stage: Stage;
  group: string | null;
  utcDate: string;
  homeTeam: TeamForm;
  awayTeam: TeamForm;
};

const TEAM_PRESETS: TeamPreset[] = [
  { name: "Algeria", shortName: "Algeria", tla: "ALG", flagCode: "dz", crest: "https://flagcdn.com/dz.svg" },
  { name: "Argentina", shortName: "Argentina", tla: "ARG", flagCode: "ar", crest: "https://flagcdn.com/ar.svg" },
  { name: "Australia", shortName: "Australia", tla: "AUS", flagCode: "au", crest: "https://flagcdn.com/au.svg" },
  { name: "Austria", shortName: "Austria", tla: "AUT", flagCode: "at", crest: "https://flagcdn.com/at.svg" },
  { name: "Belgium", shortName: "Belgium", tla: "BEL", flagCode: "be", crest: "https://flagcdn.com/be.svg" },
  { name: "Bosnia and Herzegovina", shortName: "Bosnia", tla: "BIH", flagCode: "ba", crest: "https://flagcdn.com/ba.svg" },
  { name: "Brazil", shortName: "Brazil", tla: "BRA", flagCode: "br", crest: "https://flagcdn.com/br.svg" },
  { name: "Cabo Verde", shortName: "Cabo Verde", tla: "CPV", flagCode: "cv", crest: "https://flagcdn.com/cv.svg" },
  { name: "Canada", shortName: "Canada", tla: "CAN", flagCode: "ca", crest: "https://flagcdn.com/ca.svg" },
  { name: "Colombia", shortName: "Colombia", tla: "COL", flagCode: "co", crest: "https://flagcdn.com/co.svg" },
  { name: "Croatia", shortName: "Croatia", tla: "CRO", flagCode: "hr", crest: "https://flagcdn.com/hr.svg" },
  { name: "DR Congo", shortName: "DR Congo", tla: "COD", flagCode: "cd", crest: "https://flagcdn.com/cd.svg" },
  { name: "Ecuador", shortName: "Ecuador", tla: "ECU", flagCode: "ec", crest: "https://flagcdn.com/ec.svg" },
  { name: "Egypt", shortName: "Egypt", tla: "EGY", flagCode: "eg", crest: "https://flagcdn.com/eg.svg" },
  { name: "England", shortName: "England", tla: "ENG", flagCode: "gb-eng", crest: "https://flagcdn.com/gb-eng.svg" },
  { name: "France", shortName: "France", tla: "FRA", flagCode: "fr", crest: "https://flagcdn.com/fr.svg" },
  { name: "Germany", shortName: "Germany", tla: "GER", flagCode: "de", crest: "https://flagcdn.com/de.svg" },
  { name: "Ghana", shortName: "Ghana", tla: "GHA", flagCode: "gh", crest: "https://flagcdn.com/gh.svg" },
  { name: "Ivory Coast", shortName: "Ivory Coast", tla: "CIV", flagCode: "ci", crest: "https://flagcdn.com/ci.svg" },
  { name: "Japan", shortName: "Japan", tla: "JPN", flagCode: "jp", crest: "https://flagcdn.com/jp.svg" },
  { name: "Mexico", shortName: "Mexico", tla: "MEX", flagCode: "mx", crest: "https://flagcdn.com/mx.svg" },
  { name: "Morocco", shortName: "Morocco", tla: "MAR", flagCode: "ma", crest: "https://flagcdn.com/ma.svg" },
  { name: "Netherlands", shortName: "Netherlands", tla: "NED", flagCode: "nl", crest: "https://flagcdn.com/nl.svg" },
  { name: "Norway", shortName: "Norway", tla: "NOR", flagCode: "no", crest: "https://flagcdn.com/no.svg" },
  { name: "Paraguay", shortName: "Paraguay", tla: "PAR", flagCode: "py", crest: "https://flagcdn.com/py.svg" },
  { name: "Portugal", shortName: "Portugal", tla: "POR", flagCode: "pt", crest: "https://flagcdn.com/pt.svg" },
  { name: "Senegal", shortName: "Senegal", tla: "SEN", flagCode: "sn", crest: "https://flagcdn.com/sn.svg" },
  { name: "South Africa", shortName: "South Africa", tla: "RSA", flagCode: "za", crest: "https://flagcdn.com/za.svg" },
  { name: "Spain", shortName: "Spain", tla: "ESP", flagCode: "es", crest: "https://flagcdn.com/es.svg" },
  { name: "Sweden", shortName: "Sweden", tla: "SWE", flagCode: "se", crest: "https://flagcdn.com/se.svg" },
  { name: "Switzerland", shortName: "Switzerland", tla: "SUI", flagCode: "ch", crest: "https://flagcdn.com/ch.svg" },
  { name: "United States", shortName: "United States", tla: "USA", flagCode: "us", crest: "https://flagcdn.com/us.svg" },
].sort((a, b) => a.name.localeCompare(b.name));

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Fixture could not be saved";
}

function teamForm(team?: Team): TeamForm {
  return {
    name: team?.name ?? "",
    shortName: team?.shortName ?? "",
    tla: team?.tla ?? "",
    crest: team?.crest ?? "",
  };
}

function defaultKickoff(): string {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toLocalDatetime(value: string): string {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function validateTeam(label: string, team: TeamForm): string | null {
  if (!team.name.trim()) {
    return `${label} team name is required.`;
  }

  if (!team.tla.trim()) {
    return `${label} team code is required.`;
  }

  return null;
}

function presetToTeam(preset: TeamPreset): TeamForm {
  return {
    name: preset.name,
    shortName: preset.shortName,
    tla: preset.tla,
    crest: preset.crest,
  };
}

function TeamPicker({
  label,
  team,
  onChange,
}: {
  label: string;
  team: TeamForm;
  onChange: (team: TeamForm) => void;
}) {
  const selectedPreset = TEAM_PRESETS.find((preset) => preset.tla === team.tla);

  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="space-y-1.5">
        <Label>{label} country</Label>
        <Select
          value={selectedPreset?.tla ?? ""}
          onValueChange={(value) => {
            const preset = TEAM_PRESETS.find((item) => item.tla === value);
            if (preset) {
              onChange(presetToTeam(preset));
            }
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Choose a country" />
          </SelectTrigger>
          <SelectContent>
            {TEAM_PRESETS.map((preset) => (
              <SelectItem key={preset.tla} value={preset.tla}>
                {preset.name} ({preset.tla})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {team.name ? (
        <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
          {team.crest ? (
            <img
              src={team.crest}
              alt=""
              className="h-8 w-10 shrink-0 rounded-sm object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{team.name}</div>
            <div className="text-xs text-muted-foreground">
              {team.shortName || team.name} · {team.tla}
            </div>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}

export function FixtureDialog({
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
  const [stage, setStage] = useState<Stage>("LAST_32");
  const [utcDate, setUtcDate] = useState(defaultKickoff());
  const [homeTeam, setHomeTeam] = useState<TeamForm>(teamForm());
  const [awayTeam, setAwayTeam] = useState<TeamForm>(teamForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStage(match?.stage ?? "LAST_32");
    setUtcDate(match ? toLocalDatetime(match.utcDate) : defaultKickoff());
    setHomeTeam(teamForm(match?.homeTeam));
    setAwayTeam(teamForm(match?.awayTeam));
  }, [match, open]);

  const validationError =
    validateTeam("Home", homeTeam) ??
    validateTeam("Away", awayTeam) ??
    (!utcDate ? "Kickoff time is required." : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload: FixturePayload = {
      stage,
      group: null,
      utcDate: new Date(utcDate).toISOString(),
      homeTeam,
      awayTeam,
    };

    setSubmitting(true);
    try {
      if (match) {
        await apiPatch(`/api/admin/matches/${match._id}`, payload);
        toast.success("Fixture updated.");
      } else {
        await apiPost("/api/admin/matches", payload);
        toast.success("Fixture created.");
      }

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
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>{match ? "Edit fixture" : "Create fixture"}</DialogTitle>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Use this for knockout matches when the feed has missing or placeholder
            teams.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <form id="fixture-form" className="space-y-4" onSubmit={handleSubmit}>
            {match?.scored ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 sm:text-sm">
                This match is already scored. Editing teams or kickoff will not
                recalculate points.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={stage} onValueChange={(value) => setStage(value as Stage)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fixture-kickoff">Kickoff</Label>
                <Input
                  id="fixture-kickoff"
                  type="datetime-local"
                  value={utcDate}
                  onChange={(event) => setUtcDate(event.target.value)}
                />
              </div>
            </div>

            <TeamPicker label="Home" team={homeTeam} onChange={setHomeTeam} />
            <TeamPicker label="Away" team={awayTeam} onChange={setAwayTeam} />
          </form>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="fixture-form"
            className="w-full sm:ml-auto sm:w-auto"
            disabled={submitting || Boolean(validationError)}
          >
            {submitting ? "Saving..." : match ? "Save fixture" : "Create fixture"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
