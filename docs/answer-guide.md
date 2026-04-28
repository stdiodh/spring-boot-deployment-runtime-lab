# 자동화와 운영 흐름 정답 가이드

## 정답 흐름 요약

정답 기준에서는 아래 파일이 핵심입니다.

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/deploy.sh`
- `scripts/check-deploy.sh`

이 네 파일이 함께 맞물려야 `build → test → deploy → verify` 흐름이 완성됩니다.

## 1. CI workflow 정답

```yaml
name: CI

on:
  pull_request:
    branches:
      - 10-implementation
      - 10-answer
  push:
    branches:
      - 10-implementation

jobs:
  build_and_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
      - run: ./gradlew test bootJar
```

핵심은 PR이나 push가 들어왔을 때 배포 전에 먼저 build/test를 돌리는 것입니다.

## 2. deploy workflow 정답 포인트

### build job

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: ./gradlew test bootJar
      - uses: actions/upload-artifact@v4
```

- 배포에 필요한 release bundle을 artifact로 묶습니다.
- deploy job은 이 artifact를 내려받아 사용합니다.

### deploy job

```yaml
  deploy:
    needs: build
```

- build가 끝나기 전에는 deploy가 시작되지 않게 만듭니다.
- 이 연결이 있어야 순서가 더 명확해집니다.

### verify job

```yaml
  verify:
    needs: deploy
```

- deploy 뒤에 verify가 오도록 분리합니다.
- 배포 확인 단계도 workflow 안에서 하나의 job으로 보이게 만드는 것이 중요합니다.

## 3. deploy.sh 정답

```bash
#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"
APP_IMAGE="${APP_IMAGE:-aandi-deployment-runtime-lab:latest}"

cd "$RELEASE_DIR"
docker compose --env-file .env -f deploy/compose.prod.yaml down || true
docker build -t "$APP_IMAGE" .
docker compose --env-file .env -f deploy/compose.prod.yaml up -d
```

핵심은 아래 순서입니다.

1. 기존 컨테이너 정리
2. 새 이미지 빌드
3. 새 컨테이너 기동

## 4. check-deploy.sh 정답

```bash
#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${1:-$PWD}"

cd "$RELEASE_DIR"
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
```

핵심은 아래 세 가지를 같이 확인하는 것입니다.

- 컨테이너 상태
- 최근 로그
- 실제 HTTP 응답

## 5. 강사가 빠르게 비교할 포인트

- `ci.yml`이 build/test를 자동으로 실행하는가
- `deploy.yml`이 build, deploy, verify job을 분리했는가
- `deploy.sh`가 workflow 밖으로 분리되어 있는가
- `check-deploy.sh`가 `docker compose ps`, `docker logs`, `curl`을 모두 포함하는가
- Secrets가 여전히 코드에 직접 적혀 있지 않은가

## 6. 자주 나는 실수

- test 없이 bootJar만 돌리는 경우
- deploy job이 build job과 분리되지 않아 순서가 흐릿한 경우
- workflow 안에 긴 SSH 명령을 전부 적어서 읽기 어려워지는 경우
- verify 단계가 빠져서 “배포 끝”과 “정상 기동”을 구분하지 못하는 경우
