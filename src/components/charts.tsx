import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PipelineResult } from "@/lib/pipeline/run";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
};

const tooltipStyle = {
  contentStyle: {
    borderRadius: 6,
    border: "1px solid var(--color-border)",
    background: "var(--color-card)",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    boxShadow: "var(--shadow-panel)",
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
};

const ppm = (v: number) => `${((v - 1) * 1e6).toFixed(0)}`;

export function RawCurveChart({ data }: { data: PipelineResult["raw"] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="var(--color-grid)" strokeDasharray="2 4" />
        <XAxis
          dataKey="t"
          {...axis}
          tickFormatter={(v: number) => v.toFixed(0)}
          label={{ value: "time (days)", position: "insideBottom", offset: -2, fontSize: 10 }}
        />
        <YAxis {...axis} domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => v.toFixed(3)} width={52} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number, n) => [v.toFixed(5), n === "flux" ? "PDCSAP flux" : "trend"]}
          labelFormatter={(v: number) => `t = ${v.toFixed(3)} d`}
        />
        <Scatter dataKey="flux" fill="var(--color-chart-1)" fillOpacity={0.32} shape="circle" r={0.9} />
        <Line
          type="monotone"
          dataKey="trend"
          stroke="var(--color-accent)"
          strokeWidth={1.8}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DetrendedCurveChart({ data }: { data: PipelineResult["detrended"] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <ScatterChart margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="var(--color-grid)" strokeDasharray="2 4" />
        <XAxis
          dataKey="t"
          type="number"
          {...axis}
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v: number) => v.toFixed(0)}
          label={{ value: "time (days)", position: "insideBottom", offset: -2, fontSize: 10 }}
        />
        <YAxis
          dataKey="flux"
          type="number"
          {...axis}
          domain={["dataMin", "dataMax"]}
          tickFormatter={ppm}
          width={52}
          label={{ value: "ppm", angle: -90, position: "insideLeft", fontSize: 10 }}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number) => [`${((v - 1) * 1e6).toFixed(0)} ppm`, "relative flux"]}
          labelFormatter={() => ""}
        />
        <ReferenceLine y={1} stroke="var(--color-border)" />
        <Scatter data={data} fill="var(--color-signal)" fillOpacity={0.5} r={1} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function PeriodogramChart({
  data,
  best,
}: {
  data: PipelineResult["periodogram"];
  best: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-signal)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-signal)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-grid)" strokeDasharray="2 4" />
        <XAxis
          dataKey="period"
          {...axis}
          tickFormatter={(v: number) => v.toFixed(1)}
          label={{ value: "trial period (days)", position: "insideBottom", offset: -2, fontSize: 10 }}
        />
        <YAxis {...axis} width={44} label={{ value: "SDE", angle: -90, position: "insideLeft", fontSize: 10 }} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number) => [v.toFixed(2), "power"]}
          labelFormatter={(v: number) => `P = ${v.toFixed(3)} d`}
        />
        <Area
          type="monotone"
          dataKey="power"
          stroke="var(--color-signal)"
          strokeWidth={1.2}
          fill="url(#pg)"
        />
        <ReferenceLine
          x={best}
          stroke="var(--color-accent)"
          strokeWidth={1.6}
          label={{ value: `${best.toFixed(3)} d`, fontSize: 10, fill: "var(--color-accent-foreground)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FoldedChart({ result }: { result: PipelineResult }) {
  const half = result.durationHours / 24 / result.bestPeriod / 2;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart margin={{ top: 8, right: 10, bottom: 6, left: 0 }}>
        <CartesianGrid stroke="var(--color-grid)" strokeDasharray="2 4" />
        <XAxis
          dataKey="phase"
          type="number"
          domain={[-0.5, 0.5]}
          {...axis}
          tickFormatter={(v: number) => v.toFixed(2)}
          label={{ value: "orbital phase", position: "insideBottom", offset: -2, fontSize: 10 }}
        />
        <YAxis
          dataKey="flux"
          type="number"
          domain={["dataMin", "dataMax"]}
          {...axis}
          tickFormatter={ppm}
          width={52}
          label={{ value: "ppm", angle: -90, position: "insideLeft", fontSize: 10 }}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number, n) => [`${((v - 1) * 1e6).toFixed(0)} ppm`, String(n)]}
          labelFormatter={(v: number) => `phase ${Number(v).toFixed(3)}`}
        />
        <ReferenceArea x1={-half} x2={half} fill="var(--color-accent)" fillOpacity={0.12} />
        <Scatter name="folded" data={result.folded} fill="var(--color-chart-1)" fillOpacity={0.3} r={1.1} />
        <Scatter name="binned" data={result.foldedBinned} fill="var(--color-signal)" r={2.6} />
        <Line
          name="batman fit"
          data={result.foldedBinned}
          dataKey="model"
          type="monotone"
          stroke="var(--color-destructive)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function AttentionStrip({ data }: { data: PipelineResult["attention"] }) {
  return (
    <div>
      <div className="flex h-14 w-full items-end gap-px overflow-hidden rounded-md border border-border bg-secondary/50">
        {data.map((a, i) => (
          <div
            key={i}
            title={`phase ${a.phase.toFixed(3)} · attention ${(a.weight * 100).toFixed(0)}%`}
            className="flex-1"
            style={{
              height: `${Math.max(4, a.weight * 100)}%`,
              backgroundColor: "var(--color-accent)",
              opacity: 0.25 + 0.75 * a.weight,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between label-caps">
        <span>phase −0.5</span>
        <span>transit centre</span>
        <span>+0.5</span>
      </div>
    </div>
  );
}
