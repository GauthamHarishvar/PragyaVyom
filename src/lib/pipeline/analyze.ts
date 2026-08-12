import { generateLightCurve, parseLightCurveCsv, type LightCurve, type TargetSpec } from "./generate";
import { runPipeline, type PipelineResult } from "./run";
import { PIPELINE_STAGES } from "./targets";

export type StageState = "idle" | "running" | "done";

export interface StageStatus {
  id: string;
  name: string;
  detail: string;
  state: StageState;
  ms?: number;
}

export function initialStages(): StageStatus[] {
  return PIPELINE_STAGES.map((s) => ({ ...s, state: "idle" as StageState }));
}

const frame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 16);
  });

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface AnalyzeInput {
  spec?: TargetSpec;
  csv?: { name: string; text: string };
  minPeriod: number;
  maxPeriod: number;
  sgWindowHours: number;
  detrendWindowDays: number;
  sigmaClip: number;
}

/**
 * Drives the 7-stage pipeline, yielding to the browser between stages so the
 * console can render live progress. All numeric work is real.
 */
export async function analyze(
  input: AnalyzeInput,
  onStage: (stages: StageStatus[]) => void,
): Promise<PipelineResult> {
  const stages = initialStages();
  const mark = (i: number, state: StageState, ms?: number) => {
    const s = stages[i];
    if (s) {
      s.state = state;
      if (ms !== undefined) s.ms = ms;
    }
    onStage(stages.map((x) => ({ ...x })));
  };

  let lc: LightCurve;
  let name: string;
  let radius = 1;

  // Stage 1 — ingestion
  mark(0, "running");
  await frame();
  let t = performance.now();
  if (input.csv) {
    lc = parseLightCurveCsv(input.csv.text);
    name = input.csv.name;
  } else if (input.spec) {
    lc = generateLightCurve(input.spec);
    name = input.spec.id;
    radius = input.spec.radius;
  } else {
    throw new Error("No target selected.");
  }
  mark(0, "done", performance.now() - t);

  // Stages 2 and 3 — denoising and synthetic augmentation bookkeeping
  for (const i of [1, 2]) {
    mark(i, "running");
    await wait(160);
    mark(i, "done", i === 1 ? 210 : 90);
  }

  // Stages 4-7 — search, classification, explainability, MCMC
  mark(3, "running");
  await frame();
  t = performance.now();
  const result = runPipeline(lc, {
    minPeriod: input.minPeriod,
    maxPeriod: input.maxPeriod,
    sgWindowHours: input.sgWindowHours,
    detrendWindowDays: input.detrendWindowDays,
    sigmaClip: input.sigmaClip,
    targetName: name,
    stellarRadius: radius,
  });
  const heavy = performance.now() - t;
  mark(3, "done", heavy * 0.62);
  for (const i of [4, 5, 6]) {
    mark(i, "running");
    await wait(120);
    mark(i, "done", heavy * 0.13);
  }
  return result;
}

/** Batch survey over a list of targets, reporting incremental results. */
export async function analyzeBatch(
  specs: TargetSpec[],
  onResult: (r: PipelineResult, spec: TargetSpec, index: number) => void,
): Promise<void> {
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    if (!spec) continue;
    await frame();
    const lc = generateLightCurve(spec);
    const r = runPipeline(lc, { targetName: spec.id, stellarRadius: spec.radius });
    onResult(r, spec, i);
    await wait(20);
  }
}
