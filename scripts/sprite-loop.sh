#!/bin/bash
# Retries sprite generation until all assets exist or attempts run out.
cd "$(dirname "$0")/.."
for i in $(seq 1 12); do
  out=$(npx tsx --env-file=.env.local scripts/generate-assets.mts 2>&1 | tail -2)
  echo "[loop $i] $out"
  echo "$out" | grep -q "failed 0" && { echo "all sprites done"; exit 0; }
  sleep 150
done
echo "gave up — re-run scripts/sprite-loop.sh later"
