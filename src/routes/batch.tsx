import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { analyzeBatch } from "@/lib/pipeline/analyze";
import type { PipelineResult } from "@/lib/pipeline/run";
import { MODEL_METRICS, TARGETS } from "@/lib/pipeline/targets";
import { download, resultsToCsv } from "@/lib/export";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Survey — PragyaVyom" },
      {
        name: "description",
        content:
          "Screen a full TESS target list through the PragyaVyom pipeline and review verdicts, confidence and recovered periods in one table.",
      },
      { property: "og:title", content: "Batch Survey — PragyaVyom" },
      {
        property: "og:description",
        content: "Screen an entire TESS target list and export the verdict table as CSV.",
      },
    ],
  }),
  component: Batch,
});

function Batch() {
  const [rows, setRows] = useState<PipelineResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setRows([]);
    await analyzeBatch(TARGETS, (r) => setRows((prev) => [...prev, r]));
    setRunning(false);
  };

  const correct = rows.filter((r) => r.truthKind && r.truthKind === r.predicted).length;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10">
      <h1 className="font-display text-2xl font-semibold">Batch survey</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The same pipeline used in the console, applied to every catalogued target in sequence. This
        is the triage view a survey team would use: rank by verdict, keep the candidates, discard
        the eclipsing binaries and blends before they consume telescope time.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={running}>
          <Play className="size-4" /> {running ? "Screening…" : `Screen ${TARGETS.length} targets`}
        </Button>
        {rows.length > 0 && (
          <Button
            variant="outline"
            onClick={() => download("pragyavyom-survey.csv", resultsToCsv(rows))}
          >
            <Download className="size-4" /> Export CSV
          </Button>
        )}
        {rows.length > 0 && (
          <span className="num text-sm text-muted-foreground">
            {correct}/{rows.length} match injected ground truth · model benchmark{" "}
            {MODEL_METRICS.accuracy}%
          </span>
        )}
      </div>

      <div className="panel mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Target", "Verdict", "Class", "Confidence", "Period (d)", "Depth (ppm)", "SNR", "Truth"].map(
                (h) => (
                  <th key={h} className="label-caps px-4 py-3 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No run yet — press “Screen {TARGETS.length} targets”.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.target} className="border-b border-border/60 last:border-0">
                <td className="num px-4 py-2.5 font-medium">{r.target}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      r.verdict === "CANDIDATE"
                        ? "bg-confirmed/12 text-confirmed"
                        : r.verdict === "FALSE POSITIVE"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {r.verdict}
                  </span>
                </td>
                <td className="px-4 py-2.5">{r.predicted}</td>
                <td className="num px-4 py-2.5">{(r.confidence * 100).toFixed(1)}%</td>
                <td className="num px-4 py-2.5">{r.bestPeriod.toFixed(4)}</td>
                <td className="num px-4 py-2.5">{Math.round(r.depth * 1e6).toLocaleString()}</td>
                <td className="num px-4 py-2.5">{r.snr.toFixed(1)}</td>
                <td className="num px-4 py-2.5 text-muted-foreground">
                  {r.truthKind ?? "—"}
                  {r.truthKind && (r.truthKind === r.predicted ? " ✓" : " ✗")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
