import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCairoTime } from "@/lib/format";
import type { Match } from "@/lib/types";

export function AdminMatchRow({
  match,
  onEnterResult,
  onBackfill,
}: {
  match: Match;
  onEnterResult: (match: Match) => void;
  onBackfill: (match: Match) => void;
}) {
  const score =
    match.result?.homeScore90 !== undefined &&
    match.result?.awayScore90 !== undefined
      ? `${match.result.homeScore90}-${match.result.awayScore90}`
      : "Not entered";

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{formatCairoTime(match.utcDate)}</TableCell>
      <TableCell>{match.stage}</TableCell>
      <TableCell className="font-medium">
        {match.homeTeam?.tla || "HOME"} vs {match.awayTeam?.tla || "AWAY"}
      </TableCell>
      <TableCell>{match.scoringStatus ?? "NOT_READY"}</TableCell>
      <TableCell>{score}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" onClick={() => onEnterResult(match)}>
            {match.scored ? "Edit Result" : "Enter Result"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onBackfill(match)}
          >
            Backfill Predictions
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
