#!/usr/bin/env bash
# LOCAL ONLY: sample feedback videos, notes, notifications and a help answer for the student
# account, so the feedback screens can be tested without Mux keys. Safe to run repeatedly.
# Usage: bash scripts/seed-feedback-local.sh   (DB_URL defaults to the local Supabase database)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:55622/postgres}"

case "$DB_URL" in
  *@127.0.0.1:*|*@localhost:*) ;;
  *) echo "Refusing to seed a non-local database: $DB_URL" >&2; exit 1 ;;
esac

psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/scripts/seed-feedback-local.sql"
echo "Seeded feedback sample data for student@bonded.test"
