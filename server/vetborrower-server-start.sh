#!/bin/bash
#
# Copyright (c) 2025 Ventec SW LLC.
# All rights reserved.
# 
# This software is the intellectual property of Ventec SW LLC. Permission is
# hereby denied for any use, copying, modification, distribution, or
# transmission of this software and its design paradigm, in whole or in
# part, without the prior written permission of Ventec SW LLC.
#
# No part of this source code may be copied, reproduced, distributed,
# or transmitted in any form or by any means, electronic or mechanical,
# without the prior written permission of the copyright holder, nor 
# shall it be used for any purpose other than in connection with an 
# agreement or proposed agreement with Ventec SW LLC.

set -euo pipefail

SERVICE_NAME="vetborrower"
ROTATE_HELPER="/usr/local/bin/vetborrower-rotate-logs.sh"

usage() {
  cat <<EOF
Usage:
  $0 /home/vetborrower/VetBorrower/server/vetborrower-server.js
  $0 --systemd
  $0 --manual /path/to/vetborrower-server.js

Notes:
  - Default mode is manual start (nohup + PID file).
  - If systemd service is active, this script will refuse to start a second instance.
  - --systemd uses: sudo systemctl start $SERVICE_NAME
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

MODE="manual"
SERVER_ARG=""

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  --systemd)
    MODE="systemd"
    ;;
  --manual)
    MODE="manual"
    SERVER_ARG="${2:-}"
    if [[ -z "$SERVER_ARG" ]]; then
      echo "Error: --manual requires a path to vetborrower-server.js"
      exit 1
    fi
    ;;
  *)
    MODE="manual"
    SERVER_ARG="$1"
    ;;
esac

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "Refusing to start manually: systemd service '$SERVICE_NAME' is already ACTIVE."
    echo "Use: sudo systemctl status $SERVICE_NAME"
    echo "Or stop it first: sudo systemctl stop $SERVICE_NAME"
    exit 1
  fi
fi

if [[ "$MODE" == "systemd" ]]; then
  echo "Starting via systemd: $SERVICE_NAME"
  sudo systemctl start "$SERVICE_NAME"
  sudo systemctl status "$SERVICE_NAME" --no-pager
  exit 0
fi

SERVER_PATH="$(realpath "$SERVER_ARG")"
if [[ ! -f "$SERVER_PATH" ]]; then
  echo "Error: vetborrower-server.js not found at $SERVER_PATH"
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "${NODE_BIN:-}" ]]; then
  echo "Error: node not found in PATH"
  exit 1
fi

SERVER_DIR="$(dirname "$SERVER_PATH")"
cd "$SERVER_DIR"

LOG_DIR="/var/log/vetborrower"
ARCHIVE_DIR="$LOG_DIR/archive"
PID_DIR="/var/run/vetborrower"
PID_FILE="$PID_DIR/vetborrower-server.pid"
STDOUT_LOG="$LOG_DIR/vetborrower-server_stdout.log"
STDERR_LOG="$LOG_DIR/vetborrower-server_stderr.log"

ensure_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    sudo mkdir -p "$dir"
    echo "Created directory at $dir"
  fi
  sudo chown "$USER:$USER" "$dir"
}

ensure_dir "$LOG_DIR"
ensure_dir "$ARCHIVE_DIR"
ensure_dir "$PID_DIR"

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" || true)"
  if [[ -n "${old_pid:-}" ]] && ps -p "$old_pid" >/dev/null 2>&1; then
    echo "Server already running with PID $old_pid (from $PID_FILE)."
    echo "Stop it with: /usr/local/bin/vetborrower-server-stop.sh"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if [[ -x "$ROTATE_HELPER" ]]; then
  "$ROTATE_HELPER"
else
  timestamp() { date +"%Y%m%d-%H%M%S"; }
  ts="$(timestamp)"
  [[ -f "$STDOUT_LOG" ]] && sudo mv -f "$STDOUT_LOG" "$ARCHIVE_DIR/vetborrower-server_stdout.$ts.log"
  [[ -f "$STDERR_LOG" ]] && sudo mv -f "$STDERR_LOG" "$ARCHIVE_DIR/vetborrower-server_stderr.$ts.log"
  sudo touch "$STDOUT_LOG" "$STDERR_LOG"
  sudo chown "$USER:$USER" "$STDOUT_LOG" "$STDERR_LOG" || true
fi

echo "Starting vetborrower-server.js (manual) from $SERVER_PATH..."
nohup "$NODE_BIN" "$SERVER_PATH" >> "$STDOUT_LOG" 2>> "$STDERR_LOG" &
PID=$!
echo "$PID" > "$PID_FILE"

if ps -p "$PID" >/dev/null 2>&1; then
  echo "VetBorrower server started successfully with PID $PID"
  echo "Stdout: $STDOUT_LOG"
  echo "Stderr: $STDERR_LOG"
  echo "Archived logs: $ARCHIVE_DIR"
  echo "PID file: $PID_FILE"
else
  echo "Error: Failed to start vetborrower-server.js"
  exit 1
fi