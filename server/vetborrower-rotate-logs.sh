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

LOG_DIR="/var/log/vetborrower"
ARCHIVE_DIR="$LOG_DIR/archive"
STDOUT_LOG="$LOG_DIR/vetborrower-server_stdout.log"
STDERR_LOG="$LOG_DIR/vetborrower-server_stderr.log"

timestamp() { date +"%Y%m%d-%H%M%S"; }

# If these fail, it means the directory ownership/creation isn't correct.
mkdir -p "$ARCHIVE_DIR" || {
  echo "ERROR: Cannot create $ARCHIVE_DIR"
  echo "Fix: ensure /var/log/vetborrower exists and is writable by user \"vetborrower\"."
  echo "For systemd: confirm the service has ExecStartPre install -d lines (or create dirs manually with sudo mkdir/chown)."
  exit 1
}

ts="$(timestamp)"
[[ -f "$STDOUT_LOG" ]] && mv -f "$STDOUT_LOG" "$ARCHIVE_DIR/vetborrower-server_stdout.$ts.log"
[[ -f "$STDERR_LOG" ]] && mv -f "$STDERR_LOG" "$ARCHIVE_DIR/vetborrower-server_stderr.$ts.log"

: > "$STDOUT_LOG"
: > "$STDERR_LOG"
