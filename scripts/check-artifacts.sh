#!/usr/bin/env bash
set -euo pipefail

# Enforce repository artifact policy:
# - keep only sample fixtures in git
# - keep runtime datasets/backups out of git

tracked_files="$(git ls-files)"

forbidden_patterns=(
  '(^|/)chat\.json$'
  '(^|/)analytics\.json$'
  '(^|/)chat\.json\.gz$'
  '(^|/)analytics\.json\.gz$'
  '(^|/)waan-data-backup-.*\.tgz$'
  '^_IGNORE_waan/archive/'
)

violations=""
for pattern in "${forbidden_patterns[@]}"; do
  matches="$(printf '%s\n' "$tracked_files" | grep -E "$pattern" || true)"
  if [ -n "$matches" ]; then
    violations="${violations}${matches}"$'\n'
  fi
done

if [ -n "$violations" ]; then
  echo "Artifact policy violation: runtime datasets/backups are tracked."
  echo "Remove these files from git and keep only sample fixtures (e.g. chat.sample.json, analytics.sample.json)."
  echo
  printf '%s\n' "$violations" | sed '/^$/d' | sort -u
  exit 1
fi

echo "Artifact policy check passed."
