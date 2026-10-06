import type { WorkerRequest, WorkerResponse } from "./protocol";
import type { Burst, BurstJob, TargetJob, Targets } from "./types";

type Pending = { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void };

/**
 * Promise wrapper over the target worker. If a worker cannot start (old browser, CSP),
 * the same pure samplers run on the main thread through a lazy import.
 */
export class TargetClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();

  constructor() {
    try {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        if (e.data.kind === "error") p.reject(new Error(e.data.message));
        else p.resolve(e.data);
      };
      this.worker.onerror = () => this.failAll();
    } catch {
      this.worker = null;
    }
  }

  async targets(job: TargetJob): Promise<Targets> {
    const r = await this.send({ id: 0, kind: "targets", job });
    if (r.kind !== "targets") throw new Error("fx: unexpected worker reply");
    return r.targets;
  }

  async burst(job: BurstJob): Promise<Burst> {
    const r = await this.send({ id: 0, kind: "burst", job });
    if (r.kind !== "burst") throw new Error("fx: unexpected worker reply");
    return r.burst;
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.failAll();
  }

  private failAll(): void {
    this.pending.forEach((p) => p.reject(new Error("fx: worker gone")));
    this.pending.clear();
  }

  private async send(req: WorkerRequest): Promise<WorkerResponse> {
    const id = ++this.seq;
    if (!this.worker) return this.local({ ...req, id });
    return new Promise<WorkerResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ ...req, id });
    });
  }

  private async local(req: WorkerRequest): Promise<WorkerResponse> {
    const [{ WORDMARK }, { indexMask }, s] = await Promise.all([
      import("../baked/wordmark"),
      import("./mask"),
      import("./sample-mask"),
    ]);
    if (req.kind === "targets")
      return { id: req.id, kind: "targets", targets: s.sampleWordmark(indexMask(WORDMARK), req.job) };
    return { id: req.id, kind: "burst", burst: s.burstSeed(req.job) };
  }
}
