#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"
APP_IMAGE="${APP_IMAGE:-aandi-deployment-runtime-lab:latest}"

cd "$RELEASE_DIR"

# TODO 1. 기존 DB와 Redis 컨테이너를 내리지 않은 채 새 앱 이미지를 준비하세요.
# 힌트: 전체 compose를 down하면 불필요한 중단 시간이 생깁니다.

# TODO 2. 새 앱 이미지를 빌드하세요.
# 힌트: APP_IMAGE 환경변수로 이미지 이름을 바깥에서 받을 수 있게 유지하세요.

# TODO 3. compose up -d로 변경된 앱 컨테이너를 다시 띄우세요.
# 힌트: prod compose와 .env를 같이 사용하는 흐름을 먼저 떠올리면 됩니다.
