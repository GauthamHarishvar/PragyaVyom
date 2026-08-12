import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/project")({
  head: () => ({
    meta: [
      { title: "About the Project — PragyaVyom" },
      {
        name: "description",
        content:
          "PragyaVyom: an explainable AI system for exoplanet detection in TESS photometry, its impact on telescope-time efficiency and its alignment with UN Sustainable Development Goals.",
      },
      { property: "og:title", content: "About the Project — PragyaVyom" },
      {
        property: "og:description",
        content: "Why explainable exoplanet detection matters, and what this prototype demonstrates.",
      },
    ],
  }),
  component: Project,
});

const IMPACT = [
  ["Telescope time saved", "Rejecting binaries and blends before follow-up removes most of the wasted observing hours."],
  ["Auditable science", "SHAP, GradCAM and physical diagnostics mean no verdict is a black box."],
  ["Scales with the archive", "Sub-second per-curve inference keeps pace with sector-scale data releases."],
];

const SDG = [
  ["SDG 4 — Quality Education", "Open, inspectable astronomy tooling students can run and reason about."],
  ["SDG 9 — Industry & Innovation", "Applies modern AI infrastructure to national space-science workflows."],
  ["SDG 17 — Partnerships", "Built on open TESS data and open-source scientific software."],
];

function Project() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-10">
      <h1 className="font-display text-2xl font-semibold">About PragyaVyom</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        PragyaVyom (“wisdom of space”) is an end-to-end, explainable pipeline for finding planets in
        space-telescope photometry. This prototype runs the complete numerical pipeline in the
        browser — denoising, periodic transit search, classification, explanation and parameter
        estimation — so a reviewer can interrogate every step live rather than read about it.
      </p>

      <h2 className="mt-9 font-display text-lg font-semibold">Impact</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {IMPACT.map(([k, v]) => (
          <div key={k} className="panel p-4">
            <p className="text-sm font-medium">{k}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{v}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-9 font-display text-lg font-semibold">Sustainable Development Goals</h2>
      <ul className="mt-3 space-y-3">
        {SDG.map(([k, v]) => (
          <li key={k} className="border-b border-border/60 pb-3">
            <p className="text-sm font-medium">{k}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{v}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-9 font-display text-lg font-semibold">What is real in this prototype</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The light curves are physically simulated TESS-like photometry with instrument systematics,
        and every number shown afterwards is computed from them at run time: Savitzky-Golay and
        biweight detrending, the periodogram search, phase folding, the limb-darkened transit fit,
        the diagnostic features, the class scores and the uncertainty bounds. Uploading your own
        two-column CSV runs the identical code path.
      </p>
    </div>
  );
}
