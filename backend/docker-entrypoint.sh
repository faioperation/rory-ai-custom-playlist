#!/bin/sh
# =============================================================================
# Soundtrack My Night — Backend Docker Entrypoint
# =============================================================================
# Waits for MongoDB to accept TCP connections before starting the Node.js server.
# Only used in the DEVELOPMENT compose (local mongo container).
# In production, MongoDB Atlas is used directly — no wait needed.
#
# Environment variables:
#   WAIT_HOSTS          — comma-separated host:port pairs to wait for
#                         Defaults to mongo:27017 if not set
#   WAIT_TIMEOUT        — seconds before giving up (default: 60)
#   WAIT_SLEEP_INTERVAL — seconds between retries (default: 2)
# =============================================================================

set -e

WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_SLEEP_INTERVAL="${WAIT_SLEEP_INTERVAL:-2}"
WAIT_HOSTS="${WAIT_HOSTS:-}"

# ── Helper: wait for a single host:port ───────────────────────────────────────
wait_for() {
    local host="$1"
    local port="$2"
    local elapsed=0

    echo "[entrypoint] Waiting for ${host}:${port}..."

    while ! (nc -z "$host" "$port" 2>/dev/null); do
        if [ "$elapsed" -ge "$WAIT_TIMEOUT" ]; then
            echo "[entrypoint] ERROR: Timed out waiting for ${host}:${port} after ${WAIT_TIMEOUT}s"
            exit 1
        fi
        sleep "$WAIT_SLEEP_INTERVAL"
        elapsed=$((elapsed + WAIT_SLEEP_INTERVAL))
    done

    echo "[entrypoint] ${host}:${port} is available after ${elapsed}s"
}

# ── Wait for all specified hosts ───────────────────────────────────────────────
if [ -n "$WAIT_HOSTS" ]; then
    for entry in $(echo "$WAIT_HOSTS" | tr ',' ' '); do
        host=$(echo "$entry" | cut -d: -f1)
        port=$(echo "$entry" | cut -d: -f2)
        wait_for "$host" "$port"
    done
fi

# ── Start the application ──────────────────────────────────────────────────────
echo "[entrypoint] Starting application: $*"
exec "$@"
