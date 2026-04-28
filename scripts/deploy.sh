#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"
APP_IMAGE="${APP_IMAGE:-aandi-deployment-runtime-lab:latest}"

cd "$RELEASE_DIR"

docker compose --env-file .env -f deploy/compose.prod.yaml down || true
docker build -t "$APP_IMAGE" .
docker compose --env-file .env -f deploy/compose.prod.yaml up -d
