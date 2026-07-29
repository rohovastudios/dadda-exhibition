#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Pages sets CF_PAGES_BRANCH during Git-connected builds.
# All branches deploy site/ (pre-launch home until dadsArchiveLaunch in site-config.js).
# This rsync is ephemeral in CI — the committed landing/ folder in git is not modified.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rsync -a --delete "${ROOT}/site/" "${ROOT}/landing/"
echo "Staged site/ → landing/ for ${CF_PAGES_BRANCH:-main}"
