import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { BackfillPredictionDialog } from "@/components/BackfillPredictionDialog";
import { EnterResultDialog } from "@/components/EnterResultDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import type { Match, MatchesResponse } from "@/lib/types";

export function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backfillMatch, setBackfillMatch] = useState<Match | null>(null);
  const [backfillOpen, setBackfillOpen] = useState(false);

  const refresh = useCallback(async () => {
    const data = await apiGet<MatchesResponse>("/api/admin/matches");
    setMatches(data.matches);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const needsScoring = useMemo(
    () =>
      matches.filter(
        (match) => match.scoringStatus === "LOCKED_AWAITING_RESULT",
      ),
    [matches],
  );
  const scored = useMemo(
    () => matches.filter((match) => match.scoringStatus === "SCORED"),
    [matches],
  );

  function openDialog(match: Match) {
    setSelectedMatch(match);
    setDialogOpen(true);
  }

  function openBackfill(match: Match) {
    setBackfillMatch(match);
    setBackfillOpen(true);
  }

  function renderTable(rows: Match[]) {
    if (loading) {
      return <Skeleton className="h-64 w-full" />;
    }

    if (rows.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No matches found.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>Scoring</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((match) => (
            <AdminMatchRow
              key={match._id}
              match={match}
              onEnterResult={openDialog}
              onBackfill={openBackfill}
            />
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin - Match Results
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter regulation-time results and score predictions.
        </p>
      </div>

      <Tabs defaultValue="needs">
        <TabsList>
          <TabsTrigger value="needs">Needs scoring</TabsTrigger>
          <TabsTrigger value="scored">Scored</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="needs">{renderTable(needsScoring)}</TabsContent>
        <TabsContent value="scored">{renderTable(scored)}</TabsContent>
        <TabsContent value="all">{renderTable(matches)}</TabsContent>
      </Tabs>

      <EnterResultDialog
        match={selectedMatch}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={refresh}
      />
      <BackfillPredictionDialog
        match={backfillMatch}
        open={backfillOpen}
        onOpenChange={setBackfillOpen}
        onSaved={refresh}
      />
    </main>
  );
}
