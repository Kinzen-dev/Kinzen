@AGENTS.md

# Project rules (kinzen.dev)

## A release is done only when the pipeline is green

After every push, merge, build or deploy, watch the pipeline until it finishes. Nothing counts as
"deployed" or "done" until all of these are green:

1. Every GitHub Actions run for the pushed commit has concluded `success` (watch it, never assume).
2. The newest Vercel production deployment is `Ready` (deploys are CLI only: `vercel deploy --prod --yes`).
3. The post-deploy smoke test passes against https://www.kinzen.dev.

One command checks all three and is the gate: `scripts/release-check.sh` (after a deploy) or
`scripts/release-check.sh --no-deploy` (after pushing a branch). Report success only after it prints
`RELEASE CHECK PASSED`. If anything is red: say so, fix it (or roll back with the previous
deployment from `vercel ls`), push again and re-run the check until green. Never leave the pipeline
red, and never report a red or unwatched run as a success.

`cancelled` runs are expected only when a newer push to the same branch superseded them
(`concurrency: cancel-in-progress` in ci.yml); the newest run must still be green.
