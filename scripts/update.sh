#!/usr/bin/env bash
set -euo pipefail
# Compatibility entry point. The workflow uses generate-update.mjs directly.
node scripts/generate-update.mjs "${1:-1}"
