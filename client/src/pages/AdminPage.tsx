import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminMatchCardMobile } from "@/components/AdminMatchCardMobile";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { BackfillPredictionDialog } from "@/components/BackfillPredictionDialog";
import { EnterResultDialog } from "@/components/EnterResultDialog";
import { FixtureDialog } from "@/components/FixtureDialog";
import { Button } from "@/components/ui/button";
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
  const [fixtureMatch, setFixtureMatch] = useState<Match | null>(null);
  const [fixtureOpen, setFixtureOpen] = useState(false);

  const refresh = useCallback(async () => {
    const data = await apiGet<MatchesResponse>("/api/admin/matches");
    setMatches(data.matches);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const needsScoring = useMemo(
    () => matches.filter((m) => m.scoringStatus === "LOCKED_AWAITING_RESULT"),
    [matches],
  );
  const scored = useMemo(
    () => matches.filter((m) => m.scoringStatus === "SCORED"),
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

  function openCreateFixture() {
    setFixtureMatch(null);
    setFixtureOpen(true);
  }

  function openEditFixture(match: Match) {
    setFixtureMatch(match);
    setFixtureOpen(true);
  }

  function renderContent(rows: Match[]) {
    if (loading) {
      return (
        <>
          {/* Mobile skeletons */}
          <div className="space-y-2 sm:hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-md" />
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden sm:block">
            <Skeleton className="h-64 w-full" />
          </div>
        </>
      );
    }

    if (rows.length === 0) {
      return (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No matches in this tab.
        </p>
      );
    }

    return (
      <>
        {/* Mobile card list */}
        <div className="space-y-2 sm:hidden">
          {rows.map((m) => (
            <AdminMatchCardMobile
              key={m._id}
              match={m}
              onEnterResult={openDialog}
              onBackfill={openBackfill}
              onEditFixture={openEditFixture}
            />
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block rounded-md border overflow-hidden">
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
              {rows.map((m) => (
                <AdminMatchRow
                  key={m._id}
                  match={m}
                  onEnterResult={openDialog}
                  onBackfill={openBackfill}
                  onEditFixture={openEditFixture}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold">Admin</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Create knockout fixtures, enter results, and backfill predictions.
          </p>
        </div>
        <Button type="button" onClick={openCreateFixture} className="w-full sm:w-auto">
          Create fixture
        </Button>
      </div>

      <Tabs defaultValue="needs">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="needs" className="text-xs sm:text-sm">
            <span className="sm:hidden">To score</span>
            <span className="hidden sm:inline">Needs scoring</span>
          </TabsTrigger>
          <TabsTrigger value="scored" className="text-xs sm:text-sm">
            Scored
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All
          </TabsTrigger>
        </TabsList>
        <TabsContent value="needs" className="mt-3">
          {renderContent(needsScoring)}
        </TabsContent>
        <TabsContent value="scored" className="mt-3">
          {renderContent(scored)}
        </TabsContent>
        <TabsContent value="all" className="mt-3">
          {renderContent(matches)}
        </TabsContent>
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
      <FixtureDialog
        match={fixtureMatch}
        open={fixtureOpen}
        onOpenChange={setFixtureOpen}
        onSaved={refresh}
      />
    </main>
  );
}
