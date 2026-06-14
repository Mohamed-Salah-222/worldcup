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
      ? `${match.result.homeScore90}–${match.result.awayScore90}`
      : "Not entered";

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{formatCairoTime(match.utcDate)}</TableCell>
      <TableCell>{match.stage}</TableCell>
      <TableCell className="font-medium min-w-0">
        <span className="truncate">
          {match.homeTeam?.tla ?? "HOME"} vs {match.awayTeam?.tla ?? "AWAY"}
        </span>
      </TableCell>
      <TableCell>{match.scoringStatus ?? "NOT_READY"}</TableCell>
      <TableCell>{score}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant={match.scored ? "outline" : "default"} onClick={() => onEnterResult(match)}>
            {match.scored ? "Edit result" : "Enter result"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onBackfill(match)}>
            Backfill
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
