#!/bin/bash
# Runs inside the new worktree; $ROOT_WORKSPACE_PATH points at the main workspace.

find "$ROOT_WORKSPACE_PATH" -name node_modules -prune -o -type f -name '.env*' ! -name '*.example' -print |
while read -r src; do
  rel="${src#$ROOT_WORKSPACE_PATH/}"
  mkdir -p "$(dirname "$rel")"
  cp -p "$src" "$rel"
  echo "Copied $rel"
done

exit 0
