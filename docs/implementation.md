# Docker Runtime과 CI/CD 구현 안내

## 1. 구현 목표

이번 랩의 기준 흐름은 다음과 같습니다.

```text
test + bootJar
  -> Docker image build
  -> Docker Hub SHA tag
  -> EC2 exact pull
  -> app-only update
  -> image/revision/HTTP verify
```

EC2에서 source나 JAR를 다시 build하지 않습니다.
Actions가 검증한 source로 만든 image를 그대로 실행하는 것이 핵심입니다.

## 2. 09 runtime 계약 확인

### Step 1. 실행 JAR를 하나로 고정합니다

`build.gradle.kts`에서 `bootJar` 이름을 `app.jar`로 고정하고 plain `jar`를 끕니다.

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
```

`build/libs`에는 배포할 `app.jar`가 있어야 합니다.

### Step 2. revision이 있는 image를 만듭니다

```bash
docker build \
  --build-arg APP_VERSION=local \
  -t aandi-deployment-runtime-lab:local \
  .
```

Dockerfile은 wildcard가 아니라 `build/libs/app.jar`를 복사합니다.
`.dockerignore`도 이 파일을 build context에 포함해야 합니다.

label 확인:

```bash
docker image inspect \
  --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
  aandi-deployment-runtime-lab:local
```

결과는 `local`이어야 합니다.

### Step 3. 운영 Compose 입력을 확인합니다

`deploy/compose.prod.yaml`의 app image는 환경변수가 없으면 실패해야 합니다.

```yaml
image: "${APP_IMAGE:?}"
```

로컬에서는 `.env.example`을 복사해 placeholder를 바꾼 뒤 확인합니다.

```bash
cp .env.example .env
chmod 600 .env
APP_IMAGE=aandi-deployment-runtime-lab:local \
  docker compose --env-file .env -f deploy/compose.prod.yaml config
```

## 3. 10 GitHub 준비

### Step 1. Docker Hub 저장소를 준비합니다

기본 실습은 공개 저장소 `aandi-deployment-runtime-lab`을 사용합니다.
private 저장소에서 EC2 registry 인증까지 다루는 것은 이번 범위 밖입니다.

### Step 2. GitHub Secrets를 등록합니다

| 이름 | 입력 |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub 사용자명 |
| `DOCKERHUB_TOKEN` | password 대신 사용하는 Docker Hub access token |
| `EC2_HOST` | EC2 주소 |
| `EC2_USERNAME` | SSH 사용자 |
| `EC2_SSH_KEY` | SSH 개인 키 전체 |

DB, JWT, OAuth, Mail secret은 GitHub에 옮기지 않습니다.
workflow는 `EC2_HOST`를 대상으로 `ssh-keyscan`을 실행해 `known_hosts`를 준비합니다.

### Step 3. 09 EC2 scaffold를 확인합니다

10을 실행하기 전에 EC2에 다음 상태가 있어야 합니다.

- Docker와 Docker Compose plugin 설치
- HTTP 검증에 사용할 `curl` 설치
- `~/aandi-deployment-runtime-lab/.env` 존재
- `.env` 권한 `600`
- MySQL과 Redis Compose 설정 준비
- MySQL volume 유지

EC2 `.env`는 `.env.example`의 runtime 항목을 기준으로 운영자가 한 번 작성합니다.
`APP_IMAGE` 항목은 로컬 확인용 기본값이고, workflow가 deploy할 때 정확한 SHA image로 덮어씁니다.

수업을 앞당겼다면 멘토가 이 상태를 미리 제공합니다.

## 4. CI workflow 확인

`.github/workflows/ci.yml`은 PR과 `main` push에서 다음 명령을 실행합니다.

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
```

CI는 Docker Hub push나 EC2 SSH를 수행하지 않습니다.
따라서 PR 검증에서는 운영 secret을 사용하지 않습니다.

## 5. deploy workflow 확인

가이드 브랜치의 `.github/workflows/deploy.yml`은 `workflow_dispatch`만 받습니다.
수동 실행도 `main` revision일 때만 publish job을 시작합니다.

### publish job

1. test와 `bootJar`를 실행합니다.
2. Docker Hub에 로그인합니다.
3. `APP_VERSION=${GITHUB_SHA}`로 image를 한 번 build합니다.
4. 같은 image를 `${GITHUB_SHA}`와 `latest` tag로 push합니다.

학생이 registry 경계를 직접 읽을 수 있도록 login, build, push는 shell 명령으로 드러냅니다.
token은 명령 인자가 아니라 표준 입력으로 전달합니다.

```bash
printf '%s' "$DOCKERHUB_TOKEN" | docker login --username "$DOCKERHUB_USERNAME" --password-stdin
docker build --build-arg APP_VERSION="$GITHUB_SHA" \
  --tag "${IMAGE_REPOSITORY}:${GITHUB_SHA}" --tag "${IMAGE_REPOSITORY}:latest" .
docker push "${IMAGE_REPOSITORY}:${GITHUB_SHA}"
docker push "${IMAGE_REPOSITORY}:latest"
```

### deploy job

1. Compose, 두 배포 script, 값이 없는 `.env.example`만 EC2에 복사합니다.
2. EC2에 이미 있는 `.env`를 유지합니다.
3. SHA image를 정확히 pull합니다.
4. `up -d --no-recreate mysql redis`로 기존 의존 서비스를 보존하고 없으면 기동합니다.
5. `up -d --no-deps app`으로 변경된 app만 교체합니다.

### verify job

1. app container 실행 상태를 확인합니다.
2. image reference와 image ID를 확인합니다.
3. OCI revision label이 `${GITHUB_SHA}`인지 확인합니다.
4. HTTP 응답을 재시도합니다.

`publish -> deploy -> verify`는 `needs`로 연결되어 앞 단계 실패 시 다음 단계가 열리지 않습니다.
`production-deployment` concurrency는 운영 배포를 직렬화합니다.

## 6. script를 개별 확인하는 방법

실제 pull과 app 갱신은 registry와 준비된 EC2 runtime이 필요합니다.
준비된 서버에서 workflow와 같은 인자로 확인할 수 있습니다.

```bash
bash scripts/deploy.sh \
  "$PWD" \
  "docker.io/your-dockerhub-username/aandi-deployment-runtime-lab:commit-sha"
```

검증:

```bash
bash scripts/check-deploy.sh \
  "$PWD" \
  "docker.io/your-dockerhub-username/aandi-deployment-runtime-lab:commit-sha" \
  "commit-sha"
```

실패하면 출력된 Compose 상태와 app log에서 첫 실패 원인을 확인합니다.

## 7. 실제 서비스 레포에 적용할 때

가이드 `main`은 수업 문서 수정만으로 운영 서버가 바뀌지 않도록 수동 trigger를 사용합니다.
실제 서비스에서는 배포 승인이 끝난 `main` push로 시작 조건을 바꿀 수 있습니다.

```yaml
on:
  push:
    branches:
      - main
```

trigger를 바꿔도 다음 계약은 유지합니다.

- test 성공 뒤 image 게시
- SHA tag로 배포
- app-only 갱신
- exact image와 revision 검증
- HTTP 실패를 workflow 실패로 처리

## 8. 완료 전 확인

```bash
./gradlew clean test bootJar
bash -n scripts/deploy.sh
bash -n scripts/check-deploy.sh
docker compose --env-file .env.example -f deploy/compose.prod.yaml config
git diff --check
```

Docker Hub push, SSH, 실제 HTTP 검증은 외부 환경이 준비된 workflow 실행으로 확인합니다.

<details>
<summary>멘토용 진행 포인트</summary>

- 조기 수업에서는 09 runtime scaffold를 먼저 제공하고 공식 prerequisite는 바꾸지 않습니다.
- 학생이 `latest`가 아니라 SHA tag를 배포 입력으로 설명하는지 확인합니다.
- Actions secret과 EC2 runtime `.env`의 책임을 섞지 않는지 확인합니다.
- deploy 명령 성공과 image/revision/HTTP 검증 성공을 구분하게 합니다.
- 전체 Compose를 내리지 않고 app만 갱신하는 이유를 DB와 Redis 상태 보존에 연결합니다.

</details>
