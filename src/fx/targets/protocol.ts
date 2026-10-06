import type { Burst, BurstJob, TargetJob, Targets } from "./types";

export type WorkerRequest =
  | { id: number; kind: "targets"; job: TargetJob }
  | { id: number; kind: "burst"; job: BurstJob };

export type WorkerResponse =
  | { id: number; kind: "targets"; targets: Targets }
  | { id: number; kind: "burst"; burst: Burst }
  | { id: number; kind: "error"; message: string };
