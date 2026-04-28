#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"

cd "$RELEASE_DIR"

docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
