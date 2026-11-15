#!/usr/bin/env bash
set -euo pipefail
export PGPASSWORD="\${PGPASSWORD:-postgres}"
PGHOST="\${PGHOST:-127.0.0.1}"
PGPORT="\${PGPORT:-54322}"
PGUSER="\${PGUSER:-postgres}"
PGDATABASE="\${PGDATABASE:-postgres}"
DB=(psql --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE")

"\${DB[@]}" --command "UPDATE public.ai_quota_model_policies SET enabled=true, free_tier_verified=true WHERE provider_id='gemini' AND model_id='gemini-3.5-flash-lite';"
bucket="$(mktemp -d)"
trap 'rm -rf "$bucket"' EXIT
pids=()
for i in $(seq 1 10); do
  request_id="$(cat /proc/sys/kernel/random/uuid)"
  (
    "\${DB[@]}" --command "SELECT allowed FROM public.reserve_ai_model_quota('gemini','gemini-3.5-flash-lite','$request_id','conversation');" > "$bucket/$i"
  ) &
  pids+=("$!")
done
failed=0
for pid in "\${pids[@]}"; do wait "$pid" || failed=1; done
if [[ "$failed" -ne 0 ]]; then cat "$bucket"/*; exit 1; fi
allowed="$(awk '$0 == "t" { n++ } END { print n+0 }' "$bucket"/*)"
denied="$(awk '$0 == "f" { n++ } END { print n+0 }' "$bucket"/*)"
printf 'AI quota concurrency: allowed=%s denied=%s\n' "$allowed" "$denied"
if [[ "$allowed" != "5" || "$denied" != "5" ]]; then
  echo "FAIL: expected exactly 5 allowed and 5 denied calls"
  cat "$bucket"/*
  exit 1
fi
echo "PASS: model-scoped minute quota held under 10 concurrent calls."
