import { useCallback, useEffect, useMemo, useState } from "react";
import { PredictionResultCard } from "@/components/PredictionResultCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import type { DetailedPredictionsResponse, Match, Prediction } from "@/lib/types";

function isScored(prediction: Prediction): boolean {
  return Boolean((prediction.match as Match).scored);
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function MyPredictionsPage() {
  const [data, setData] = useState<DetailedPredictionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setData(await apiGet<DetailedPredictionsResponse>("/api/predictions/me/detailed"));
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const predictions = data?.predictions ?? [];
  const groups = useMemo(
    () => ({
      all: predictions,
      scored: predictions.filter(isScored),
      pending: predictions.filter((prediction) => !isScored(prediction)),
      doubled: predictions.filter((prediction) => prediction.doublerApplied),
    }),
    [predictions],
  );

  function renderList(rows: Prediction[]) {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No predictions here yet.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {rows.map((prediction) => (
          <PredictionResultCard key={prediction._id} prediction={prediction} />
        ))}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Predictions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your submitted predictions and scoring breakdowns.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total predictions" value={data?.stats.total ?? 0} />
        <StatCard label="Scored" value={data?.stats.scored ?? 0} />
        <StatCard label="Pending" value={data?.stats.pending ?? 0} />
        <StatCard label="Total points" value={data?.stats.pointsTotal ?? 0} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="scored">Scored</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="doubled">Doubled</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderList(groups.all)}</TabsContent>
        <TabsContent value="scored">{renderList(groups.scored)}</TabsContent>
        <TabsContent value="pending">{renderList(groups.pending)}</TabsContent>
        <TabsContent value="doubled">{renderList(groups.doubled)}</TabsContent>
      </Tabs>
    </main>
  );
}
