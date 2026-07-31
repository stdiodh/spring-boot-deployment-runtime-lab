#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"
APP_IMAGE="${2:-${APP_IMAGE:-}}"

: "${APP_IMAGE:?APP_IMAGE must be set to an immutable image tag}"

export APP_IMAGE

cd "$RELEASE_DIR"

test -f .env
chmod 600 .env

docker compose --env-file .env -f deploy/compose.prod.yaml pull app
docker compose --env-file .env -f deploy/compose.prod.yaml up -d --no-recreate mysql redis
docker compose --env-file .env -f deploy/compose.prod.yaml up -d --no-deps app
