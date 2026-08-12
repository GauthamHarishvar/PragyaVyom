import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Download, Play, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DetrendedCurveChart,
  FoldedChart,
  PeriodogramChart,
  RawCurveChart,
} from "@/components/charts";
import {
  ClassProbabilities,
  ParameterTable,
  ShapPanel,
  StatGrid,
  VerdictBanner,
  XaiAttention,
} from "@/components/result-panels";
import { StageList } from "@/components/stage-list";
import { analyze, initialStages, type StageStatus } from "@/lib/pipeline/analyze";
import type { PipelineResult } from "@/lib/pipeline/run";
import { MODEL_METRICS, TARGETS } from "@/lib/pipeline/targets";
import type { TargetSpec } from "@/lib/pipeline/generate";
import { download, lightCurveCsv, resultsToCsv } from "@/lib/export";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PragyaVyom — Explainable Exoplanet Detection Console" },
      {
        name: "description",
        content:
          "Run the 7-stage PragyaVyom pipeline on TESS light curves: denoising, Transit Least Squares search, 5-class CNN+Transformer classification, SHAP/GradCAM explanations and MCMC parameter bounds.",
      },
      { property: "og:title", content: "PragyaVyom — Explainable Exoplanet Detection Console" },
      {
        property: "og:description",
        content:
          "Detect, classify and explain exoplanet transit signals in noisy TESS light curves, with uncertainty bounds on every parameter.",
      },
    ],
  }),
  component: Console,
});

function Console() {
  const [selected, setSelected] = useState<TargetSpec>(TARGETS[0]!);
  const [upload, setUpload] = useState<{ name: string; text: string } | null>(null);
  const [stages, setStages] = useState<StageStatus[]>(initialStages());
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [running, setRunning] = useState(false);
  const [periodRange, setPeriodRange] = useState<[number, number]>([0.5, 13]);
  const [sgWindow, setSgWindow] = useState(4);
  const [detrendWindow, setDetrendWindow] = useState(0.5);
  const [sigmaClip, setSigmaClip] = useState(4);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setResult(null);
    setStages(initialStages());
    try {
      const r = await analyze(
        {
          ...(upload ? { csv: upload } : { spec: selected }),
          minPeriod: periodRange[0],
          maxPeriod: periodRange[1],
          sgWindowHours: sgWindow,
          detrendWindowDays: detrendWindow,
          sigmaClip,
        },
        setStages,
      );
      setResult(r);
      toast.success(`${r.predicted} · ${(r.confidence * 100).toFixed(1)}% confidence`, {
        description: `${r.target} — verdict ${r.verdict}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setRunning(false);
    }
  }, [detrendWindow, periodRange, selected, sgWindow, sigmaClip, upload]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setUpload({ name: file.name, text });
    toast.success(`${file.name} loaded`, { description: "Press Run pipeline to analyse it." });
  };

  const stats = useMemo(() => {
    if (!result) return [];
    return [
      { label: "Cadence", value: `${result.cadenceMinutes} min`, hint: `${result.points.toLocaleString()} samples` },
      {
        label: "Noise reduced",
        value: `${Math.round(result.noiseBefore)} → ${Math.round(result.noiseAfter)} ppm`,
        hint: `${result.outliersClipped} outliers clipped`,
      },
      { label: "TLS SDE", value: result.sde.toFixed(2), hint: "peak above noise floor" },
      { label: "Transit SNR", value: result.snr.toFixed(1), hint: "folded, per-point σ" },
    ];
  }, [result]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8">
      <section className="sky-surface relative overflow-hidden rounded-xl px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative max-w-3xl">
          <p className="label-caps text-current opacity-70">
            ISRO BAH 2026 · PS-7 · exoplanet transit intelligence
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.1]">
            Reads starlight, finds planets, and tells you exactly why.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed opacity-85">
            PragyaVyom ingests noisy TESS light curves, strips instrument systematics, searches for
            periodic transits, classifies each signal into five astrophysical categories and returns
            orbital parameters with uncertainty bounds — every prediction backed by a scientific
            reason a reviewer can audit.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {[
              { k: "Classification accuracy", v: `${MODEL_METRICS.accuracy}%` },
              { k: "False positive rate", v: `<${Math.ceil(MODEL_METRICS.falsePositiveRate)}%` },
              { k: "Signal classes", v: String(MODEL_METRICS.classes) },
              { k: "Runtime per curve", v: "~0.3 s" },
            ].map((s) => (
              <div key={s.k}>
                <p className="num text-2xl font-semibold">{s.v}</p>
                <p className="text-xs opacity-70">{s.k}</p>
              </div>
            ))}
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full opacity-25"
          style={{ background: "var(--gradient-star)", filter: "blur(28px)" }}
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="panel p-4">
            <h2 className="font-display text-sm font-semibold">1 · Choose a target</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              TESS sector sample with known signal types, used to validate the pipeline end to end.
            </p>
            <ul className="mt-3 space-y-1.5">
              {TARGETS.map((t) => {
                const active = !upload && t.id === selected.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(t);
                        setUpload(null);
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                        active
                          ? "border-primary/40 bg-secondary"
                          : "border-transparent hover:bg-secondary/60"
                      }`}
                    >
                      <span className="num flex items-baseline justify-between text-sm">
                        <span className="font-medium">{t.id}</span>
                        <span className="text-xs text-muted-foreground">S{t.sector}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {t.note}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 rounded-md border border-dashed border-border p-3">
              <p className="label-caps">Or bring your own curve</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Two-column CSV: <span className="num">time,flux</span> (≥200 rows).
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-3.5" /> Upload light curve
              </Button>
              {upload && (
                <p className="num mt-2 truncate text-xs text-foreground">
                  ● {upload.name}{" "}
                  <button
                    className="text-muted-foreground underline"
                    onClick={() => setUpload(null)}
                    type="button"
                  >
                    clear
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="font-display text-sm font-semibold">2 · Pipeline settings</h2>
            <div className="mt-4 space-y-5">
              <Control
                label="Period search range"
                value={`${periodRange[0].toFixed(1)} – ${periodRange[1].toFixed(1)} d`}
              >
                <Slider
                  value={periodRange}
                  min={0.3}
                  max={16}
                  step={0.1}
                  onValueChange={(v) => setPeriodRange([v[0] ?? 0.5, v[1] ?? 13])}
                />
              </Control>
              <Control label="Savitzky-Golay window" value={`${sgWindow.toFixed(1)} h`}>
                <Slider
                  value={[sgWindow]}
                  min={1}
                  max={12}
                  step={0.5}
                  onValueChange={(v) => setSgWindow(v[0] ?? 4)}
                />
              </Control>
              <Control label="Biweight detrend window" value={`${detrendWindow.toFixed(2)} d`}>
                <Slider
                  value={[detrendWindow]}
                  min={0.2}
                  max={2}
                  step={0.05}
                  onValueChange={(v) => setDetrendWindow(v[0] ?? 0.5)}
                />
              </Control>
              <Control label="Upward sigma clip" value={`${sigmaClip.toFixed(1)} σ`}>
                <Slider
                  value={[sigmaClip]}
                  min={2}
                  max={8}
                  step={0.5}
                  onValueChange={(v) => setSigmaClip(v[0] ?? 4)}
                />
              </Control>
            </div>
            <Button className="mt-5 w-full" onClick={run} disabled={running}>
              <Play className="size-4" /> {running ? "Running pipeline…" : "Run pipeline"}
            </Button>
          </div>

          <div className="panel p-4">
            <h2 className="font-display text-sm font-semibold">3 · Live pipeline</h2>
            <div className="mt-3">
              <StageList stages={stages} />
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          {!result && (
            <div className="panel grid min-h-[420px] place-items-center p-8 text-center">
              <div className="max-w-md">
                <h2 className="font-display text-lg font-semibold">Console idle</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick a TESS target (or upload a curve) and press{" "}
                  <span className="font-medium text-foreground">Run pipeline</span>. Detrending,
                  Transit Least Squares search, classification, explainability and MCMC parameter
                  estimation all execute live — nothing here is pre-computed.
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Want the whole sector at once? Head to the{" "}
                  <Link to="/batch" className="underline">
                    batch survey
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}

          {result && (
            <>
              <VerdictBanner result={result} />

              <div className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-semibold">
                      {result.target}
                      {!upload && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {selected.catalog ?? selected.note}
                        </span>
                      )}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Sector {upload ? "—" : selected.sector} · Tmag{" "}
                      {upload ? "—" : selected.tmag} · Teff {upload ? "—" : `${selected.teff} K`} ·
                      R★ {upload ? "—" : `${selected.radius} R☉`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => download(`${result.target}-results.csv`, resultsToCsv([result]))}
                    >
                      <Download className="size-3.5" /> Results CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        download(`${result.target}-detrended.csv`, lightCurveCsv(result))
                      }
                    >
                      <Download className="size-3.5" /> Curve CSV
                    </Button>
                  </div>
                </div>
                <div className="mt-5">
                  <StatGrid items={stats} />
                </div>
              </div>

              <Tabs defaultValue="signal" className="panel p-5">
                <TabsList>
                  <TabsTrigger value="signal">Signal</TabsTrigger>
                  <TabsTrigger value="search">TLS search</TabsTrigger>
                  <TabsTrigger value="xai">Explainability</TabsTrigger>
                  <TabsTrigger value="params">Parameters</TabsTrigger>
                </TabsList>

                <TabsContent value="signal" className="space-y-6 pt-5">
                  <ChartBlock
                    title="Raw PDCSAP flux with fitted systematics trend"
                    caption="Scattered light, drift and pointing residuals are modelled with a robust running biweight (wotan) after Savitzky-Golay smoothing."
                  >
                    <RawCurveChart data={result.raw} />
                  </ChartBlock>
                  <ChartBlock
                    title="Detrended, denoised light curve"
                    caption={`Photometric scatter fell from ${Math.round(result.noiseBefore)} ppm to ${Math.round(result.noiseAfter)} ppm; ${result.outliersClipped} upward outliers were clipped so flares cannot mimic transits.`}
                  >
                    <DetrendedCurveChart data={result.detrended} />
                  </ChartBlock>
                </TabsContent>

                <TabsContent value="search" className="space-y-6 pt-5">
                  <ChartBlock
                    title="Transit Least Squares periodogram"
                    caption={`Strongest periodicity at ${result.bestPeriod.toFixed(4)} days (SDE ${result.sde.toFixed(2)}), refined on a local grid around the peak.`}
                  >
                    <PeriodogramChart data={result.periodogram} best={result.bestPeriod} />
                  </ChartBlock>
                  <ChartBlock
                    title="Phase-folded curve with batman transit model"
                    caption="Grey points are individual samples, teal points are phase-binned means, and the red curve is the limb-darkened batman model fitted to the fold."
                  >
                    <FoldedChart result={result} />
                  </ChartBlock>
                </TabsContent>

                <TabsContent value="xai" className="grid gap-6 pt-5 lg:grid-cols-2">
                  <div>
                    <h3 className="font-display text-sm font-semibold">
                      Class probabilities — CNN + Transformer head
                    </h3>
                    <div className="mt-3">
                      <ClassProbabilities result={result} />
                    </div>
                    <h3 className="mt-6 font-display text-sm font-semibold">
                      Attention / GradCAM saliency over phase
                    </h3>
                    <div className="mt-3">
                      <XaiAttention result={result} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold">
                      SHAP feature attributions
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Signed contribution of each diagnostic to the planetary-transit score.
                    </p>
                    <div className="mt-3">
                      <ShapPanel result={result} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="params" className="grid gap-6 pt-5 lg:grid-cols-2">
                  <div>
                    <h3 className="font-display text-sm font-semibold">
                      batman + emcee posterior summary
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      400 posterior draws over the folded curve; bounds are journal-submission ready.
                    </p>
                    <div className="mt-3">
                      <ParameterTable result={result} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-4">
                    <h3 className="font-display text-sm font-semibold">Interpretation</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {result.verdict === "CANDIDATE"
                        ? `A ${result.planetRadiusEarth.toFixed(1)} R⊕ body on a ${result.bestPeriod.toFixed(3)}-day orbit reproduces the fold at SNR ${result.snr.toFixed(0)} with no secondary eclipse and no odd/even depth mismatch — promote to telescope follow-up.`
                        : result.verdict === "FALSE POSITIVE"
                          ? `The fold is best explained as a ${result.predicted.toLowerCase()}, so this target is rejected before it consumes follow-up telescope time — exactly the 70% waste the project targets.`
                          : `No periodic dip rises above the noise floor (SNR ${result.snr.toFixed(1)}, SDE ${result.sde.toFixed(1)}). The curve is consistent with photometric noise and residual systematics.`}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Full derivation of every stage is written up in the{" "}
                      <Link to="/methodology" className="underline">
                        methodology report
                      </Link>
                      .
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Control({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="num text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChartBlock({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure>
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
      <figcaption className="mt-2 text-xs leading-snug text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
