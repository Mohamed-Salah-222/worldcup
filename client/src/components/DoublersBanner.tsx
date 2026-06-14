import { Badge } from "@/components/ui/badge";
import type { DoublerStage, DoublerStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: Array<{ key: DoublerStage; shortLabel: string; label: string }> = [
  { key: "GROUP_STAGE", shortLabel: "Group", label: "Group Stage" },
  { key: "LAST_32", shortLabel: "R32", label: "Round of 32" },
  { key: "LAST_16", shortLabel: "R16", label: "Round of 16" },
  { key: "QUARTER_FINALS", shortLabel: "QF", label: "Quarter-Finals" },
  { key: "SEMI_FINALS", shortLabel: "SF", label: "Semi-Finals" },
  { key: "FINAL", shortLabel: "Final", label: "Final" },
];

export function DoublersBanner({
  doublers,
}: {
  doublers: DoublerStatus | null;
}) {
  return (
    <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0 scrollbar-thin">
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
              "shrink-0 cursor-default text-xs sm:text-sm",
              used
                ? "bg-slate-200 text-slate-600"
                : "border-emerald-300 bg-emerald-50 text-emerald-700",
            )}
          >
            <span className="sm:hidden">{stage.shortLabel}</span>
            <span className="hidden sm:inline">{stage.label}</span>:{" "}
            {used ? "Used" : "Available"}
          </Badge>
        );
      })}
    </div>
  );
}
