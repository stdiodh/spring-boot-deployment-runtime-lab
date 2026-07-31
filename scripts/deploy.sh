#!/usr/bin/env bash
set -euo pipefail

if (( $# != 2 )); then
  echo "Usage: $0 RELEASE_DIR APP_IMAGE" >&2
  exit 2
fi

RELEASE_DIR="$1"
APP_IMAGE="$2"
COMPOSE_FILE="$RELEASE_DIR/deploy/compose.prod.yaml"
ENV_FILE="$RELEASE_DIR/.env"
PREVIOUS_ENV_FILE="$RELEASE_DIR/.env.previous"
PREVIOUS_IMAGE_FILE="$RELEASE_DIR/.previous-image"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-60}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"

fail() {
  echo "$1" >&2
  exit 1
}

is_immutable_image() {
  [[ -n "$1" && "$1" != *[[:space:]]* ]] &&
    [[ "$1" =~ @sha256:[0-9a-fA-F]{64}$ || "$1" =~ :[0-9a-fA-F]{40}$ ]]
}

[[ -d "$RELEASE_DIR" ]] || fail "Release directory was not found."
[[ -f "$COMPOSE_FILE" ]] || fail "Production Compose file was not found."
[[ -f "$ENV_FILE" && ! -L "$ENV_FILE" ]] || fail "Runtime .env file was not found."
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" ]] ||
  fail "Runtime .env file must have mode 600."
is_immutable_image "$APP_IMAGE" ||
  fail "APP_IMAGE must be an exact immutable digest or 40-character commit tag."
[[ "$HEALTH_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] ||
  fail "HEALTH_ATTEMPTS must be a positive integer."
[[ "$HEALTH_INTERVAL_SECONDS" =~ ^[1-9][0-9]*$ ]] ||
  fail "HEALTH_INTERVAL_SECONDS must be a positive integer."

export APP_IMAGE
umask 077

compose() {
  docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    "$@"
}

service_container_id() {
  compose ps --all --quiet "$1" 2>/dev/null
}

wait_for_healthy_service() {
  local service="$1"
  local container_id=""
  local health_status="missing"
  local attempt

  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++)); do
    container_id="$(service_container_id "$service" || true)"
    if [[ -n "$container_id" ]]; then
      health_status="$(
        docker inspect \
          --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' \
          "$container_id" 2>/dev/null || true
      )"
      if [[ "$health_status" == "healthy" ]]; then
        echo "$service is healthy."
        return 0
      fi
    fi

    echo "Waiting for $service health (${attempt}/${HEALTH_ATTEMPTS})..."
    sleep "$HEALTH_INTERVAL_SECONDS"
  done

  echo "$service did not become healthy (last status: $health_status)." >&2
  return 1
}

rollback_before_verification() {
  local previous_image=""
  local rollback_env_tmp="${ENV_FILE}.rollback"

  if [[ ! -f "$PREVIOUS_IMAGE_FILE" || ! -f "$PREVIOUS_ENV_FILE" ]]; then
    echo \
      "Rollback files are unavailable; this is the first deployment or there is no previous release." \
      >&2
    return 1
  fi

  IFS= read -r previous_image < "$PREVIOUS_IMAGE_FILE" || true
  if [[ -z "$previous_image" || "$previous_image" == *[[:space:]]* ]]; then
    echo "Previous image marker is invalid; automatic rollback was skipped." >&2
    return 1
  fi

  if ! install -m 600 "$PREVIOUS_ENV_FILE" "$rollback_env_tmp"; then
    echo "Could not prepare the previous runtime environment." >&2
    return 1
  fi
  if ! mv -f "$rollback_env_tmp" "$ENV_FILE"; then
    echo "Could not restore the previous runtime environment." >&2
    return 1
  fi

  APP_IMAGE="$previous_image"
  export APP_IMAGE

  echo "Restoring the previous application before verification..." >&2
  compose up -d --no-recreate mysql redis || return 1
  wait_for_healthy_service mysql || return 1
  wait_for_healthy_service redis || return 1
  compose pull app || return 1
  compose up -d --no-deps --force-recreate app || return 1
}

handle_deploy_exit() {
  local original_status="$1"
  local rollback_status=0

  if (( original_status == 0 )); then
    return 0
  fi

  trap - EXIT
  set +e

  echo "Deployment failed before verification; attempting automatic rollback." >&2
  rollback_before_verification
  rollback_status=$?
  if (( rollback_status == 0 )); then
    echo "Previous application release was restored." >&2
  else
    echo "Automatic rollback was unavailable or unsuccessful." >&2
  fi

  exit "$original_status"
}

previous_app_id="$(service_container_id app)" ||
  fail "Could not inspect the current Compose application service."
if [[ -n "$previous_app_id" ]]; then
  previous_image="$(
    docker inspect --format '{{.Config.Image}}' "$previous_app_id" 2>/dev/null
  )" || fail "Could not inspect the currently deployed application image."
  [[ -n "$previous_image" ]] ||
    fail "The currently deployed application has no image reference."

  previous_image_tmp="${PREVIOUS_IMAGE_FILE}.tmp"
  printf '%s\n' "$previous_image" > "$previous_image_tmp"
  chmod 600 "$previous_image_tmp"
  mv -f "$previous_image_tmp" "$PREVIOUS_IMAGE_FILE"
else
  rm -f "$PREVIOUS_IMAGE_FILE"
fi

trap 'handle_deploy_exit "$?"' EXIT

# --no-recreate preserves the existing database, cache, and named volume.
compose up -d --no-recreate mysql redis
wait_for_healthy_service mysql
wait_for_healthy_service redis

compose pull app
compose up -d --no-deps --force-recreate app
