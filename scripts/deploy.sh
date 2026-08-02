#!/usr/bin/env bash
set -euo pipefail

if (( $# != 4 )); then
  echo "Usage: $0 RELEASE_DIR APP_IMAGE APP_DOMAIN CERTBOT_EMAIL" >&2
  exit 2
fi

RELEASE_DIR="$1"
APP_IMAGE="$2"
APP_DOMAIN="$3"
CERTBOT_EMAIL="$4"
COMPOSE_FILE="$RELEASE_DIR/deploy/compose.prod.yaml"
ENV_FILE="$RELEASE_DIR/.env"
PREVIOUS_ENV_FILE="$RELEASE_DIR/.env.previous"
PREVIOUS_IMAGE_FILE="$RELEASE_DIR/.previous-image"
PREVIOUS_BUNDLE_DIR="$RELEASE_DIR/.deploy.previous"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-60}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"
APPLICATION_UPDATE_STARTED=0
BOOTSTRAP_NGINX_STARTED=0

fail() {
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

is_email_address() {
  [[ "$1" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]
}

[[ -d "$RELEASE_DIR" ]] || fail "Release directory was not found."
[[ -f "$COMPOSE_FILE" ]] || fail "Production Compose file was not found."
[[ -f "$ENV_FILE" && ! -L "$ENV_FILE" ]] || fail "Runtime .env file was not found."
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" ]] ||
  fail "Runtime .env file must have mode 600."
is_immutable_image "$APP_IMAGE" ||
  fail "APP_IMAGE must be an exact immutable digest or 40-character commit tag."
is_domain_name "$APP_DOMAIN" ||
  fail "APP_DOMAIN must be a lowercase fully qualified domain name."
is_email_address "$CERTBOT_EMAIL" ||
  fail "CERTBOT_EMAIL must be a valid email address."
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

wait_for_running_service() {
  local service="$1"
  local container_id=""
  local service_status="missing"
  local attempt

  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++)); do
    container_id="$(service_container_id "$service" || true)"
    if [[ -n "$container_id" ]]; then
      service_status="$(
        docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true
      )"
      if [[ "$service_status" == "running" ]]; then
        echo "$service is running."
        return 0
      fi
    fi

    echo "Waiting for $service state (${attempt}/${HEALTH_ATTEMPTS})..."
    sleep "$HEALTH_INTERVAL_SECONDS"
  done

  echo "$service did not start (last status: $service_status)." >&2
  return 1
}

wait_for_previous_readiness() {
  local url="http://127.0.0.1:8080/actuator/health/readiness"
  local attempt

  if compose_has_service nginx; then
    url="https://${APP_DOMAIN}/actuator/health/readiness"
  fi

  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++)); do
    if compose_has_service nginx; then
      if curl --fail --silent --show-error --max-time 5 \
        --resolve "${APP_DOMAIN}:443:127.0.0.1" \
        "$url" >/dev/null
      then
        return 0
      fi
    elif curl --fail --silent --show-error --max-time 5 \
      "$url" >/dev/null
    then
      return 0
    fi
    echo "Waiting for previous application readiness (${attempt}/${HEALTH_ATTEMPTS})..."
    sleep "$HEALTH_INTERVAL_SECONDS"
  done

  echo "Previous application readiness did not recover." >&2
  return 1
}

previous_http_redirects_to_https() {
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

certificate_exists() {
  compose run --rm --no-deps --entrypoint /bin/sh certbot -c \
    "test -s '/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem' && \
      test -s '/etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem'" \
    >/dev/null 2>&1
}

certificate_is_usable() {
  certificate_exists &&
    compose run --rm --no-deps --entrypoint openssl certbot x509 \
      -checkend 86400 \
      -noout \
      -in "/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem" \
      >/dev/null 2>&1
}

issue_certificate() {
  local renewal_args=()

  if certificate_exists; then
    renewal_args+=(--force-renewal)
  fi

  echo "Starting the HTTP certificate challenge endpoint..."
  BOOTSTRAP_NGINX_STARTED=1
  NGINX_TEMPLATE=http.conf.template \
    compose up -d --no-deps --force-recreate nginx
  wait_for_healthy_service nginx

  echo "Requesting the initial TLS certificate for $APP_DOMAIN..."
  compose run --rm --no-deps --entrypoint certbot certbot certonly \
    --non-interactive \
    --agree-tos \
    --no-eff-email \
    --email "$CERTBOT_EMAIL" \
    --webroot \
    --webroot-path /var/www/certbot \
    --cert-name "$APP_DOMAIN" \
    --domain "$APP_DOMAIN" \
    "${renewal_args[@]}"

  certificate_is_usable || fail "A usable TLS certificate was not created."
}

prepare_rollback_environment() {
  local target_file="$1"

  install -m 600 "$PREVIOUS_ENV_FILE" "$target_file"
}

rollback_before_verification() {
  local previous_image=""
  local rollback_env_tmp="${ENV_FILE}.rollback"

  if [[ ! -f "$PREVIOUS_ENV_FILE" ]]; then
    echo \
      "The previous runtime environment is unavailable; this may be the first deployment." \
      >&2
    return 1
  fi

  if ! prepare_rollback_environment "$rollback_env_tmp"; then
    echo "Could not prepare the previous runtime environment." >&2
    return 1
  fi
  if ! mv -f "$rollback_env_tmp" "$ENV_FILE"; then
    echo "Could not restore the previous runtime environment." >&2
    return 1
  fi

  if ! restore_previous_bundle; then
    echo "Could not restore the previous deployment bundle." >&2
    return 1
  fi

  if [[ ! -f "$PREVIOUS_IMAGE_FILE" ]]; then
    echo \
      "The previous runtime environment was restored, but no previous image marker is available." \
      >&2
    return 1
  fi

  IFS= read -r previous_image < "$PREVIOUS_IMAGE_FILE" || true
  if [[ -z "$previous_image" || "$previous_image" == *[[:space:]]* ]]; then
    echo \
      "The previous runtime environment was restored, but the image marker is invalid." \
      >&2
    return 1
  fi

  APP_IMAGE="$previous_image"
  export APP_IMAGE

  echo "Restoring the previous application before verification..." >&2
  compose up -d --no-recreate mysql redis || return 1
  wait_for_healthy_service mysql || return 1
  wait_for_healthy_service redis || return 1
  ensure_image_available || return 1
  compose up -d --no-deps --force-recreate app || return 1
  if compose_has_service nginx; then
    compose up -d --no-deps --force-recreate nginx || return 1
    wait_for_healthy_service nginx || return 1
    compose up -d --no-deps certbot || return 1
    wait_for_running_service certbot || return 1
    previous_http_redirects_to_https || return 1
  else
    docker rm -f aandi-certbot aandi-nginx >/dev/null 2>&1 || true
  fi
  wait_for_previous_readiness || return 1
}

handle_deploy_exit() {
  local original_status="$1"
  local previous_bundle_restored=0
  local rollback_status=0

  if (( original_status == 0 )); then
    return 0
  fi

  trap - EXIT
  set +e

  if (( APPLICATION_UPDATE_STARTED == 0 )); then
    if [[ -f "$PREVIOUS_ENV_FILE" ]]; then
      install -m 600 "$PREVIOUS_ENV_FILE" "$ENV_FILE"
    fi
    if restore_previous_bundle; then
      previous_bundle_restored=1
    fi

    if (( BOOTSTRAP_NGINX_STARTED == 1 )); then
      if (( previous_bundle_restored == 1 )) && compose_has_service nginx; then
        compose up -d --no-deps --force-recreate nginx >/dev/null 2>&1 || true
      else
        docker rm -f aandi-certbot aandi-nginx >/dev/null 2>&1 || true
      fi
    fi
    echo \
      "Deployment failed before the application update; the existing application was left unchanged." \
      >&2
    exit "$original_status"
  fi

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

trap 'handle_deploy_exit "$?"' EXIT

if [[ -f "$PREVIOUS_ENV_FILE" ]]; then
  previous_domain_line="$(grep -m 1 '^APP_DOMAIN=' "$PREVIOUS_ENV_FILE" || true)"
  if [[ -n "$previous_domain_line" ]]; then
    previous_domain="${previous_domain_line#APP_DOMAIN=}"
    previous_domain="${previous_domain#\'}"
    previous_domain="${previous_domain%\'}"
    [[ "$previous_domain" == "$APP_DOMAIN" ]] ||
      fail "APP_DOMAIN cannot change during an in-place deployment."
  fi

  previous_email_line="$(grep -m 1 '^CERTBOT_EMAIL=' "$PREVIOUS_ENV_FILE" || true)"
  if [[ -n "$previous_email_line" ]]; then
    previous_email="${previous_email_line#CERTBOT_EMAIL=}"
    previous_email="${previous_email#\'}"
    previous_email="${previous_email%\'}"
    [[ "$previous_email" == "$CERTBOT_EMAIL" ]] ||
      fail "CERTBOT_EMAIL cannot change during an in-place deployment."
  fi
fi

rm -f "$PREVIOUS_IMAGE_FILE"

previous_image="$(
  docker inspect --format '{{.Config.Image}}' aandi-app 2>/dev/null || true
)"
if [[ -n "$previous_image" ]]; then
  previous_image_tmp="${PREVIOUS_IMAGE_FILE}.tmp"
  printf '%s\n' "$previous_image" > "$previous_image_tmp"
  chmod 600 "$previous_image_tmp"
  mv -f "$previous_image_tmp" "$PREVIOUS_IMAGE_FILE"
elif ! docker info >/dev/null 2>&1; then
  fail "Could not inspect Docker before deployment."
fi

# --no-recreate preserves the existing database, cache, and named volume.
compose up -d --no-recreate mysql redis
wait_for_healthy_service mysql
wait_for_healthy_service redis

if ! certificate_is_usable; then
  issue_certificate
fi

compose pull app
APPLICATION_UPDATE_STARTED=1
compose up -d --no-deps --force-recreate app
compose up -d --no-deps --force-recreate nginx
wait_for_healthy_service nginx
compose up -d --no-deps certbot
