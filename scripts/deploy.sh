#!/usr/bin/env bash
# Production deploy. The only way to ship kinzen.dev (Vercel CLI; the project is not git-connected).
#
#   scripts/deploy.sh
#
# Refuses unless HEAD is main, the tree is clean and HEAD is already on origin/main (so the footer's
# commit link resolves on GitHub). Stamps that commit into the build, deploys, then runs the release
# gate. Done = this script prints RELEASE CHECK PASSED.
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$(dirname "$0")/.."

branch=$(git rev-parse --abbrev-ref HEAD)
[[ "$branch" == "main" ]] || { echo "deploy: on '$branch', not main"; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "deploy: working tree not clean"; exit 1; }
git fetch -q origin main
sha=$(git rev-parse HEAD)
[[ "$sha" == "$(git rev-parse origin/main)" ]] || { echo "deploy: HEAD is not origin/main (push or pull first)"; exit 1; }

vercel deploy --prod --yes --build-env "BUILD_COMMIT=$sha"
exec scripts/release-check.sh
