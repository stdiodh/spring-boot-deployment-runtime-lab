#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"

cd "$RELEASE_DIR"

# TODO 1. 컨테이너 상태를 확인하세요.
# TODO 2. 최근 애플리케이션 로그를 확인하세요.
# TODO 3. 마지막에는 HTTP 응답까지 확인하세요.
# 힌트: deploy가 끝났다고 바로 성공으로 보지 않는 감각이 이번 단계의 핵심입니다.
