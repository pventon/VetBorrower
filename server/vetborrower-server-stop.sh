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
#
# When initially installed, ensure the shell script is executable:
# chmod +x ./vetborrower-server-stop.sh
#
# sudo install -m 0755 /home/vetborrower/VetBorrower/server/vetborrower-server-stop.sh /usr/local/bin/vetborrower-server-stop.sh

set -euo pipefail

SERVICE_NAME="vetborrower"
LOG_DIR="/var/log/vetborrower"
ARCHIVE_DIR="$LOG_DIR/archive"
PID_FILE="/var/run/vetborrower/vetborrower-server.pid"
STDOUT_LOG="$LOG_DIR/vetborrower-server_stdout.log"
STDERR_LOG="$LOG_DIR/vetborrower-server_stderr.log"

timestamp() { date +"%Y%m%d-%H%M%S"; }

rotate_logs() {
  mkdir -p "$ARCHIVE_DIR" || {
    echo "ERROR: Cannot create $ARCHIVE_DIR (permissions?)"
    exit 1
  }

  local ts
  ts="$(timestamp)"

  [[ -f "$STDOUT_LOG" ]] && mv -f "$STDOUT_LOG" "$ARCHIVE_DIR/vetborrower-server_stdout.$ts.log"
  [[ -f "$STDERR_LOG" ]] && mv -f "$STDERR_LOG" "$ARCHIVE_DIR/vetborrower-server_stderr.$ts.log"

  : > "$STDOUT_LOG"
  : > "$STDERR_LOG"
}

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "Stopping via systemd: $SERVICE_NAME"
    sudo systemctl stop "$SERVICE_NAME"
    rotate_logs
    echo "Stopped. Logs archived under: $ARCHIVE_DIR"
    exit 0
  fi
fi

if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE" || true)"
  if [[ -n "${pid:-}" ]] && ps -p "$pid" >/dev/null 2>&1; then
    echo "Stopping manual PID $pid"
    kill -SIGTERM "$pid" || true

    for _ in {1..30}; do
      if ! ps -p "$pid" >/dev/null 2>&1; then break; fi
      sleep 0.5
    done

    if ps -p "$pid" >/dev/null 2>&1; then
      echo "Graceful stop timed out; sending SIGKILL"
      kill -SIGKILL "$pid" || true
    fi
  fi

  rm -f "$PID_FILE"
fi

rotate_logs
echo "Stopped (manual mode). Logs archived under: $ARCHIVE_DIR"