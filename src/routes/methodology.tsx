import { createFileRoute } from "@tanstack/react-router";

import { MODEL_METRICS, PIPELINE_STAGES } from "@/lib/pipeline/targets";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — PragyaVyom Pipeline" },
      {
        name: "description",
        content:
          "Stage-by-stage methodology of the PragyaVyom exoplanet pipeline: denoising, augmentation, Transit Least Squares, hybrid CNN+Transformer classification, XAI and MCMC parameter estimation.",
      },
      { property: "og:title", content: "Methodology — PragyaVyom Pipeline" },
      {
        property: "og:description",
        content: "How each of the seven pipeline stages works, and why every verdict is auditable.",
      },
    ],
  }),
  component: Methodology,
});

const DIAGNOSTICS = [
  ["Transit SNR", "Folded depth against per-point scatter — the primary detectability test."],
  ["Signal Detection Efficiency", "Height of the TLS periodogram peak above the local noise floor."],
  ["Odd/even depth ratio", "A mismatch betrays an eclipsing binary seen at half the true period."],
  ["Secondary eclipse depth", "A dip at phase 0.5 marks a self-luminous companion, not a planet."],
  ["V-shape metric", "Width ratio at 25% and 75% depth separates grazing events from flat-bottomed transits."],
  ["Duration consistency", "Observed duration versus the value implied by the period and stellar radius."],
];

function Methodology() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-10">
      <h1 className="font-display text-2xl font-semibold">Methodology</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Roughly 70% of transit-like detections turn out to be eclipsing binaries, background blends
        or stellar variability, and each one still consumes follow-up telescope time. PragyaVyom
        combines classical transit photometry with a hybrid deep model and an explainability layer so
        every verdict arrives with the physical reason behind it.
      </p>

      <ol className="mt-8 space-y-4">
        {PIPELINE_STAGES.map((s, i) => (
          <li key={s.id} className="panel p-4">
            <p className="num label-caps">Stage {i + 1}</p>
            <h2 className="mt-1 font-display text-base font-semibold">{s.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 font-display text-lg font-semibold">Vetting diagnostics</h2>
      <dl className="mt-3 space-y-3">
        {DIAGNOSTICS.map(([k, v]) => (
          <div key={k} className="border-b border-border/60 pb-3">
            <dt className="text-sm font-medium">{k}</dt>
            <dd className="mt-0.5 text-sm text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 font-display text-lg font-semibold">Benchmark</h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Accuracy", `${MODEL_METRICS.accuracy}%`],
          ["False positives", `${MODEL_METRICS.falsePositiveRate}%`],
          ["Baseline FP rate", `${MODEL_METRICS.baselineFalsePositiveRate}%`],
          ["Training curves", MODEL_METRICS.trainingCurves.toLocaleString()],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="label-caps">{k}</dt>
            <dd className="num text-xl">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
