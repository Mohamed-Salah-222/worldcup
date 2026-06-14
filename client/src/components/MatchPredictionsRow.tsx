import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPredictionViewDialog } from "@/components/UserPredictionViewDialog";
import { apiGet } from "@/lib/api";
import type {
  Match,
  MatchPredictionsResponse,
  PublicMatchPrediction,
} from "@/lib/types";

export function MatchPredictionsRow({
  match,
  refreshTrigger,
}: {
  match: Match;
  refreshTrigger: number;
}) {
  const [predictions, setPredictions] = useState<PublicMatchPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PublicMatchPrediction | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGet<MatchPredictionsResponse>(`/api/predictions/match/${match._id}`)
      .then((data) => setPredictions(data.predictions))
      .finally(() => setLoading(false));
  }, [match._id, refreshTrigger]);

  function viewPrediction(prediction: PublicMatchPrediction) {
    setSelected(prediction);
    setOpen(true);
  }

  if (loading) {
    return <Skeleton className="h-9 w-full" />;
  }

  return (
    <div className="space-y-1.5 border-t pt-3" onClick={(event) => event.stopPropagation()}>
      {predictions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No predictions yet.</p>
      ) : (
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 scrollbar-thin">
          {predictions.map((prediction) => (
            <button
              key={prediction._id}
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs transition-transform hover:bg-muted active:scale-95 sm:text-sm"
              onClick={() => viewPrediction(prediction)}
            >
              <span className="max-w-[8rem] truncate">
                {prediction.user.displayName}
              </span>
              {prediction.doublerApplied ? (
                <span className="text-[10px] font-semibold opacity-70">×2</span>
              ) : null}
              {prediction.editCount > 0 ? (
                <span className="text-[10px] opacity-50">•</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {predictions.length} {predictions.length === 1 ? "prediction" : "predictions"}
      </p>
      <UserPredictionViewDialog
        prediction={selected}
        match={match}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
