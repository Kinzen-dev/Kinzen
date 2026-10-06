/// <reference lib="webworker" />
// Off-main-thread target generation: decodes the baked mask once, then samples it on request.
// The 262k-particle sampling loop is the ~100 ms long task SIAN pays on the main thread.
import { WORDMARK } from "../baked/wordmark";
import { indexMask, type MaskIndex } from "./mask";
import { sampleWordmark, scatterSeed } from "./sample-mask";
import type { WorkerRequest, WorkerResponse } from "./protocol";

let mask: MaskIndex | null = null;
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(msg: WorkerResponse, transfer: Transferable[]): void;
};

scope.onmessage = (e) => {
  const req = e.data;
  try {
    if (req.kind === "targets") {
      mask ??= indexMask(WORDMARK);
      const t = sampleWordmark(mask, req.job);
      scope.postMessage({ id: req.id, kind: "targets", targets: t }, [t.pos.buffer, t.col.buffer]);
    } else {
      const b = scatterSeed(req.job);
      scope.postMessage({ id: req.id, kind: "scatter", burst: b }, [b.pos.buffer, b.vel.buffer]);
    }
  } catch (err) {
    scope.postMessage({ id: req.id, kind: "error", message: String(err) }, []);
  }
};
