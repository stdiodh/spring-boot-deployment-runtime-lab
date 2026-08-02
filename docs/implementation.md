# Docker Runtime과 CI/CD 구현 안내

## 1. 구현 목표

이 토픽은 implementation 브랜치 없이 두 answer 상태를 실행하고 비교합니다.

- `09-answer`: `deploy-v1.0.3`에 고정한 EC2 `:8080` HTTP Docker Compose 배포 기준
- `10-answer`: 태그 CI/CD에 Nginx, 도메인, Certbot과 HTTPS 검증을 더한 완성본

이번 랩의 기준 흐름은 다음과 같습니다.

```text
test + bootJar
  -> Docker image build
  -> Docker Hub SHA tag
  -> production secret으로 runtime env 생성
  -> EC2 exact pull
  -> Compose stack create 또는 app update
  -> Nginx + domain certificate 준비
  -> health/image/revision/HTTPS readiness verify
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

`09-answer`에서는 app의 host `8080` 포트까지 확인합니다.
10으로 넘어가기 전에 이 HTTP 기준이 동작해야 Nginx 이전과 이후의 실패 경계를 구분할 수 있습니다.

## 3. 10 GitHub 준비

### Step 1. Docker Hub 저장소를 준비합니다

기본 실습은 공개 저장소 `aandi-deployment-runtime-lab`을 사용합니다.
private 저장소에서 EC2 registry 인증까지 다루는 것은 이번 범위 밖입니다.

### Step 2. GitHub Secrets를 등록합니다

Repository Secrets에는 image 게시와 EC2 접속값을 둡니다.

| 이름 | 입력 |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub 사용자명 |
| `DOCKERHUB_TOKEN` | password 대신 사용하는 Docker Hub access token |
| `EC2_HOST` | EC2 주소 |
| `EC2_USERNAME` | SSH 사용자 |
| `EC2_SSH_KEY` | SSH 개인 키 전체 |

GitHub의 `production` Environment에는 애플리케이션 runtime 값을 나눠 등록합니다.

| 종류 | 이름 | 입력 |
| --- | --- | --- |
| Secret | `PROD_DB_PASSWORD` | MySQL 애플리케이션 사용자 비밀번호 |
| Secret | `PROD_MYSQL_ROOT_PASSWORD` | 앱에 전달하지 않는 MySQL root 비밀번호 |
| Secret | `PROD_JWT_SECRET` | 충분히 긴 JWT 서명 키 |
| Secret | `PROD_MAIL_USERNAME` | SMTP 인증 계정 |
| Secret | `PROD_MAIL_PASSWORD` | SMTP 앱 비밀번호 |
| Secret | `PROD_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| Variable | `PROD_DB_USERNAME` | `aandi` |
| Variable | `PROD_MYSQL_DATABASE` | `aandi_lab` |
| Variable | `PROD_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| Variable | `PROD_DOMAIN` | `api.example.com`처럼 scheme과 path가 없는 운영 도메인 |
| Variable | `PROD_CERTBOT_EMAIL` | 인증서 만료 알림을 받을 이메일 |
| Optional Variable | `PROD_FRONTEND_URL` | 운영 프런트 URL, 생략하면 HTTPS 도메인 기준 |
| Optional Variable | `PROD_PASSWORD_RESET_URL` | 운영 비밀번호 재설정 URL, 생략하면 HTTPS 도메인 기준 |
| Optional Variable | `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` | 허용할 운영 origin, 생략하면 HTTPS 도메인 기준 |

workflow는 `DB_PASSWORD`와 `MYSQL_PASSWORD`를 같은 `PROD_DB_PASSWORD`에서 만들고 root 비밀번호는 분리합니다.
`PROD_DOMAIN`, `PROD_CERTBOT_EMAIL`은 runtime `.env`의 `APP_DOMAIN`, `CERTBOT_EMAIL`로 전달합니다.
workflow는 `EC2_HOST`를 대상으로 `ssh-keyscan`을 실행해 `known_hosts`를 준비합니다.

### Step 3. 09 EC2 scaffold를 확인합니다

10을 실행하기 전에 EC2에 다음 상태가 있어야 합니다.

- Docker 설치
- Compose plugin 설치와 checksum 검증에 사용할 `curl`, `sha256sum` 설치
- SSH 사용자가 Docker 명령을 실행할 수 있거나 passwordless sudo를 사용할 수 있음
- 도메인의 모든 DNS A record가 EC2 대상 IPv4와 정확히 같고 AAAA record는 없음
- Security Group의 `80`, `443` 공개와 제한된 `22` 허용
- MySQL `3306`과 Redis `6379`는 외부 인바운드에서 차단
- 첫 09→10 전환은 실패 시 HTTP rollback을 외부에서도 확인할 수 있도록 기존 `8080` 규칙을 HTTPS verify 성공까지 유지한 뒤 제거
- 신규 10 배포와 HTTPS 전환 완료 환경은 외부 `8080` 인바운드를 차단

Compose plugin이 아직 없으면 workflow가 공식 release의 고정 버전을 checksum 검증 후
배포 사용자 계정의 Docker CLI plugin 경로에 설치합니다.
Docker daemon 권한이 없으면 workflow가 passwordless sudo로 사용자를 `docker` 그룹에 추가하고
다음 SSH session에서 권한 적용 여부를 확인합니다.
`docker` 그룹은 root 수준의 Docker 제어 권한을 가지므로 전용 배포 사용자에게만 허용합니다.

EC2 runtime `.env`와 인증서는 미리 만들지 않습니다.
workflow가 `.env`를 전달하고 MySQL·Redis를 보존 또는 기동한 뒤 인증서 bootstrap, exact SHA app, HTTPS Nginx와 Certbot 순서로 전환합니다.

## 4. CI workflow 확인

`.github/workflows/ci.yml`은 PR과 `main` push에서 다음 명령을 실행합니다.

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
```

CI는 Docker Hub push나 EC2 SSH를 수행하지 않습니다.
따라서 PR 검증에서는 운영 secret을 사용하지 않습니다.

## 5. 태그 deploy workflow 확인

`10-answer`의 `.github/workflows/deploy.yml`은 새 `deploy-https-vX.Y.Z` annotated tag push만 받습니다.
태그 대상 커밋이 `10-answer`에 포함되지 않거나 태그 형식이 다르거나 기존 tag를 force-move하면 publish job을 차단합니다.

### publish job

1. shell 문법과 Nginx HTTP·HTTPS template의 실제 `nginx -t`를 검사합니다.
2. test와 `bootJar`를 실행합니다.
3. Docker Hub에 로그인합니다.
4. SHA image가 없으면 `APP_VERSION=${GITHUB_SHA}`로 build하고, 이미 있으면 revision label을 확인해 재사용합니다.
5. 같은 image를 `${GITHUB_SHA}`와 배포 release tag로 게시합니다.

학생이 registry 경계를 직접 읽을 수 있도록 login, build, push는 shell 명령으로 드러냅니다.
token은 명령 인자가 아니라 표준 입력으로 전달합니다.

```bash
printf '%s' "$DOCKERHUB_TOKEN" | docker login --username "$DOCKERHUB_USERNAME" --password-stdin
sha_image="${IMAGE_REPOSITORY}:${GITHUB_SHA}"
release_image="${IMAGE_REPOSITORY}:${RELEASE_TAG}"
if docker pull "$sha_image"; then
  docker tag "$sha_image" "$release_image"
else
  docker build --build-arg APP_VERSION="$GITHUB_SHA" \
    --tag "$sha_image" --tag "$release_image" .
  docker push "$sha_image"
fi
docker push "$release_image"
```

### deploy job

1. `production` Secret과 Variable의 필수값을 검사합니다.
2. 값 자체를 출력하지 않고 권한 `600`의 임시 `runtime.env`를 만듭니다.
3. 도메인의 모든 A record가 EC2 대상 IPv4와 정확히 같고 AAAA record가 없는지 확인합니다.
4. exact SHA `APP_IMAGE`를 주입해 Compose 설정을 먼저 검증합니다.
5. Compose, Nginx template, 배포 script와 `runtime.env`를 staging 경로로 복사합니다.
6. EC2에서도 필수 파일, shell 문법, `.env.next` 기반 Compose 설정을 다시 검증합니다.
7. 현재 bundle을 완성된 `.deploy.previous` snapshot으로 전환하고 `.env.previous`를 보존한 뒤, trap이 감싼 구간에서 새 bundle과 `.env`를 설치합니다.
8. `up -d --no-recreate mysql redis`로 상태 서비스를 보존 또는 기동합니다.
9. 인증서가 없거나 24시간 이내 만료 예정이면 HTTP challenge Nginx와 Certbot으로 발급 또는 갱신합니다.
10. SHA image를 정확히 pull하고 app과 HTTPS Nginx를 다시 만든 뒤 Certbot 갱신 service를 기동합니다.

MySQL은 `MYSQL_USER`와 `MYSQL_PASSWORD`로 애플리케이션 전용 계정을 초기화합니다.
MySQL과 Redis의 host port는 열지 않고 app이 Compose service 이름으로 접근합니다.
MySQL named volume에는 고정 이름을 사용하며 배포 script는 `down -v`를 실행하지 않습니다.
app의 host `8080`도 열지 않고 Nginx의 `80`, `443`만 공개합니다.
Nginx는 forwarded header와 WebSocket upgrade header를 app에 전달하고 인증서 volume은 app rollback과 독립적으로 보존합니다.

### verify job

1. MySQL과 Redis가 healthy 상태인지 확인합니다.
2. app container 실행 상태를 확인합니다.
3. image reference와 image ID를 확인합니다.
4. OCI revision label이 `${GITHUB_SHA}`인지 확인합니다.
5. HTTP가 HTTPS로 이동하는지 확인합니다.
6. 도메인의 HTTPS Actuator readiness를 유효한 인증서로 재시도합니다.
7. GitHub runner에서도 공개 도메인의 HTTPS readiness를 확인합니다.
8. 내부 또는 외부 검증이 실패하면 이전 deployment bundle, `.env`, image를 자동 복구하고 이전 HTTP 또는 HTTPS 상태를 다시 확인합니다.

`publish -> deploy -> verify`는 `needs`로 연결되어 앞 단계 실패 시 다음 단계가 열리지 않습니다.
`production-deployment` concurrency는 운영 배포를 직렬화합니다.

## 6. script를 개별 확인하는 방법

실제 pull과 app 갱신은 registry와 Docker가 설치된 EC2가 필요합니다.
workflow가 `.env`를 전달한 뒤 서버에서 같은 인자로 확인할 수 있습니다.

```bash
bash scripts/deploy.sh \
  "$PWD" \
  "docker.io/your-dockerhub-username/aandi-deployment-runtime-lab:commit-sha" \
  "api.example.com" \
  "operator@example.com"
```

검증:

```bash
bash scripts/check-deploy.sh \
  "$PWD" \
  "docker.io/your-dockerhub-username/aandi-deployment-runtime-lab:commit-sha" \
  "commit-sha" \
  "api.example.com"
```

실패하면 출력된 Compose 상태와 app log에서 첫 실패 원인을 확인합니다.

## 7. 배포 태그 만들기

브랜치 push만으로는 운영 서버가 바뀌지 않습니다.
검증한 `10-answer` commit에 아직 사용하지 않은 새 annotated tag를 push합니다.

```bash
git switch 10-answer
git fetch --prune --tags origin
git pull --ff-only origin 10-answer
git status --short

git tag -a deploy-https-v1.0.0 -m "Deploy HTTPS v1.0.0"
git show --stat deploy-https-v1.0.0
git push origin deploy-https-v1.0.0
```

`deploy-https-v1.0.0`은 HTTPS 첫 배포의 예시입니다.
원격에 push한 `deploy-v1.0.0`~`deploy-v1.0.3`을 포함한 기존 태그는 삭제·이동·재사용하지 않습니다.
rollback도 정상 커밋에 더 높은 새 태그를 붙여 실행합니다.
수동 tag rollback 대상은 HTTPS workflow가 들어 있는 `10-answer` commit으로 제한하고, 첫 09→10 실패는 자동 rollback으로 처리합니다.

태그 push 뒤 workflow에서 `publish -> deploy -> verify`가 모두 성공해야 배포 완료입니다.

## 8. 완료 전 확인

```bash
./gradlew clean test bootJar
bash -n scripts/ensure-compose.sh scripts/deploy.sh scripts/check-deploy.sh
docker compose --env-file .env.example -f deploy/compose.prod.yaml config
git diff --check
```

Nginx template은 publish job의 실제 `nginx -t`로 검사합니다. Docker Hub push, SSH, DNS, 인증서 발급과 실제 외부 HTTPS 검증은 외부 환경이 준비된 workflow 실행으로 확인합니다.

<details>
<summary>멘토용 진행 포인트</summary>

- `09-answer`의 HTTP 기준을 확인한 뒤 `09-answer..10-answer` diff를 읽게 합니다.
- SHA tag와 release tag의 역할, 이미 push한 배포 태그가 불변인 이유를 설명하는지 확인합니다.
- Secret, Variable, EC2 runtime `.env`의 전달 경계를 설명하는지 확인합니다.
- deploy 명령 성공과 service health/image/revision/readiness 검증 성공을 구분하게 합니다.
- 전체 Compose를 내리지 않고 MySQL·Redis를 보존하면서 app·Nginx·Certbot 경계를 갱신하는 이유를 설명하게 합니다.
- app `8080`을 공개하지 않는 이유와 Nginx의 forwarded/WebSocket header 역할을 설명하게 합니다.
- 도메인 DNS, Certbot webroot, 인증서 volume, HTTP→HTTPS 전환을 하나의 HTTPS gate로 설명하게 합니다.
- 기존 MySQL volume에서는 Secret만 바꿔도 DB 계정 비밀번호가 자동 회전되지 않음을 설명합니다.

</details>
