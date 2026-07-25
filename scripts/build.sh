#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Pages sets CF_PAGES_BRANCH during Git-connected builds.
# main  → landing/ as-is (production coming-soon page)
# dev   → copy site/ into landing/ for preview (ephemeral CI step, not committed)
# other → landing/

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "${CF_PAGES_BRANCH:-main}" = "dev" ]; then
  rsync -a --delete "${ROOT}/site/" "${ROOT}/landing/"
  echo "Staged site/ → landing/ for dev preview"
else
  echo "Serving landing/ for ${CF_PAGES_BRANCH:-main}"
fi
