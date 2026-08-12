import { Check, Loader2 } from "lucide-react";
import type { StageStatus } from "@/lib/pipeline/analyze";

export function StageList({ stages }: { stages: StageStatus[] }) {
  return (
    <ol className="space-y-2.5">
      {stages.map((s, i) => (
        <li key={s.id} className="flex gap-3">
          <span
            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] num ${
              s.state === "done"
                ? "border-confirmed bg-confirmed text-confirmed-foreground"
                : s.state === "running"
                  ? "border-accent text-accent-foreground"
                  : "border-border text-muted-foreground"
            }`}
          >
            {s.state === "done" ? (
              <Check className="size-3" />
            ) : s.state === "running" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              i + 1
            )}
          </span>
          <div className="min-w-0">
            <p
              className={`text-sm leading-tight ${
                s.state === "idle" ? "text-muted-foreground" : "font-medium text-foreground"
              }`}
            >
              {s.name}
              {s.ms !== undefined && (
                <span className="ml-2 num text-[11px] font-normal text-muted-foreground">
                  {s.ms < 1 ? "<1" : s.ms.toFixed(0)} ms
                </span>
              )}
            </p>
            <p className="text-xs leading-snug text-muted-foreground">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
