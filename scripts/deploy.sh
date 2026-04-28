#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"
APP_IMAGE="${APP_IMAGE:-aandi-deployment-runtime-lab:latest}"

cd "$RELEASE_DIR"

# TODO 1. 기존 컨테이너를 정리하세요.
# 힌트: down || true 같은 방식으로 이전 상태가 있어도 배포가 끊기지 않게 만들 수 있습니다.

# TODO 2. 새 앱 이미지를 빌드하세요.
# 힌트: APP_IMAGE 환경변수로 이미지 이름을 바깥에서 받을 수 있게 유지하세요.

# TODO 3. 새 컨테이너를 다시 띄우세요.
# 힌트: prod compose와 .env를 같이 사용하는 흐름을 먼저 떠올리면 됩니다.
