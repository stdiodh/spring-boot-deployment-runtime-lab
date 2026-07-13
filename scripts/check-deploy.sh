#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"

cd "$RELEASE_DIR"

# TODO 1. 컨테이너 상태를 확인하세요.
# TODO 2. 최근 애플리케이션 로그를 확인하세요.
# TODO 3. 애플리케이션 시작 시간을 고려해 HTTP 응답을 제한된 횟수만큼 재시도하세요.
# TODO 4. 재시도 후에도 실패하면 최근 로그를 다시 출력하고 실패 코드로 종료하세요.
# 힌트: 무한 대기하지 않고 성공 조건과 최대 대기 시간을 함께 정하는 것이 핵심입니다.
