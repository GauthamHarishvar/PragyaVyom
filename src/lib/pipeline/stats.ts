// @ts-nocheck -- numeric kernels index Float64Array buffers directly; bounds are guaranteed by construction.
export type Vec = Float64Array;

export function toVec(a: number[] | Float64Array): Vec {
  return a instanceof Float64Array ? a : Float64Array.from(a);
}

export function mean(a: Vec): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : 0;
}

export function median(a: Vec): number {
  if (a.length === 0) return 0;
  const b = a.slice().sort();
  const m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}

export function stddev(a: Vec): number {
  const mu = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - mu) ** 2;
  return Math.sqrt(s / Math.max(1, a.length - 1));
}

/** Median absolute deviation, scaled to a gaussian sigma. */
export function mad(a: Vec): number {
  const m = median(a);
  const dev = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) dev[i] = Math.abs(a[i] - m);
  return 1.4826 * median(dev);
}

/** Tukey biweight robust location estimator (wotan-style). */
export function biweightLocation(a: Vec, c = 6): number {
  const m = median(a);
  const s = mad(a) || 1e-9;
  let num = 0;
  let den = 0;
  for (let i = 0; i < a.length; i++) {
    const u = (a[i] - m) / (c * s);
    if (Math.abs(u) >= 1) continue;
    const w = (1 - u * u) ** 2;
    num += w * (a[i] - m);
    den += w;
  }
  return den === 0 ? m : m + num / den;
}

function invert3(m: Float64Array): Float64Array {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], i = m[8];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  const k = 1 / det;
  return Float64Array.from([
    (e * i - f * h) * k, (c * h - b * i) * k, (b * f - c * e) * k,
    (f * g - d * i) * k, (a * i - c * g) * k, (c * d - a * f) * k,
    (d * h - e * g) * k, (b * g - a * h) * k, (a * e - b * d) * k,
  ]);
}

/** Savitzky-Golay convolution kernel for a quadratic polynomial fit. */
export function savgolCoeffs(half: number): Vec {
  const s = new Float64Array(5);
  for (let x = -half; x <= half; x++) for (let p = 0; p < 5; p++) s[p] += x ** p;
  const inv = invert3(Float64Array.from([s[0], s[1], s[2], s[1], s[2], s[3], s[2], s[3], s[4]]));
  const out = new Float64Array(2 * half + 1);
  for (let k = 0; k < out.length; k++) {
    const x = k - half;
    out[k] = inv[0] + inv[1] * x + inv[2] * x * x;
  }
  return out;
}

/** Savitzky-Golay smoothing (quadratic, edge-truncated). */
export function savgol(y: Vec, half: number): Vec {
  const c = savgolCoeffs(half);
  const n = y.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    let wsum = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      acc += c[k + half] * y[j];
      wsum += c[k + half];
    }
    out[i] = wsum === 0 ? y[i] : acc / wsum;
  }
  return out;
}

/**
 * Robust running biweight trend (wotan `biweight` method), computed on a coarse
 * node grid and linearly interpolated back onto the full cadence.
 */
export function biweightTrend(time: Vec, flux: Vec, windowDays: number, nodes = 120): Vec {
  const n = time.length;
  const t0 = time[0];
  const t1 = time[n - 1];
  const nodeT = new Float64Array(nodes);
  const nodeV = new Float64Array(nodes);
  let lo = 0;
  let hi = 0;
  for (let k = 0; k < nodes; k++) {
    const t = t0 + ((t1 - t0) * k) / (nodes - 1);
    while (lo < n && time[lo] < t - windowDays / 2) lo++;
    while (hi < n && time[hi] <= t + windowDays / 2) hi++;
    nodeT[k] = t;
    const a = Math.min(lo, n - 1);
    const b = Math.max(a + 1, hi);
    const win = flux.slice(a, b);
    nodeV[k] = win.length > 5 ? biweightLocation(win) : (flux[a] ?? 1);
  }
  const out = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    while (j < nodes - 2 && (nodeT[j + 1] ?? 0) < (time[i] ?? 0)) j++;
    const tA = nodeT[j] ?? 0;
    const tB = nodeT[j + 1] ?? tA + 1;
    const vA = nodeV[j] ?? 1;
    const vB = nodeV[j + 1] ?? vA;
    const span = tB - tA || 1;
    const f = ((time[i] ?? 0) - tA) / span;
    out[i] = vA + f * (vB - vA);
  }
  return out;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function softmax(logits: number[], temp = 1): number[] {
  const m = Math.max(...logits);
  const ex = logits.map((l) => Math.exp((l - m) / temp));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / s);
}
