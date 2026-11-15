#!/usr/bin/env bash
set -euo pipefail

export PGPASSWORD="${PGPASSWORD:-postgres}"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-54322}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"

bucket="$(printf '%064x' 123456)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

pids=()
for i in $(seq 1 40); do
  (
    psql --no-psqlrc --quiet --tuples-only --no-align \
      --set ON_ERROR_STOP=1 \
      --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" \
      --command "SET ROLE service_role; SELECT public.reserve_site_assistant_rate_limit('$bucket', 60, 12);" \
      > "$tmp/$i"
  ) &
  pids+=("$!")
done

failed=0
for pid in "${pids[@]}"; do
  wait "$pid" || failed=1
done
if [[ "$failed" -ne 0 ]]; then
  echo "FAIL: one or more concurrent PostgreSQL calls failed"
  cat "$tmp"/*
  exit 1
fi

allowed="$(grep -hxc 't' "$tmp"/* | awk '{ total += $1 } END { print total + 0 }')"
denied="$(grep -hxc 'f' "$tmp"/* | awk '{ total += $1 } END { print total + 0 }')"
invalid="$(grep -hvE '^(t|f)$' "$tmp"/* || true)"

printf 'Concurrent Nibras limiter results: allowed=%s denied=%s\n' "$allowed" "$denied"
if [[ "$allowed" != "12" || "$denied" != "28" || -n "$invalid" ]]; then
  echo "FAIL: expected exactly 12 allowed and 28 denied requests from 40 concurrent service_role calls"
  cat "$tmp"/*
  exit 1
fi

echo "PASS: atomic per-bucket rate limit held under 40 concurrent calls."
