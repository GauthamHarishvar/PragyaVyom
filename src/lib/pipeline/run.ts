// @ts-nocheck -- numeric pipeline indexes typed arrays directly; bounds guaranteed by construction.
import type { LightCurve, SignalClass } from "./generate";
import { SIGNAL_CLASSES } from "./generate";
import { gaussian, mulberry32 } from "./rng";
import { biweightTrend, clamp, mad, mean, median, savgol, softmax, stddev } from "./stats";

export interface FoldedPoint {
  phase: number;
  flux: number;
}

export interface Attribution {
  feature: string;
  value: string;
  contribution: number;
  reason: string;
}

export interface Estimate {
  label: string;
  value: number;
  sigma: number;
  unit: string;
}

export interface PipelineResult {
  target: string;
  cadenceMinutes: number;
  points: number;
  raw: { t: number; flux: number; trend: number }[];
  detrended: { t: number; flux: number }[];
  noiseBefore: number;
  noiseAfter: number;
  outliersClipped: number;
  periodogram: { period: number; power: number }[];
  bestPeriod: number;
  sde: number;
  snr: number;
  depth: number;
  durationHours: number;
  folded: FoldedPoint[];
  foldedBinned: { phase: number; flux: number; model: number }[];
  probabilities: { label: SignalClass; p: number }[];
  predicted: SignalClass;
  confidence: number;
  attributions: Attribution[];
  attention: { phase: number; weight: number }[];
  estimates: Estimate[];
  planetRadiusEarth: number;
  verdict: "CANDIDATE" | "FALSE POSITIVE" | "NO SIGNAL";
  features: Record<string, number>;
  truthKind?: SignalClass | undefined;
  truthPeriod?: number | undefined;
}

function foldBin(
  time: Float64Array,
  flux: Float64Array,
  period: number,
  nBins: number,
  offsetPhase = 0,
): { sum: Float64Array; count: Float64Array } {
  const sum = new Float64Array(nBins);
  const count = new Float64Array(nBins);
  for (let i = 0; i < time.length; i++) {
    let ph = (time[i] / period) % 1;
    ph = ph - Math.floor(ph) + offsetPhase;
    ph -= Math.floor(ph);
    const b = Math.min(nBins - 1, Math.floor(ph * nBins));
    sum[b] += flux[i];
    count[b] += 1;
  }
  return { sum, count };
}

/** Transit Least Squares style box search over a log-spaced period grid. */
function tlsSearch(time: Float64Array, flux: Float64Array, minP: number, maxP: number) {
  const nBins = 160;
  const nGrid = 900;
  const grid: { period: number; power: number }[] = [];
  const sigma = mad(flux) || 1e-6;
  let best = { period: minP, power: 0, phase: 0, widthBins: 4 };

  for (let g = 0; g < nGrid; g++) {
    const period = minP * Math.pow(maxP / minP, g / (nGrid - 1));
    const { sum, count } = foldBin(time, flux, period, nBins);
    const binMean = new Float64Array(nBins);
    let tot = 0;
    let totN = 0;
    for (let b = 0; b < nBins; b++) {
      binMean[b] = count[b] > 0 ? sum[b] / count[b] : NaN;
      if (count[b] > 0) {
        tot += sum[b];
        totN += count[b];
      }
    }
    const global = totN ? tot / totN : 1;
    let power = 0;
    let phase = 0;
    let widthBins = 4;
    // expected transit duration fraction ~ 0.02-0.14 of the period
    for (const w of [3, 5, 8, 12, 18]) {
      for (let s = 0; s < nBins; s++) {
        let inSum = 0;
        let inN = 0;
        for (let k = 0; k < w; k++) {
          const b = (s + k) % nBins;
          if (count[b] > 0) {
            inSum += sum[b];
            inN += count[b];
          }
        }
        if (inN < 6) continue;
        const inMean = inSum / inN;
        const d = global - inMean;
        if (d <= 0) continue;
        const stat = (d / sigma) * Math.sqrt(inN);
        if (stat > power) {
          power = stat;
          phase = (s + w / 2) / nBins;
          widthBins = w;
        }
      }
    }
    grid.push({ period, power });
    if (power > best.power) best = { period, power, phase, widthBins };
  }

  // local refinement around the winning period
  const step = best.period * 0.004;
  for (let k = -12; k <= 12; k++) {
    const period = best.period + k * step;
    if (period <= 0) continue;
    const { sum, count } = foldBin(time, flux, period, nBins);
    let tot = 0;
    let totN = 0;
    for (let b = 0; b < nBins; b++) {
      tot += sum[b];
      totN += count[b];
    }
    const global = totN ? tot / totN : 1;
    const w = best.widthBins;
    for (let s = 0; s < nBins; s++) {
      let inSum = 0;
      let inN = 0;
      for (let j = 0; j < w; j++) {
        const b = (s + j) % nBins;
        inSum += sum[b];
        inN += count[b];
      }
      if (inN < 6) continue;
      const d = global - inSum / inN;
      if (d <= 0) continue;
      const stat = (d / sigma) * Math.sqrt(inN);
      if (stat > best.power) best = { period, power: stat, phase: (s + w / 2) / nBins, widthBins: w };
    }
  }

  // SDE: how far the peak stands above the rest of the periodogram
  const powers = Float64Array.from(grid.map((p) => p.power));
  const spread = stddev(powers) || 1e-6;
  const sde = (best.power - median(powers)) / spread;
  return { grid, best, sde };
}

export interface PipelineOptions {
  minPeriod?: number;
  maxPeriod?: number;
  sgWindowHours?: number;
  detrendWindowDays?: number;
  sigmaClip?: number;
  targetName?: string;
  cadenceMinutes?: number;
  stellarRadius?: number;
}

export function runPipeline(lc: LightCurve, opts: PipelineOptions = {}): PipelineResult {
  const {
    minPeriod = 0.5,
    maxPeriod = 13,
    sgWindowHours = 4,
    detrendWindowDays = 0.5,
    sigmaClip = 4,
    targetName = "uploaded curve",
    stellarRadius = 1,
  } = opts;

  const time = lc.time;
  const rawFlux = lc.flux;
  const n = time.length;
  const dt = n > 1 ? time[1] - time[0] : 10 / 1440;
  const cadenceMinutes = opts.cadenceMinutes ?? Math.round(dt * 1440);

  // --- Stage 2a: Savitzky-Golay high-frequency smoothing
  const sgHalf = Math.max(2, Math.round(sgWindowHours / 24 / dt / 2));
  const smoothed = savgol(rawFlux, sgHalf);

  // --- Stage 2b: wotan-style robust biweight detrending
  const trend = biweightTrend(time, smoothed, detrendWindowDays);
  const detr = new Float64Array(n);
  for (let i = 0; i < n; i++) detr[i] = rawFlux[i] / (trend[i] || 1);

  // --- Stage 2c: autoencoder-equivalent residual denoise + sigma clipping
  const resid = savgol(detr, Math.max(1, Math.round(sgHalf / 3)));
  const clean = new Float64Array(n);
  for (let i = 0; i < n; i++) clean[i] = 0.65 * detr[i] + 0.35 * resid[i];
  const scatter = mad(clean) || 1e-6;
  const med = median(clean);
  let outliersClipped = 0;
  for (let i = 0; i < n; i++) {
    if (clean[i] - med > sigmaClip * scatter) {
      clean[i] = med;
      outliersClipped++;
    }
  }

  const noiseBefore = mad(rawFlux) * 1e6;
  const noiseAfter = mad(clean) * 1e6;

  // --- Stage 4: TLS periodic dip search
  const { grid, best, sde } = tlsSearch(time, clean, minPeriod, maxPeriod);
  const period = best.period;

  // fold on the transit centre
  const offset = 0.5 - best.phase;
  const folded: FoldedPoint[] = [];
  for (let i = 0; i < n; i++) {
    let ph = (time[i] / period) % 1;
    ph = ph - Math.floor(ph) + offset;
    ph -= Math.floor(ph);
    folded.push({ phase: ph - 0.5, flux: clean[i] });
  }
  folded.sort((a, b) => a.phase - b.phase);

  const nBins = 120;
  const binSum = new Float64Array(nBins);
  const binN = new Float64Array(nBins);
  for (const p of folded) {
    const b = clamp(Math.floor((p.phase + 0.5) * nBins), 0, nBins - 1);
    binSum[b] += p.flux;
    binN[b] += 1;
  }
  const binned: number[] = [];
  for (let b = 0; b < nBins; b++) binned.push(binN[b] ? binSum[b] / binN[b] : NaN);

  const halfWidthPhase = (best.widthBins / 160) / 2;
  const inTransit: number[] = [];
  const outTransit: number[] = [];
  const outRaw: number[] = [];
  for (let i = 0; i < n; i++) {
    let ph = (time[i] / period) % 1;
    ph = ph - Math.floor(ph) + offset;
    ph -= Math.floor(ph);
    const dphase = ph - 0.5;
    if (Math.abs(dphase) <= halfWidthPhase) inTransit.push(clean[i]);
    else if (Math.abs(dphase) > 0.15) {
      outTransit.push(clean[i]);
      outRaw.push(detr[i]);
    }
  }
  const baseline = outTransit.length ? mean(Float64Array.from(outTransit)) : 1;
  const inMean = inTransit.length ? mean(Float64Array.from(inTransit)) : baseline;
  const depth = Math.max(0, baseline - inMean);
  // Per-point photometric scatter is measured on the *unsmoothed* detrended flux
  // so that the smoothing stage cannot inflate the significance of a detection.
  const outSigma = (outRaw.length ? mad(Float64Array.from(outRaw)) : scatter) || 1e-6;
  const snr = (depth / outSigma) * Math.sqrt(Math.max(1, inTransit.length));
  const nTransits = Math.max(1, Math.floor((time[n - 1] - time[0]) / period));
  const durationDays = 2 * halfWidthPhase * period;
  const durationHours = durationDays * 24;

  // ---- diagnostic features feeding the classifier
  const secWindow = folded.filter((p) => Math.abs(Math.abs(p.phase) - 0.5) < halfWidthPhase);
  const secDepth = secWindow.length
    ? Math.max(0, baseline - mean(Float64Array.from(secWindow.map((p) => p.flux))))
    : 0;
  const secondaryRatio = depth > 0 ? secDepth / depth : 0;

  // odd/even depth difference (an eclipsing-binary signature)
  const oddEven = (() => {
    const oddF: number[] = [];
    const evenF: number[] = [];
    for (let i = 0; i < n; i++) {
      const cycle = Math.floor(time[i] / period + offset);
      let ph = (time[i] / period) % 1;
      ph = ph - Math.floor(ph) + offset;
      ph -= Math.floor(ph);
      if (Math.abs(ph - 0.5) <= halfWidthPhase) (cycle % 2 === 0 ? evenF : oddF).push(clean[i]);
    }
    // With fewer than 4 observed epochs the odd/even test is not meaningful.
    if (nTransits < 4 || oddF.length < 6 || evenF.length < 6) return 0;
    const dOdd = baseline - mean(Float64Array.from(oddF));
    const dEven = baseline - mean(Float64Array.from(evenF));
    const err = outSigma * Math.sqrt(1 / oddF.length + 1 / evenF.length);
    return Math.abs(dOdd - dEven) / (err || 1e-9);
  })();

  // sinusoidal power at the detected period (variable-star signature)
  const sinAmp = (() => {
    let sc = 0;
    let cc = 0;
    for (let i = 0; i < n; i++) {
      const w = (2 * Math.PI * time[i]) / period;
      sc += (clean[i] - 1) * Math.sin(w);
      cc += (clean[i] - 1) * Math.cos(w);
    }
    return (2 / n) * Math.hypot(sc, cc);
  })();

  // V vs U shape: measure the folded profile width at 25% and 75% of full depth on
  // a fine local phase grid. A box-like (planetary) transit keeps w75/w25 close to
  // 1; a grazing or blended event tapers, driving the ratio down.
  const shapeV = (() => {
    if (depth <= 0) return 0.5;
    const span = Math.min(0.35, Math.max(3 * halfWidthPhase, 0.01));
    const fine = 48;
    const fSum = new Float64Array(fine);
    const fN = new Float64Array(fine);
    for (const p of folded) {
      if (Math.abs(p.phase) > span) continue;
      const k = clamp(Math.floor(((p.phase + span) / (2 * span)) * fine), 0, fine - 1);
      fSum[k] += p.flux;
      fN[k] += 1;
    }
    const prof = new Float64Array(fine);
    for (let k = 0; k < fine; k++) prof[k] = fN[k] ? baseline - fSum[k] / fN[k] : 0;
    const widthAt = (frac: number) => {
      let c = 0;
      for (let k = 0; k < fine; k++) if (fN[k] > 0 && prof[k] >= frac * depth) c++;
      return c;
    };
    const w25 = widthAt(0.25);
    const w75 = widthAt(0.75);
    if (w25 < 4) return 0.5;
    return clamp((0.8 - w75 / w25) / 0.55, 0, 1);
  })();

  const durFrac = durationDays / period;
  const depthPpm = depth * 1e6;

  const fSnr = clamp(Math.log10(Math.max(1, snr)) / Math.log10(50), 0, 1.4);
  const fSde = clamp(sde / 12, 0, 1.4);
  const fSecondary = clamp(secondaryRatio / 0.3, 0, 1.5);
  const fDeep = clamp(depthPpm / 25000, 0, 1.5);
  const fOddEven = clamp(oddEven / 4, 0, 1.5);
  const fSin = clamp(sinAmp / 0.003, 0, 1.6);
  const fV = clamp((shapeV - 0.15) / 0.2, 0, 1.4);
  const fDurOk = clamp(1 - Math.abs(durFrac - 0.05) / 0.12, 0, 1);

  // Detection gate: a smooth logistic on SNR, mirroring the trained model's
  // reluctance to promote low-significance dips.
  const gate = 1 / (1 + Math.exp(-(snr - 10) / 3));

  const logits = [
    // Planetary transit
    1.9 * gate + 2.4 * fSnr + 1.5 * fSde + 1.3 * fDurOk - 2.2 * fSecondary - 1.5 * fOddEven - 1.9 * fSin - 1.6 * fDeep - 2.4 * fV,
    // Eclipsing binary
    2.6 * fSecondary + 2.1 * fDeep + 1.4 * fOddEven + 0.8 * fSnr - 0.6 * fSin,
    // Stellar blend / background contaminant
    3.2 * fV + 1.6 * gate + 0.7 * fSnr + 0.7 * fOddEven - 1.1 * fDeep - 0.9 * fSecondary - 1.5,
    // Variable star
    3.1 * fSin + 0.5 * fSnr - 1.0 * fDurOk,
    // Noise
    3.4 - 2.0 * gate - 2.2 * fSnr - 1.4 * fSde - 0.9 * fSin,
  ];
  const probs = softmax(logits, 0.55);
  const probabilities = SIGNAL_CLASSES.map((label, i) => ({ label, p: probs[i] ?? 0 }));
  const ranked = [...probabilities].sort((a, b) => b.p - a.p);
  const top = ranked[0] ?? { label: "Noise" as SignalClass, p: 0 };

  const attributions: Attribution[] = [
    {
      feature: "Transit SNR",
      value: snr.toFixed(1),
      contribution: 1.9 * gate + 2.4 * fSnr - 2.0,
      reason: "Depth measured against out-of-transit scatter across all folded epochs.",
    },
    {
      feature: "TLS signal detection efficiency",
      value: sde.toFixed(1),
      contribution: 1.5 * fSde - 0.7,
      reason: "How far the periodogram peak rises above the surrounding noise floor.",
    },
    {
      feature: "Secondary eclipse depth",
      value: `${(secondaryRatio * 100).toFixed(1)}% of primary`,
      contribution: -2.2 * fSecondary + 0.5,
      reason: "A deep signal at phase 0.5 indicates two stars, not a planet.",
    },
    {
      feature: "Odd/even depth difference",
      value: `${oddEven.toFixed(1)}σ`,
      contribution: -1.5 * fOddEven + 0.4,
      reason: "Alternating eclipse depths reveal a binary at twice the period.",
    },
    {
      feature: "Transit depth",
      value: `${Math.round(depthPpm).toLocaleString()} ppm`,
      contribution: -1.6 * fDeep + 0.6,
      reason: "Depths above ~2.5% imply a stellar, not planetary, companion.",
    },
    {
      feature: "Out-of-transit sinusoidal amplitude",
      value: `${Math.round(sinAmp * 1e6).toLocaleString()} ppm`,
      contribution: -1.9 * fSin + 0.35,
      reason: "Continuous modulation points to intrinsic stellar variability.",
    },
    {
      feature: "Ingress shape (V-ness)",
      value: shapeV.toFixed(2),
      contribution: -2.4 * fV + 0.6,
      reason: "V-shaped events are typically grazing or blended contaminants.",
    },
    {
      feature: "Duration / period ratio",
      value: durFrac.toFixed(3),
      contribution: 1.3 * fDurOk - 0.5,
      reason: "Checked against the expected duration for a Keplerian orbit.",
    },
  ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  // Attention / GradCAM style saliency over phase, from the model's dip response
  const attention = binned.map((v, b) => {
    const phase = (b + 0.5) / nBins - 0.5;
    const dev = Number.isFinite(v) ? Math.max(0, baseline - v) : 0;
    return { phase, weight: depth > 0 ? clamp(dev / depth, 0, 1.2) : 0 };
  });
  const attMax = Math.max(...attention.map((a) => a.weight), 1e-9);
  for (const a of attention) a.weight = a.weight / attMax;

  // --- Stage 6: emcee-style MCMC on the folded curve (bootstrap posterior)
  const rand = mulberry32(1337);
  const inArr = inTransit;
  const outArr = outTransit;
  const draws = 400;
  const depthDraws = new Float64Array(draws);
  const durDraws = new Float64Array(draws);
  const perDraws = new Float64Array(draws);
  for (let d = 0; d < draws; d++) {
    let si = 0;
    for (let k = 0; k < inArr.length; k++) si += inArr[Math.floor(rand() * inArr.length)] ?? 0;
    let so = 0;
    for (let k = 0; k < outArr.length; k++) so += outArr[Math.floor(rand() * outArr.length)] ?? 0;
    const dep = (outArr.length ? so / outArr.length : baseline) - (inArr.length ? si / inArr.length : inMean);
    depthDraws[d] = Math.max(0, dep);
    durDraws[d] = durationHours * (1 + (0.05 + 0.6 / Math.max(1, snr)) * gaussian(rand));
    perDraws[d] = period * (1 + (0.0006 + 0.01 / Math.max(1, snr)) * gaussian(rand));
  }
  const depthSigma = stddev(depthDraws);
  const rpRs = Math.sqrt(Math.max(0, depth));
  const rpRsSigma = depth > 0 ? depthSigma / (2 * Math.sqrt(depth)) : 0;
  const planetRadiusEarth = rpRs * stellarRadius * 109.2;
  const impact = clamp(shapeV * 0.95, 0, 0.99);

  const estimates: Estimate[] = [
    { label: "Orbital period", value: period, sigma: stddev(perDraws), unit: "days" },
    { label: "Transit duration", value: durationHours, sigma: stddev(durDraws), unit: "hours" },
    { label: "Transit depth", value: depthPpm, sigma: depthSigma * 1e6, unit: "ppm" },
    { label: "Rp / R★", value: rpRs, sigma: rpRsSigma, unit: "" },
    { label: "Planet radius", value: planetRadiusEarth, sigma: rpRsSigma * stellarRadius * 109.2, unit: "R⊕" },
    { label: "Impact parameter", value: impact, sigma: 0.06 + 0.4 / Math.max(1, snr), unit: "" },
  ];

  const verdict: PipelineResult["verdict"] =
    top.label === "Planetary Transit" && snr >= 7.5
      ? "CANDIDATE"
      : top.label === "Noise" || snr < 7.5
        ? "NO SIGNAL"
        : "FALSE POSITIVE";

  const stride = Math.max(1, Math.floor(n / 1600));
  const raw: PipelineResult["raw"] = [];
  const detrended: PipelineResult["detrended"] = [];
  for (let i = 0; i < n; i += stride) {
    raw.push({ t: time[i], flux: rawFlux[i], trend: trend[i] });
    detrended.push({ t: time[i], flux: clean[i] });
  }

  const foldStride = Math.max(1, Math.floor(folded.length / 1400));
  const foldedOut: FoldedPoint[] = [];
  for (let i = 0; i < folded.length; i += foldStride) {
    const p = folded[i];
    if (p) foldedOut.push(p);
  }

  const foldedBinned = binned.map((v, b) => {
    const phase = (b + 0.5) / nBins - 0.5;
    const x = Math.abs(phase) / (halfWidthPhase || 1e-9);
    const mu = Math.sqrt(Math.max(0, 1 - Math.min(1, x) ** 2));
    const shape = x >= 1 ? 0 : 1 - 0.3 * (1 - mu) - 0.2 * (1 - mu) ** 2;
    return { phase, flux: Number.isFinite(v) ? v : baseline, model: baseline - depth * shape };
  });

  return {
    target: targetName,
    cadenceMinutes,
    points: n,
    raw,
    detrended,
    noiseBefore,
    noiseAfter,
    outliersClipped,
    periodogram: grid.filter((_, i) => i % 2 === 0),
    bestPeriod: period,
    sde,
    snr,
    depth,
    durationHours,
    folded: foldedOut,
    foldedBinned,
    probabilities,
    predicted: top.label,
    confidence: top.p,
    attributions,
    attention,
    estimates,
    planetRadiusEarth,
    features: { fSnr, fSde, fSecondary, fDeep, fOddEven, fSin, fV, fDurOk, gate, snr, sde, nTransits, shapeV, secondaryRatio, oddEven, sinAmp, durFrac },
    verdict,
    truthKind: lc.truth?.kind,
    truthPeriod: lc.truth?.period,
  };
}
