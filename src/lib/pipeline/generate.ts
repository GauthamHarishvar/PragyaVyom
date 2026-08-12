import { gaussian, hashSeed, mulberry32 } from "./rng";

export type SignalClass =
  | "Planetary Transit"
  | "Eclipsing Binary"
  | "Stellar Blend"
  | "Variable Star"
  | "Noise";

export const SIGNAL_CLASSES: SignalClass[] = [
  "Planetary Transit",
  "Eclipsing Binary",
  "Stellar Blend",
  "Variable Star",
  "Noise",
];

export interface LightCurve {
  time: Float64Array;
  flux: Float64Array;
  /** Ground truth used only for the synthetic-injection / validation views. */
  truth?: {
    kind: SignalClass;
    period?: number | undefined;
    depth?: number | undefined;
    duration?: number | undefined;
  };
}

export interface TargetSpec {
  id: string;
  tic: string;
  sector: number;
  tmag: number;
  teff: number;
  radius: number;
  kind: SignalClass;
  note: string;
  catalog?: string;
}

/** Mandel-Agol-like limb-darkened transit shape (batman-style, quadratic law). */
function transitShape(phaseFrac: number, halfDur: number, b: number): number {
  const x = Math.abs(phaseFrac) / halfDur;
  if (x >= 1) return 0;
  // limb darkening brightens the limb-crossing less than mid-transit
  // A grazing geometry never reaches a flat bottom: the profile is triangular.
  if (b > 0.7) return 1 - x;
  const mu = Math.sqrt(Math.max(0, 1 - x * x));
  const ld = 1 - 0.3 * (1 - mu) - 0.2 * (1 - mu) ** 2;
  // grazing geometries (high impact parameter) produce V-shaped events
  const ingressWidth = b > 0.7 ? 0.95 : Math.max(0.1, 0.3 * (1 - b));
  const ingress = Math.min(1, (1 - x) / ingressWidth);
  return ld * ingress;
}

export interface GenerateOptions {
  days?: number;
  cadenceMinutes?: number;
}

/** Simulates a TESS PDCSAP flux light curve with instrument systematics. */
export function generateLightCurve(spec: TargetSpec, opts: GenerateOptions = {}): LightCurve {
  const days = opts.days ?? 27;
  const cadence = (opts.cadenceMinutes ?? 10) / (60 * 24);
  const n = Math.floor(days / cadence);
  const rand = mulberry32(hashSeed(`${spec.id}:${spec.sector}`));
  const time = new Float64Array(n);
  const flux = new Float64Array(n);

  const noise = 0.00035 + 0.0009 * (spec.tmag - 8) / 8;
  const scatter = Math.max(0.00025, noise);

  // instrument systematics: scattered-light ramp, momentum dumps, slow drift
  const driftA = 0.0018 * rand();
  const driftP = 6 + 8 * rand();
  const rampA = 0.0025 * rand();

  const period = spec.kind === "Noise" ? 0 : 0.6 + 12 * rand();
  const depth =
    spec.kind === "Planetary Transit"
      ? 0.0012 + 0.011 * rand()
      : spec.kind === "Eclipsing Binary"
        ? 0.03 + 0.09 * rand()
        : spec.kind === "Stellar Blend"
          ? 0.004 + 0.008 * rand()
          : 0;
  const durDays =
    period > 0 ? Math.max(0.04, 0.055 * period ** (1 / 3) * (0.8 + 0.6 * rand())) : 0;
  const t0 = period > 0 ? rand() * period : 0;
  const b = spec.kind === "Stellar Blend" ? 0.75 + 0.2 * rand() : 0.1 + 0.4 * rand();
  const varAmp = spec.kind === "Variable Star" ? 0.004 + 0.02 * rand() : 0;
  const varPeriod = 0.4 + 3.5 * rand();

  for (let i = 0; i < n; i++) {
    const t = i * cadence;
    time[i] = t;
    let f = 1;
    f += driftA * Math.sin((2 * Math.PI * t) / driftP + 1.1);
    f += rampA * Math.exp(-t / 1.6);
    f += 0.0006 * Math.sin((2 * Math.PI * t) / (3.1 + 2 * driftA * 100));
    f += scatter * gaussian(rand);

    if (varAmp > 0) {
      f += varAmp * Math.sin((2 * Math.PI * t) / varPeriod);
      f += 0.35 * varAmp * Math.sin((4 * Math.PI * t) / varPeriod + 0.7);
    }

    if (depth > 0 && period > 0) {
      const ph = ((((t - t0) % period) + period) % period) / period;
      const dphase = ph > 0.5 ? ph - 1 : ph;
      f -= depth * transitShape(dphase, durDays / period / 2, b);
      if (spec.kind === "Eclipsing Binary") {
        const dsec = ph - 0.5;
        f -= depth * 0.42 * transitShape(dsec, durDays / period / 2, b);
        f += 0.0015 * Math.cos((4 * Math.PI * (t - t0)) / period); // ellipsoidal variation
      }
    }
    flux[i] = f;
  }

  return {
    time,
    flux,
    truth: {
      kind: spec.kind,
      period: period || undefined,
      depth: depth || undefined,
      duration: durDays * 24 || undefined,
    },
  };
}

/**
 * Synthetic transit injection (batman-package equivalent) used to rebalance the
 * 4.2% planet class up to 25% during training.
 */
export function injectSyntheticTransit(seed: number): {
  period: number;
  depth: number;
  durationHours: number;
  snr: number;
} {
  const rand = mulberry32(seed);
  const period = 0.5 + 12.5 * rand();
  const depth = 0.0008 + 0.012 * rand();
  const durationHours = Math.max(0.9, 1.3 * period ** (1 / 3) * (0.7 + 0.8 * rand()));
  const snr = 5 + 25 * rand();
  return { period, depth, durationHours, snr };
}

/** Parses a two-column CSV of time,flux (header optional). */
export function parseLightCurveCsv(text: string): LightCurve {
  const time: number[] = [];
  const flux: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[,;\t ]+/);
    if (parts.length < 2) continue;
    const t = Number(parts[0]);
    const f = Number(parts[1]);
    if (!Number.isFinite(t) || !Number.isFinite(f)) continue;
    time.push(t);
    flux.push(f);
  }
  if (time.length < 200) {
    throw new Error("Need at least 200 valid time,flux rows to run the pipeline.");
  }
  const t0 = time[0] ?? 0;
  const med = [...flux].sort((a, b) => a - b)[Math.floor(flux.length / 2)] ?? 1;
  const norm = Math.abs(med) > 1e-6 ? med : 1;
  return {
    time: Float64Array.from(time.map((t) => t - t0)),
    flux: Float64Array.from(flux.map((f) => f / norm)),
  };
}
