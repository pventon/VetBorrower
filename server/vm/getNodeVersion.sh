#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $(basename "$0") /home/vetborrower/vetborrower/server/VetBorrower-server.js [args...]"
  exit 2
fi

# Ensure HOME is set (defensive for systemd/sudo contexts)
if [[ -z "${HOME:-}" ]]; then
  HOME="$(getent passwd "$(id -un)" | cut -d: -f6)"
  export HOME
fi

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NVM_SH="$NVM_DIR/nvm.sh"

# If NVM exists, use it; otherwise fall back to system node
if [[ -s "$NVM_SH" ]]; then
  # shellcheck disable=SC1090
  source "$NVM_SH"
  nvm use --silent default >/dev/null || true
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "${NODE_BIN:-}" ]]; then
  echo "ERROR: node not found in PATH for user $(id -un)."
  echo "Fix: install node (system package) or install NVM at $NVM_DIR."
  exit 1
fi

exec "$NODE_BIN" "$@"