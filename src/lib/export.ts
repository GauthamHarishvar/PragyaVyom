import type { PipelineResult } from "./pipeline/run";

export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CSV_HEADER = [
  "target",
  "predicted_class",
  "confidence",
  "verdict",
  "period_days",
  "period_err",
  "duration_hours",
  "duration_err",
  "depth_ppm",
  "depth_err_ppm",
  "rp_rs",
  "planet_radius_earth",
  "snr",
  "sde",
];

function row(r: PipelineResult): string[] {
  const get = (label: string) => r.estimates.find((e) => e.label === label);
  const p = get("Orbital period");
  const d = get("Transit duration");
  const dep = get("Transit depth");
  const rp = get("Rp / R★");
  return [
    r.target,
    r.predicted,
    (r.confidence * 100).toFixed(1),
    r.verdict,
    (p?.value ?? 0).toFixed(5),
    (p?.sigma ?? 0).toFixed(5),
    (d?.value ?? 0).toFixed(3),
    (d?.sigma ?? 0).toFixed(3),
    (dep?.value ?? 0).toFixed(1),
    (dep?.sigma ?? 0).toFixed(1),
    (rp?.value ?? 0).toFixed(4),
    r.planetRadiusEarth.toFixed(2),
    r.snr.toFixed(2),
    r.sde.toFixed(2),
  ];
}

export function resultsToCsv(results: PipelineResult[]): string {
  return [CSV_HEADER.join(","), ...results.map((r) => row(r).join(","))].join("\n");
}

export function lightCurveCsv(r: PipelineResult): string {
  return [
    "time_days,detrended_flux",
    ...r.detrended.map((d) => `${d.t.toFixed(6)},${d.flux.toFixed(8)}`),
  ].join("\n");
}
