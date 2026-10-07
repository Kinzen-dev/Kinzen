#!/usr/bin/env bash
# Post-deploy smoke test against a real Vercel deployment (some routing exists only there:
# a segment prefetch of "/" 404ed on Vercel while every local test passed).
# Usage: scripts/smoke-deploy.sh https://www.kinzen.dev
#        scripts/smoke-deploy.sh https://<preview>.vercel.app --vercel   (protected previews)
set -uo pipefail
base="${1:?base URL}"
fetch() { # url, extra curl args...
  local url="$1"; shift
  if [[ "${2:-}" == "--vercel" || "${VIA_VERCEL:-}" == 1 ]]; then vercel curl "$url" -- -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null
  else curl -s -o /dev/null -w '%{http_code}' "$@" "$url"; fi
}
[[ "${2:-}" == "--vercel" ]] && export VIA_VERCEL=1
fail=0
check() { # path expected [headers...]
  local path="$1" want="$2"; shift 2
  local got; got=$(fetch "$base$path" "$@")
  if [[ "$got" != "$want" ]]; then echo "FAIL $path ($*) -> $got, want $want"; fail=1; else echo "ok   $path ${*:+($*)} $got"; fi
}
for p in / /th /cv /th/cv /work/yimwhan-ai /th/work/helm /privacy /th/privacy; do
  check "$p" 200
  check "$p?_rsc=smoke" 200 -H "RSC: 1"
  check "$p?_rsc=smoke" 200 -H "RSC: 1" -H "Next-Router-Prefetch: 1" -H "Next-Router-Segment-Prefetch: /_tree"
done
for p in /og.png /th/og.png /robots.txt /sitemap.xml /favicon.ico; do check "$p" 200; done
check /en 308; check /cars 308; check /no-such-page 404
exit $fail
