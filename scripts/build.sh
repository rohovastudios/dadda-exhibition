#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Pages deploys site/ directly (see wrangler.toml pages_build_output_dir).
# This script is a no-op for Git-connected builds; kept for local parity if needed.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "${ROOT}/site/index.html" ]; then
  echo "error: site/index.html missing" >&2
  exit 1
fi

echo "Deploying site/ for ${CF_PAGES_BRANCH:-main} (${ROOT}/site)"
