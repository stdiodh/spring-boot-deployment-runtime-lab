#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  echo "Usage: $0 COMPOSE_VERSION" >&2
  exit 2
fi

COMPOSE_VERSION="$1"

fail() {
  echo "$1" >&2
  exit 1
}

[[ "$COMPOSE_VERSION" == "v5.1.4" ]] ||
  fail "COMPOSE_VERSION must match the release with pinned checksums: v5.1.4."

expected_version="${COMPOSE_VERSION#v}"
installed_version="$(docker compose version --short 2>/dev/null || true)"
if [[ "${installed_version#v}" == "$expected_version" ]]; then
  docker compose version
  exit 0
fi

command -v curl >/dev/null 2>&1 ||
  fail "curl is required to install the Docker Compose plugin."
command -v sha256sum >/dev/null 2>&1 ||
  fail "sha256sum is required to verify the Docker Compose plugin."

case "$(uname -m)" in
  x86_64 | amd64)
    compose_arch="x86_64"
    expected_sha256="33b208d7e76639db742fae84b966cc01dacae58ca3fc4dabbc907045aefdf0c4"
    ;;
  aarch64 | arm64)
    compose_arch="aarch64"
    expected_sha256="d4fb48b72857810314d3ee77123c89954101844efa4788031221f4c370495946"
    ;;
  *)
    fail "This EC2 architecture is not supported by the Compose installer."
    ;;
esac

docker_config_dir="${DOCKER_CONFIG:-$HOME/.docker}"
plugin_dir="${docker_config_dir}/cli-plugins"
asset="docker-compose-linux-${compose_arch}"
release_url="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}"
compose_tmp_dir="$(mktemp -d)"

cleanup() {
  if [[ -n "${compose_tmp_dir:-}" && -d "$compose_tmp_dir" ]]; then
    rm -rf -- "$compose_tmp_dir"
  fi
}
trap cleanup EXIT

curl --fail --silent --show-error --location \
  "${release_url}/${asset}" \
  --output "${compose_tmp_dir}/${asset}"

(
  cd "$compose_tmp_dir"
  printf '%s *%s\n' "$expected_sha256" "$asset" | sha256sum --check -
)

install -m 700 -d "$plugin_dir"
install -m 755 "${compose_tmp_dir}/${asset}" "${plugin_dir}/docker-compose"

installed_version="$(docker compose version --short 2>/dev/null || true)"
[[ "${installed_version#v}" == "$expected_version" ]] ||
  fail "Docker did not load the requested Compose plugin version."
docker compose version
