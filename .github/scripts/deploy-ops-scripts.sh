#!/usr/bin/env bash

# Installs the operations scripts in apps/scripts on a deployment host. Used by
# deploy.yml for production and dev-tier.yml for the dev host.
#
#   deploy-ops-scripts.sh <source> <user@host> <remote path>
#
# <source> is a checkout's apps/scripts. It lands at <remote path>/apps/scripts
# with the .env held in SCRIPTS_ENV, which is the only file lib.config reads,
# and a virtualenv built from its uv.lock.
#
# Each install goes into a new directory under <remote path>/apps/.scripts,
# and apps/scripts is a symlink that moves to it only once uv has finished.
# The Tuesday processor cron and dev-db.sh therefore never see a half-built
# copy, and a failed install leaves the previous one in place. The two installs
# before the current one are kept, because a run that started before the swap
# can still be reading its files.

set -euo pipefail

source="$1"
target="$2"
remote="$3"

if [[ -z "${SCRIPTS_ENV:-}" ]]; then
  echo "::error::SCRIPTS_ENV is empty. Set the environment's SCRIPTS_ENV secret to the scripts' .env." >&2
  exit 1
fi

ssh_options=(-o StrictHostKeyChecking=no)
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

tar -czf "$work/scripts.tar.gz" -C "$source" .
(
  umask 077
  printf '%s\n' "$SCRIPTS_ENV" > "$work/.env"
)

# mktemp -d makes the upload directory private to the deploying user.
upload="$(ssh "${ssh_options[@]}" "$target" mktemp -d)"
scp "${ssh_options[@]}" -q "$work/scripts.tar.gz" "$work/.env" "$target:$upload/"

ssh "${ssh_options[@]}" "$target" bash -s -- "$remote/apps" "$upload" <<'EOF'
  set -euo pipefail
  apps="$1"
  upload="$2"

  # A non-interactive ssh shell has no login PATH, and uv lives in
  # ~/.local/bin.
  PATH="$HOME/.local/bin:$PATH"

  mkdir -p "$apps/.scripts"
  # Named by time, so sorting the names sorts the installs.
  release="$(mktemp -d "$apps/.scripts/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
  name="${release##*/}"
  installed=false
  trap 'rm -rf "$upload"; [[ "$installed" == true ]] || rm -rf "$release"' EXIT

  tar -xzf "$upload/scripts.tar.gz" -C "$release"
  install -m 600 "$upload/.env" "$release/.env"
  # uv.lock pins every package, and --locked fails if it has fallen behind
  # pyproject.toml. The project is not a package, so only its dependencies
  # are installed and src/ runs from the directory.
  (cd "$release" && uv sync --locked --python 3.14 --no-progress)

  # rename(2) swaps the symlink in one step. -T refuses to move it into a
  # real apps/scripts directory instead of replacing one.
  ln -sfn ".scripts/$name" "$apps/.scripts-next"
  mv -T "$apps/.scripts-next" "$apps/scripts"
  installed=true
  echo "apps/scripts now points at install $name"

  find "$apps/.scripts" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' |
    sort -r | { grep -vxF "$name" || true; } | tail -n +3 |
    while IFS= read -r old; do
      rm -rf "${apps:?}/.scripts/$old"
      echo "removed install $old"
    done
EOF
