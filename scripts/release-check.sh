#!/usr/bin/env bash
# Release gate: a push or deploy counts as successful ONLY when this script exits 0.
#
#   scripts/release-check.sh            # check the current HEAD (after a push to main + prod deploy)
#   scripts/release-check.sh --no-deploy  # CI only (pushed a branch, nothing deployed)
#
# 1. Waits for every GitHub Actions run of this commit to finish and requires all of them green.
# 2. Requires the newest Vercel production deployment to be Ready (unless --no-deploy).
# 3. Runs the post-deploy smoke test against https://www.kinzen.dev (unless --no-deploy).
set -uo pipefail
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$(dirname "$0")/.."

deploy=1
[[ "${1:-}" == "--no-deploy" ]] && deploy=0
sha=$(git rev-parse HEAD)
short=${sha:0:7}
fail() { echo "RELEASE CHECK FAILED: $*"; exit 1; }

echo "== CI for $short"
# Runs can take a few seconds to register after a push.
ids=""
for _ in $(seq 1 30); do
  ids=$(gh run list --commit "$sha" --json databaseId -q '.[].databaseId' 2>/dev/null)
  [[ -n "$ids" ]] && break
  sleep 5
done
[[ -n "$ids" ]] || fail "no GitHub Actions run found for $short (was it pushed?)"
for id in $ids; do
  gh run watch "$id" --exit-status >/dev/null 2>&1
  conclusion=$(gh run view "$id" --json conclusion,workflowName,event -q '"\(.workflowName) (\(.event)): \(.conclusion)"')
  echo "   $conclusion"
  [[ "$conclusion" == *": success" ]] || fail "CI run $id is not green: $conclusion"
done

if (( deploy )); then
  echo "== Vercel production deployment"
  line=$(vercel ls kinzen-frontend 2>&1 | grep "Production" | head -1)  # the table goes to stderr
  [[ -n "$line" ]] || fail "could not read Vercel deployments (vercel login?)"
  echo "   $line" | sed 's/  */ /g'
  [[ "$line" == *"Ready"* ]] || fail "newest production deployment is not Ready"

  echo "== Smoke test https://www.kinzen.dev"
  scripts/smoke-deploy.sh https://www.kinzen.dev >/tmp/kinzen-smoke.log 2>&1 || {
    grep FAIL /tmp/kinzen-smoke.log
    fail "smoke test failed"
  }
  echo "   $(grep -c '^ok' /tmp/kinzen-smoke.log) checks ok"
fi

echo "RELEASE CHECK PASSED for $short"
