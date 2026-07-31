#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"
APP_IMAGE="${2:-${APP_IMAGE:-}}"
APP_VERSION="${3:-${APP_VERSION:-}}"
VERIFY_URL="${VERIFY_URL:-http://localhost:8080/}"
VERIFY_ATTEMPTS="${VERIFY_ATTEMPTS:-30}"
VERIFY_INTERVAL_SECONDS="${VERIFY_INTERVAL_SECONDS:-2}"
CONTAINER_NAME="aandi-app"

: "${APP_IMAGE:?APP_IMAGE must be set to the deployed image tag}"
: "${APP_VERSION:?APP_VERSION must be set to the deployed revision}"

export APP_IMAGE

cd "$RELEASE_DIR"

compose() {
  docker compose --env-file .env -f deploy/compose.prod.yaml "$@"
}

fail() {
  echo "$1" >&2
  compose ps app || true
  docker logs --tail 100 "$CONTAINER_NAME" || true
  exit 1
}

compose ps app

actual_status="$(docker inspect --format '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null)" ||
  fail "Application container was not found."
[[ "$actual_status" == "running" ]] ||
  fail "Application container is not running: $actual_status"

actual_image_ref="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_NAME")"
[[ "$actual_image_ref" == "$APP_IMAGE" ]] ||
  fail "Unexpected image reference: expected $APP_IMAGE, got $actual_image_ref"

expected_image_id="$(docker image inspect --format '{{.Id}}' "$APP_IMAGE" 2>/dev/null)" ||
  fail "Expected image is not available on the host: $APP_IMAGE"
actual_image_id="$(docker inspect --format '{{.Image}}' "$CONTAINER_NAME")"
[[ "$actual_image_id" == "$expected_image_id" ]] ||
  fail "Application container is not running the expected image ID."

actual_revision="$(docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$CONTAINER_NAME")"
[[ "$actual_revision" == "$APP_VERSION" ]] ||
  fail "Unexpected image revision: expected $APP_VERSION, got $actual_revision"

for ((attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++)); do
  if curl --fail --silent --show-error --max-time 5 "$VERIFY_URL" >/dev/null; then
    echo "Deployment verified: $APP_IMAGE ($APP_VERSION)"
    exit 0
  fi

  echo "Waiting for application response (${attempt}/${VERIFY_ATTEMPTS})..."
  sleep "$VERIFY_INTERVAL_SECONDS"
done

fail "Application did not respond successfully at $VERIFY_URL."
