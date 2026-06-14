import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import { formatCairoTime } from "@/lib/format";
import type { LeaderboardResponse, LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const PODIUM_STYLES = [
  "border-amber-300 bg-amber-50",
  "border-slate-300 bg-slate-50",
  "border-orange-300 bg-orange-50",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatsText({ row }: { row: LeaderboardRow }) {
  return (
    <p className="text-sm text-muted-foreground">
      {row.predictionsCount} predictions | {row.correctWinners} winners |{" "}
      {row.exactScores} exact scores
    </p>
  );
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiGet<LeaderboardResponse>("/api/leaderboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const leaderboard = data?.leaderboard ?? [];
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `Last updated ${formatCairoTime(data.lastUpdated)}` : "Loading..."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No predictions yet. Be the first to score points.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {topThree.map((row, index) => (
              <Card
                key={row.userId}
                className={cn(
                  PODIUM_STYLES[index],
                  row.userId === user?.id && "ring-2 ring-primary",
                )}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <Badge>#{row.rank}</Badge>
                    {row.role === "admin" ? <Badge variant="secondary">admin</Badge> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(row.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{row.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{row.username}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold">{row.totalPoints}</p>
                    <StatsText row={row} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {rest.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Predictions</TableHead>
                  <TableHead>Winners</TableHead>
                  <TableHead>Exact Scores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rest.map((row) => (
                  <TableRow
                    key={row.userId}
                    className={row.userId === user?.id ? "bg-primary/5" : undefined}
                  >
                    <TableCell>#{row.rank}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {row.displayName}{" "}
                        {row.role === "admin" ? (
                          <Badge variant="secondary">admin</Badge>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground">@{row.username}</div>
                    </TableCell>
                    <TableCell className="font-semibold">{row.totalPoints}</TableCell>
                    <TableCell>{row.predictionsCount}</TableCell>
                    <TableCell>{row.correctWinners}</TableCell>
                    <TableCell>{row.exactScores}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </>
      )}
    </main>
  );
}
