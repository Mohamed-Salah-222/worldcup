import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
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

const RANK_ACCENTS = [
  {
    card: "border-t-4 border-t-yellow-500/70",
    trophy: "text-yellow-500",
  },
  {
    card: "border-t-4 border-t-slate-400/70",
    trophy: "text-slate-400",
  },
  {
    card: "border-t-4 border-t-amber-700/70",
    trophy: "text-amber-700",
  },
];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/60 px-1 py-1.5">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PodiumCard({
  user,
  index,
  isCurrentUser,
}: {
  user: LeaderboardRow;
  index: number;
  isCurrentUser: boolean;
}) {
  const accent = RANK_ACCENTS[index] ?? RANK_ACCENTS[2];

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        accent.card,
        isCurrentUser && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
              #{user.rank}
            </div>
            <div className="truncate text-base font-semibold sm:text-lg">
              {user.displayName}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              @{user.username}
              {user.role === "admin" ? " • admin" : ""}
            </div>
          </div>
          <Trophy className={cn("h-6 w-6 shrink-0 sm:h-7 sm:w-7", accent.trophy)} />
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums sm:text-3xl">
            {user.totalPoints}
          </span>
          <span className="text-xs text-muted-foreground">pts</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Picks" value={user.predictionsCount} />
          <Stat label="Winners" value={user.correctWinners} />
          <Stat label="Exact" value={user.exactScores} />
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardRowMobile({
  user,
  isCurrentUser,
}: {
  user: LeaderboardRow;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        isCurrentUser && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums">
          #{user.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user.displayName}</div>
          <div className="truncate text-xs text-muted-foreground">
            @{user.username}
            {user.role === "admin" ? " • admin" : ""}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-bold leading-tight tabular-nums">
            {user.totalPoints}
          </div>
          <div className="text-[10px] text-muted-foreground">pts</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Picks" value={user.predictionsCount} />
        <Stat label="Winners" value={user.correctWinners} />
        <Stat label="Exact" value={user.exactScores} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <div className="space-y-2 sm:hidden">
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
      </div>
      <div className="hidden space-y-2 sm:block">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </>
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
    <main className="mx-auto max-w-6xl space-y-6 p-3 sm:p-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold sm:text-2xl">Leaderboard</h1>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {data ? `Updated ${formatCairoTime(data.lastUpdated)}` : "Loading..."}
        </p>
      </div>

      {loading ? (
        <LoadingState />
      ) : leaderboard.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No players on the board yet. Be the first to score points.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {topThree.map((row, index) => (
              <PodiumCard
                key={row.userId}
                user={row}
                index={index}
                isCurrentUser={row.userId === user?.id}
              />
            ))}
          </div>

          {rest.length > 0 ? (
            <section className="space-y-2">
              <h2 className="mt-2 text-sm font-semibold text-muted-foreground">
                All players
              </h2>

              <div className="space-y-2 sm:hidden">
                {rest.map((row) => (
                  <LeaderboardRowMobile
                    key={row.userId}
                    user={row}
                    isCurrentUser={row.userId === user?.id}
                  />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-md border sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Picks</TableHead>
                      <TableHead className="text-right">Winners</TableHead>
                      <TableHead className="text-right">Exact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rest.map((row) => (
                      <TableRow
                        key={row.userId}
                        className={row.userId === user?.id ? "bg-primary/5" : undefined}
                      >
                        <TableCell className="font-medium tabular-nums">
                          #{row.rank}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            @{row.username}
                            {row.role === "admin" ? " • admin" : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {row.totalPoints}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.predictionsCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.correctWinners}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.exactScores}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
