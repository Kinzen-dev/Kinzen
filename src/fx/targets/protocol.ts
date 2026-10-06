import type { Burst, ScatterJob, TargetJob, Targets } from "./types";

export type WorkerRequest =
  { id: number; kind: "targets"; job: TargetJob } | { id: number; kind: "scatter"; job: ScatterJob };

export type WorkerResponse =
  | { id: number; kind: "targets"; targets: Targets }
  | { id: number; kind: "scatter"; burst: Burst }
  | { id: number; kind: "error"; message: string };
