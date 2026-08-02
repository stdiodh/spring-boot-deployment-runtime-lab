#!/usr/bin/env bash
set -euo pipefail

if (( $# < 4 || $# > 5 )); then
  echo \
    "Usage: $0 RELEASE_DIR APP_IMAGE APP_VERSION APP_DOMAIN [--rollback-only]" \
    >&2
  exit 2
fi

RELEASE_DIR="$1"
APP_IMAGE="$2"
APP_VERSION="$3"
APP_DOMAIN="$4"
MODE="${5-}"
COMPOSE_FILE="$RELEASE_DIR/deploy/compose.prod.yaml"
ENV_FILE="$RELEASE_DIR/.env"
PREVIOUS_ENV_FILE="$RELEASE_DIR/.env.previous"
PREVIOUS_IMAGE_FILE="$RELEASE_DIR/.previous-image"
PREVIOUS_BUNDLE_DIR="$RELEASE_DIR/.deploy.previous"
VERIFY_URL="${VERIFY_URL:-https://${APP_DOMAIN}/actuator/health/readiness}"
VERIFY_ATTEMPTS="${VERIFY_ATTEMPTS:-30}"
VERIFY_INTERVAL_SECONDS="${VERIFY_INTERVAL_SECONDS:-2}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-60}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"

fail_without_rollback() {
  echo "$1" >&2
  exit 1
}

is_immutable_image() {
  [[ -n "$1" && "$1" != *[[:space:]]* ]] &&
    [[ "$1" =~ @sha256:[0-9a-fA-F]{64}$ || "$1" =~ :[0-9a-fA-F]{40}$ ]]
}

is_domain_name() {
  local domain_pattern='^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'

  (( ${#1} <= 253 )) && [[ "$1" =~ $domain_pattern ]]
}

[[ -d "$RELEASE_DIR" ]] || fail_without_rollback "Release directory was not found."
[[ -f "$COMPOSE_FILE" ]] ||
  fail_without_rollback "Production Compose file was not found."
[[ -f "$ENV_FILE" && ! -L "$ENV_FILE" ]] ||
  fail_without_rollback "Runtime .env file was not found."
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" ]] ||
  fail_without_rollback "Runtime .env file must have mode 600."
is_immutable_image "$APP_IMAGE" ||
  fail_without_rollback \
    "APP_IMAGE must be an exact immutable digest or 40-character commit tag."
[[ "$APP_VERSION" =~ ^[0-9a-fA-F]{40}$ ]] ||
  fail_without_rollback "APP_VERSION must be the exact 40-character commit revision."
is_domain_name "$APP_DOMAIN" ||
  fail_without_rollback "APP_DOMAIN must be a lowercase fully qualified domain name."
[[ -z "$MODE" || "$MODE" == "--rollback-only" ]] ||
  fail_without_rollback "The optional mode must be --rollback-only."
[[ "$VERIFY_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] ||
  fail_without_rollback "VERIFY_ATTEMPTS must be a positive integer."
[[ "$VERIFY_INTERVAL_SECONDS" =~ ^[1-9][0-9]*$ ]] ||
  fail_without_rollback "VERIFY_INTERVAL_SECONDS must be a positive integer."
[[ "$HEALTH_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] ||
  fail_without_rollback "HEALTH_ATTEMPTS must be a positive integer."
[[ "$HEALTH_INTERVAL_SECONDS" =~ ^[1-9][0-9]*$ ]] ||
  fail_without_rollback "HEALTH_INTERVAL_SECONDS must be a positive integer."

export APP_IMAGE
umask 077

compose() {
  docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    "$@"
}

compose_has_service() {
  compose config --services 2>/dev/null | grep -Fxq "$1"
}

ensure_image_available() {
  docker image inspect "$APP_IMAGE" >/dev/null 2>&1 || compose pull app
}

restore_previous_bundle() {
  local previous_file=""
  local target_file=""

  [[ -f "$PREVIOUS_BUNDLE_DIR/.ready" ]] || return 1
  [[ -f "$PREVIOUS_BUNDLE_DIR/deploy/compose.prod.yaml" ]] || return 1

  install -m 755 -d "$RELEASE_DIR/deploy/nginx" "$RELEASE_DIR/scripts"
  install -m 644 \
    "$PREVIOUS_BUNDLE_DIR/deploy/compose.prod.yaml" \
    "$COMPOSE_FILE"

  for relative_file in \
    deploy/nginx/http.conf.template \
    deploy/nginx/https.conf.template
  do
    previous_file="$PREVIOUS_BUNDLE_DIR/$relative_file"
    target_file="$RELEASE_DIR/$relative_file"
    if [[ -f "$previous_file" ]]; then
      install -m 644 "$previous_file" "$target_file"
    else
      rm -f "$target_file"
    fi
  done

  for relative_file in \
    scripts/ensure-compose.sh \
    scripts/deploy.sh \
    scripts/check-deploy.sh
  do
    previous_file="$PREVIOUS_BUNDLE_DIR/$relative_file"
    target_file="$RELEASE_DIR/$relative_file"
    if [[ -f "$previous_file" ]]; then
      install -m 755 "$previous_file" "$target_file"
    else
      rm -f "$target_file"
    fi
  done
}

service_container_id() {
  compose ps --all --quiet "$1" 2>/dev/null
}

service_is_healthy() {
  local service="$1"
  local container_id=""
  local health_status=""

  container_id="$(service_container_id "$service" || true)"
  [[ -n "$container_id" ]] || {
    echo "$service container was not found." >&2
    return 1
  }

  health_status="$(
    docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' \
      "$container_id" 2>/dev/null || true
  )"
  [[ "$health_status" == "healthy" ]] || {
    echo "$service is not healthy (status: $health_status)." >&2
    return 1
  }
}

service_is_running() {
  local service="$1"
  local container_id=""
  local service_status=""

  container_id="$(service_container_id "$service" || true)"
  [[ -n "$container_id" ]] || {
    echo "$service container was not found." >&2
    return 1
  }

  service_status="$(
    docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true
  )"
  [[ "$service_status" == "running" ]] || {
    echo "$service is not running (status: $service_status)." >&2
    return 1
  }
}

wait_for_healthy_service() {
  local service="$1"
  local attempt

  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++)); do
    if service_is_healthy "$service" 2>/dev/null; then
      return 0
    fi

    echo "Waiting for $service health (${attempt}/${HEALTH_ATTEMPTS})..."
    sleep "$HEALTH_INTERVAL_SECONDS"
  done

  echo "$service did not become healthy during rollback." >&2
  return 1
}

http_is_ready() {
  curl --fail --silent --show-error --max-time 5 \
    --resolve "${APP_DOMAIN}:443:127.0.0.1" \
    "$VERIFY_URL" >/dev/null
}

wait_for_http() {
  local phase="$1"
  local attempt

  for ((attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++)); do
    if http_is_ready; then
      return 0
    fi

    echo "Waiting for $phase readiness (${attempt}/${VERIFY_ATTEMPTS})..."
    sleep "$VERIFY_INTERVAL_SECONDS"
  done

  return 1
}

wait_for_legacy_http() {
  local attempt

  for ((attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++)); do
    if curl --fail --silent --show-error --max-time 5 \
      http://127.0.0.1:8080/actuator/health/readiness >/dev/null
    then
      return 0
    fi

    echo "Waiting for rollback HTTP readiness (${attempt}/${VERIFY_ATTEMPTS})..."
    sleep "$VERIFY_INTERVAL_SECONDS"
  done

  return 1
}

http_redirects_to_https() {
  local redirect_target=""

  redirect_target="$(
    curl --silent --show-error --max-time 5 \
      --resolve "${APP_DOMAIN}:80:127.0.0.1" \
      --output /dev/null \
      --write-out '%{redirect_url}' \
      "http://${APP_DOMAIN}/"
  )"
  [[ "$redirect_target" == "https://${APP_DOMAIN}/" ]]
}

prepare_rollback_environment() {
  local target_file="$1"

  install -m 600 "$PREVIOUS_ENV_FILE" "$target_file"
}

verify_deployment() {
  local app_container_id=""
  local actual_status=""
  local actual_image_ref=""
  local expected_image_id=""
  local actual_image_id=""
  local image_revision=""
  local actual_revision=""

  service_is_healthy mysql || return 1
  service_is_healthy redis || return 1
  service_is_healthy nginx || return 1
  service_is_running certbot || return 1

  app_container_id="$(service_container_id app || true)"
  [[ -n "$app_container_id" ]] || {
    echo "Application container was not found." >&2
    return 1
  }

  actual_status="$(
    docker inspect --format '{{.State.Status}}' "$app_container_id" 2>/dev/null || true
  )"
  [[ "$actual_status" == "running" ]] || {
    echo "Application container is not running (status: $actual_status)." >&2
    return 1
  }

  actual_image_ref="$(
    docker inspect --format '{{.Config.Image}}' "$app_container_id" 2>/dev/null || true
  )"
  [[ "$actual_image_ref" == "$APP_IMAGE" ]] || {
    echo "Application image reference does not match the requested release." >&2
    return 1
  }

  expected_image_id="$(
    docker image inspect --format '{{.Id}}' "$APP_IMAGE" 2>/dev/null || true
  )"
  [[ -n "$expected_image_id" ]] || {
    echo "Requested application image is not available on the host." >&2
    return 1
  }

  actual_image_id="$(
    docker inspect --format '{{.Image}}' "$app_container_id" 2>/dev/null || true
  )"
  [[ "$actual_image_id" == "$expected_image_id" ]] || {
    echo "Application image ID does not match the requested release." >&2
    return 1
  }

  image_revision="$(
    docker image inspect \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
      "$APP_IMAGE" 2>/dev/null || true
  )"
  [[ "$image_revision" == "$APP_VERSION" ]] || {
    echo "Requested image revision label does not match the deployment revision." >&2
    return 1
  }

  actual_revision="$(
    docker inspect \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
      "$app_container_id" 2>/dev/null || true
  )"
  [[ "$actual_revision" == "$APP_VERSION" ]] || {
    echo "Application revision does not match the requested release." >&2
    return 1
  }

  wait_for_http "deployment" || {
    echo "Application readiness check did not succeed." >&2
    return 1
  }
  http_redirects_to_https || {
    echo "HTTP did not redirect to the production HTTPS origin." >&2
    return 1
  }
}

rollback() {
  local previous_image=""
  local rollback_env_tmp="${ENV_FILE}.rollback"

  [[ -f "$PREVIOUS_IMAGE_FILE" && -f "$PREVIOUS_ENV_FILE" ]] || {
    echo "Rollback files are not available; no rollback was attempted." >&2
    return 1
  }

  IFS= read -r previous_image < "$PREVIOUS_IMAGE_FILE" || true
  [[ -n "$previous_image" && "$previous_image" != *[[:space:]]* ]] || {
    echo "Previous image marker is invalid; no rollback was attempted." >&2
    return 1
  }

  prepare_rollback_environment "$rollback_env_tmp"
  mv -f "$rollback_env_tmp" "$ENV_FILE"
  restore_previous_bundle || {
    echo "Previous deployment bundle is unavailable; rollback stopped." >&2
    return 1
  }
  APP_IMAGE="$previous_image"
  export APP_IMAGE

  echo "Restoring the previous application release..." >&2
  compose up -d --no-recreate mysql redis || return 1
  wait_for_healthy_service mysql || return 1
  wait_for_healthy_service redis || return 1
  ensure_image_available || return 1
  compose up -d --no-deps --force-recreate app || return 1
  if compose_has_service nginx; then
    compose up -d --no-deps --force-recreate nginx || return 1
    wait_for_healthy_service nginx || return 1
    compose up -d --no-deps certbot || return 1
    service_is_running certbot || return 1
    wait_for_http "rollback" || {
      echo "Rollback application did not become ready." >&2
      return 1
    }
    http_redirects_to_https || {
      echo "Rollback HTTP redirect did not recover." >&2
      return 1
    }
  else
    docker rm -f aandi-certbot aandi-nginx >/dev/null 2>&1 || true
    wait_for_legacy_http || {
      echo "Rollback HTTP application did not become ready." >&2
      return 1
    }
  fi

  echo "Previous application release is ready." >&2
}

if [[ "$MODE" == "--rollback-only" ]]; then
  echo "External HTTPS verification failed; restoring the previous release." >&2
  rollback
  exit 0
fi

if verify_deployment; then
  echo "Deployment verified: $APP_IMAGE ($APP_VERSION)"
  exit 0
fi

echo "Deployment verification failed; attempting rollback when possible." >&2
if ! rollback; then
  echo "Rollback was unavailable or unsuccessful." >&2
fi

# A successful rollback does not make the attempted deployment successful.
exit 1
