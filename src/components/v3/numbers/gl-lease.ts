/**
 * One WebGL context for the whole numbers section. Two views draw with WebGL (gold dust, gold
 * ink); during a crossfade both are mounted for a moment, so the incoming one waits here until the
 * outgoing one has released (disposed) its context. `acquire` resolves with the release function;
 * calling it twice is harmless.
 */
let busy = false;
const queue: (() => void)[] = [];

export function acquireGl(): Promise<() => void> {
  return new Promise((grant) => {
    const give = () => {
      busy = true;
      let done = false;
      grant(() => {
        if (done) return;
        done = true;
        busy = false;
        queue.shift()?.();
      });
    };
    if (busy) queue.push(give);
    else give();
  });
}

/** Leave the queue without ever holding the context (the view unmounted while it waited). */
export function cancelGl(waiter: Promise<() => void>): void {
  void waiter.then((release) => release());
}
