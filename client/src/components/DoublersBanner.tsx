import { Badge } from "@/components/ui/badge";
import type { DoublerStage, DoublerStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: Array<{ key: DoublerStage; label: string }> = [
  { key: "GROUP_STAGE", label: "Group" },
  { key: "LAST_32", label: "R32" },
  { key: "LAST_16", label: "R16" },
  { key: "QUARTER_FINALS", label: "QF" },
  { key: "SEMI_FINALS", label: "SF" },
  { key: "FINAL", label: "Final" },
];

export function DoublersBanner({
  doublers,
}: {
  doublers: DoublerStatus | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAGES.map((stage) => {
        const status = doublers?.[stage.key];
        const used = Boolean(status?.used);

        return (
          <Badge
            key={stage.key}
            variant={used ? "secondary" : "outline"}
            title={
              used && status?.matchLabel
                ? `Used on ${status.matchLabel}`
                : "Available"
            }
            className={cn(
              "cursor-default",
              used
                ? "bg-slate-200 text-slate-600"
                : "border-emerald-300 bg-emerald-50 text-emerald-700",
            )}
          >
            {stage.label}: {used ? "Used" : "Available"}
          </Badge>
        );
      })}
    </div>
  );
}
