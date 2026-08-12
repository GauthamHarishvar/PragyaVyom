import type { PipelineResult } from "@/lib/pipeline/run";
import { AttentionStrip } from "./charts";

export function VerdictBanner({ result }: { result: PipelineResult }) {
  const tone =
    result.verdict === "CANDIDATE"
      ? "border-confirmed/40 bg-confirmed/10 text-confirmed"
      : result.verdict === "FALSE POSITIVE"
        ? "border-destructive/40 bg-destructive/8 text-destructive"
        : "border-border bg-secondary text-muted-foreground";
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-3 ${tone}`}>
      <div>
        <p className="label-caps">Pipeline verdict</p>
        <p className="font-display text-xl font-semibold">{result.verdict}</p>
      </div>
      <div className="text-foreground">
        <p className="label-caps">Classified as</p>
        <p className="num text-sm font-medium">
          {result.predicted} · {(result.confidence * 100).toFixed(1)}% confidence
        </p>
      </div>
      {result.truthKind && (
        <div className="text-foreground">
          <p className="label-caps">Injected ground truth</p>
          <p className="num text-sm">
            {result.truthKind}
            {result.truthKind === result.predicted ? " ✓ match" : " ✗ mismatch"}
          </p>
        </div>
      )}
    </div>
  );
}

export function ClassProbabilities({ result }: { result: PipelineResult }) {
  return (
    <ul className="space-y-2">
      {result.probabilities.map((p) => (
        <li key={p.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className={p.label === result.predicted ? "font-medium" : "text-muted-foreground"}>
              {p.label}
            </span>
            <span className="num text-xs text-muted-foreground">{(p.p * 100).toFixed(1)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(1, p.p * 100)}%`,
                backgroundColor:
                  p.label === result.predicted ? "var(--color-primary)" : "var(--color-ink-soft)",
                opacity: p.label === result.predicted ? 1 : 0.35,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ShapPanel({ result }: { result: PipelineResult }) {
  const max = Math.max(...result.attributions.map((a) => Math.abs(a.contribution)), 0.2);
  return (
    <ul className="space-y-3">
      {result.attributions.map((a) => {
        const w = (Math.abs(a.contribution) / max) * 50;
        const positive = a.contribution >= 0;
        return (
          <li key={a.feature}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{a.feature}</span>
              <span className="num text-xs text-muted-foreground">{a.value}</span>
            </div>
            <div className="relative mt-1 h-2 rounded-full bg-secondary">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  width: `${w}%`,
                  left: positive ? "50%" : `${50 - w}%`,
                  backgroundColor: positive ? "var(--color-confirmed)" : "var(--color-destructive)",
                }}
              />
            </div>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{a.reason}</p>
          </li>
        );
      })}
      <li className="label-caps flex justify-between pt-1">
        <span>← argues against a planet</span>
        <span>supports a planet →</span>
      </li>
    </ul>
  );
}

export function ParameterTable({ result }: { result: PipelineResult }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left label-caps">
          <th className="pb-2 font-normal">Parameter</th>
          <th className="pb-2 text-right font-normal">Posterior median ± 1σ</th>
        </tr>
      </thead>
      <tbody>
        {result.estimates.map((e) => (
          <tr key={e.label} className="border-b border-border/60 last:border-0">
            <td className="py-2 pr-3">{e.label}</td>
            <td className="num py-2 text-right">
              {e.value >= 1000 ? e.value.toFixed(0) : e.value.toFixed(e.value < 1 ? 4 : 3)}
              <span className="text-muted-foreground">
                {" ± "}
                {e.sigma >= 1000 ? e.sigma.toFixed(0) : e.sigma.toFixed(e.sigma < 1 ? 4 : 3)}
              </span>{" "}
              <span className="text-xs text-muted-foreground">{e.unit}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function XaiAttention({ result }: { result: PipelineResult }) {
  const peak = result.attention.reduce((a, b) => (b.weight > a.weight ? b : a), result.attention[0]!);
  return (
    <div className="space-y-2">
      <AttentionStrip data={result.attention} />
      <p className="text-xs leading-snug text-muted-foreground">
        GradCAM saliency peaks at phase{" "}
        <span className="num text-foreground">{peak.phase.toFixed(3)}</span>, i.e. the model bases its
        decision on the folded dip itself rather than on out-of-transit systematics — the check that
        makes the prediction defensible in review.
      </p>
    </div>
  );
}

export function StatGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="label-caps">{i.label}</dt>
          <dd className="num text-lg leading-tight">{i.value}</dd>
          {i.hint && <dd className="text-xs text-muted-foreground">{i.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
