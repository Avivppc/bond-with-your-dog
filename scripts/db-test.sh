#!/usr/bin/env bash
# Runs every migration plus the SQL tests against a throwaway local Postgres.
# Requires local Postgres binaries (initdb, pg_ctl, psql). Usage: npm run test:db
set -euo pipefail
export LC_ALL=C LANG=C  # postgres refuses to start with an invalid locale

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGDATA="$(mktemp -d /tmp/bwdb.XXXXXX)"  # short path: unix socket paths are length-limited
PORT="${DB_TEST_PORT:-54399}"
LOG="$PGDATA/server.log"

cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$PGDATA"; }
trap cleanup EXIT

initdb -D "$PGDATA" -U postgres --auth=trust --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k $PGDATA" -l "$LOG" -w start >/dev/null || { cat "$LOG"; exit 1; }

PSQL=(psql -h "$PGDATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f" >/dev/null
done

status=0
for t in "$ROOT"/supabase/tests/*.test.sql; do
  if "${PSQL[@]}" -o /dev/null -f "$t"; then
    echo "PASS $(basename "$t")"
  else
    echo "FAIL $(basename "$t")"
    status=1
  fi
done
exit $status
