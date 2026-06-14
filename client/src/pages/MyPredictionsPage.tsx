import { useCallback, useEffect, useMemo, useState } from "react";
import { PredictionResultCard } from "@/components/PredictionResultCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import type { DetailedPredictionsResponse, Match, Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";

function isScored(prediction: Prediction): boolean {
  return Boolean((prediction.match as Match).scored);
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-3 sm:p-4">
        <div className="text-2xl font-bold leading-tight tabular-nums sm:text-3xl">
          {value}
        </div>
        <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_MESSAGES = {
  all: "You haven't made any predictions yet.",
  scored: "None of your predictions have been scored yet.",
  pending: "No pending predictions — you're all caught up.",
  doubled: "You haven't applied any doublers yet.",
};

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

  function renderList(rows: Prediction[], emptyMessage: string) {
    if (loading) {
      return (
        <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
          <Skeleton className="h-40 rounded-md sm:h-32" />
          <Skeleton className="h-40 rounded-md sm:h-32" />
          <Skeleton className="h-40 rounded-md sm:h-32" />
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
        {rows.map((prediction) => (
          <PredictionResultCard key={prediction._id} prediction={prediction} />
        ))}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-3 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold sm:text-2xl">My Predictions</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          All predictions across the tournament.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatCard label="Total" value={data?.stats.total ?? 0} />
        <StatCard label="Scored" value={data?.stats.scored ?? 0} />
        <StatCard label="Pending" value={data?.stats.pending ?? 0} />
        <StatCard label="Points" value={data?.stats.pointsTotal ?? 0} highlight />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:h-10 sm:grid-cols-4 sm:gap-0">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All
          </TabsTrigger>
          <TabsTrigger value="scored" className="text-xs sm:text-sm">
            Scored
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Pending
          </TabsTrigger>
          <TabsTrigger value="doubled" className="text-xs sm:text-sm">
            Doubled
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          {renderList(groups.all, EMPTY_MESSAGES.all)}
        </TabsContent>
        <TabsContent value="scored">
          {renderList(groups.scored, EMPTY_MESSAGES.scored)}
        </TabsContent>
        <TabsContent value="pending">
          {renderList(groups.pending, EMPTY_MESSAGES.pending)}
        </TabsContent>
        <TabsContent value="doubled">
          {renderList(groups.doubled, EMPTY_MESSAGES.doubled)}
        </TabsContent>
      </Tabs>
    </main>
  );
}
