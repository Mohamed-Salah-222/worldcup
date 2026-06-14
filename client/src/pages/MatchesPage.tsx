import { useCallback, useEffect, useMemo, useState } from "react";
import { DoublersBanner } from "@/components/DoublersBanner";
import { MatchCard } from "@/components/MatchCard";
import { PredictionDialog } from "@/components/PredictionDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import { isSameCairoDate } from "@/lib/format";
import { isMatchLocked } from "@/lib/matchLock";
import type {
  DoublerStatus,
  DoublersResponse,
  Match,
  MatchesResponse,
  Prediction,
  PredictionsResponse,
} from "@/lib/types";

function matchIdForPrediction(prediction: Prediction): string {
  return typeof prediction.match === "string"
    ? prediction.match
    : prediction.match._id;
}

export function MatchesPage() {
  const { user } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [allUpcomingMatches, setAllUpcomingMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [doublers, setDoublers] = useState<DoublerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refreshCore = useCallback(async () => {
    const [upcoming, myPredictions, doublersStatus] = await Promise.all([
      apiGet<MatchesResponse>("/api/matches/upcoming"),
      apiGet<PredictionsResponse>("/api/predictions/me"),
      apiGet<DoublersResponse>("/api/predictions/doublers"),
    ]);

    setUpcomingMatches(upcoming.matches);
    setPredictions(myPredictions.predictions);
    setDoublers(doublersStatus.doublersUsed);
  }, []);

  const refreshAllUpcoming = useCallback(async () => {
    setAllLoading(true);
    try {
      const result = await apiGet<MatchesResponse>("/api/matches");
      setAllUpcomingMatches(
        result.matches.filter((match) => !isMatchLocked(match)),
      );
    } finally {
      setAllLoading(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([refreshCore(), refreshAllUpcoming()]);
  }, [refreshCore, refreshAllUpcoming]);

  useEffect(() => {
    refreshCore()
      .finally(() => setLoading(false));
  }, [refreshCore]);

  const predictionsByMatch = useMemo(() => {
    const map = new Map<string, Prediction>();

    for (const prediction of predictions) {
      map.set(matchIdForPrediction(prediction), prediction);
    }

    return map;
  }, [predictions]);

  const todayMatches = upcomingMatches.filter((match) =>
    isSameCairoDate(match.utcDate, "Today"),
  );
  const tomorrowMatches = upcomingMatches.filter((match) =>
    isSameCairoDate(match.utcDate, "Tomorrow"),
  );
  const selectedPrediction = selectedMatch
    ? predictionsByMatch.get(selectedMatch._id)
    : undefined;

  function openPrediction(match: Match) {
    setSelectedMatch(match);
    setDialogOpen(true);
  }

  function renderMatches(matches: Match[], isLoading: boolean) {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (matches.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No matches found.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard
            key={match._id}
            match={match}
            locked={isMatchLocked(match)}
            prediction={predictionsByMatch.get(match._id)}
            onClick={() => openPrediction(match)}
          />
        ))}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Hi {user?.displayName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming matches</h1>
      </div>

      <DoublersBanner doublers={doublers} />

      <Tabs
        defaultValue="today"
        onValueChange={(value) => {
          if (value === "all" && allUpcomingMatches.length === 0) {
            void refreshAllUpcoming();
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
          <TabsTrigger value="all">All upcoming</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          {renderMatches(todayMatches, loading)}
        </TabsContent>
        <TabsContent value="tomorrow">
          {renderMatches(tomorrowMatches, loading)}
        </TabsContent>
        <TabsContent value="all">
          {renderMatches(allUpcomingMatches, allLoading)}
        </TabsContent>
      </Tabs>

      <PredictionDialog
        match={selectedMatch}
        prediction={selectedPrediction}
        locked={selectedMatch ? isMatchLocked(selectedMatch) : false}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        doublers={doublers}
        onSaved={refreshAllData}
      />
    </main>
  );
}
