# Spring Boot Deployment Runtime Lab

이 레포는 A&I 백엔드 커리큘럼의 `09~10` 배포와 운영 자동화 시퀀스를 담는 토픽 레포입니다.
`main`은 두 시퀀스의 기준 계약을 보여 주는 가이드 브랜치입니다.
이 토픽은 별도 implementation 브랜치 없이 `09-answer`와 `10-answer`의 실행 상태와 차이를 확인합니다.

## 이 레포에서 배우는 것

- 실행 가능한 Spring Boot JAR를 이름이 고정된 Docker 이미지로 묶는 방법
- 운영 설정과 배포 이미지 식별자를 실행 환경에서 주입하는 방법
- CI 실패가 이미지 게시와 배포를 차단하는 구조
- 이미지를 한 번 빌드해 Docker Hub를 거쳐 EC2까지 전달하는 구조
- commit SHA 이미지, 실행 revision, HTTP 응답으로 배포를 판정하는 방법
- GitHub의 운영 secret으로 EC2 runtime `.env`를 안전하게 만드는 방법
- Docker Compose로 MySQL과 Redis를 보존하면서 app·Nginx·Certbot의 배포 경계를 갱신하는 방법
- Nginx를 공개 진입점으로 두고 도메인, TLS 인증서, HTTPS 검증을 배포 gate에 포함하는 방법

## 브랜치와 시퀀스 경계

| 용도 | 브랜치 |
| --- | --- |
| 가이드 | `main` |
| HTTP 배포 기준 | `09-answer` |
| HTTPS 배포 완성 | `10-answer` |

별도 implementation 브랜치는 사용하지 않습니다.
코드를 따로 작성하는 실습 대신 `09-answer`를 실행 기준으로 삼고, `09-answer..10-answer` diff로 HTTPS 전환 계약을 확인합니다.

| 시퀀스 | answer 브랜치에서 확인할 계약 |
| --- | --- |
| 09 Docker Runtime | `09-answer`: `app.jar`, Dockerfile, 운영 profile, MySQL·Redis·app Compose, EC2 HTTP `:8080` 배포 기준 |
| 10 CI/CD + HTTPS | `10-answer`: 태그 gate와 SHA 이미지 배포를 유지하면서 Nginx, 도메인, 인증서 발급·갱신, HTTP→HTTPS 전환과 외부 HTTPS 검증까지 완성 |

시퀀스 10의 공식 선행 기준은 `09-answer`입니다.
`09-answer`는 `deploy-v1.0.3`이 가리키는 HTTP 배포 완료 commit에 고정합니다.
`10-answer`는 `09-answer`의 HTTP 배포 기준을 포함하며, 두 브랜치의 diff는 Nginx와 HTTPS 경계를 설명하는 자료가 됩니다.

## 기준 배포 흐름

```text
source
  -> test + bootJar
  -> build/libs/app.jar
  -> Docker image build
  -> Docker Hub SHA tag + release tag alias
  -> GitHub production secret으로 runtime .env 생성
  -> EC2 staging에서 bundle + .env.next 검증
  -> MySQL + Redis 보존, domain 인증과 TLS 인증서 준비
  -> EC2 exact SHA pull, app + Nginx + Certbot 갱신
  -> service health + image + revision + 내부·외부 HTTPS readiness verify
```

EC2 배포에는 `${GITHUB_SHA}` 태그를 사용합니다.
`deploy-https-vX.Y.Z` release tag는 사람이 HTTPS 배포 이력을 찾기 위한 별칭일 뿐, EC2가 실행할 버전을 결정하지 않습니다.

## 09 HTTP 기준 확인

```bash
./gradlew clean test bootJar
test -f build/libs/app.jar
docker build \
  --build-arg APP_VERSION=local \
  -t aandi-deployment-runtime-lab:local \
  .
```

운영 Compose를 로컬에서 확인하려면 예시 파일을 복사하고 placeholder를 로컬 값으로 바꿉니다.

```bash
cp .env.example .env
chmod 600 .env
APP_IMAGE=aandi-deployment-runtime-lab:local \
  docker compose --env-file .env -f deploy/compose.prod.yaml up -d
```

기본 `compose.yaml`은 애플리케이션 개발에 필요한 MySQL과 Redis만 실행합니다.

`09-answer`의 운영 기준은 EC2 `8080` 포트로 앱을 직접 확인하는 상태입니다.
`10-answer`에서는 app의 host port를 제거하고 Nginx의 `80`, `443`만 공개합니다.
첫 전환은 자동 rollback 뒤 09 HTTP 서비스에 접근할 수 있도록 기존 Security Group `8080` 규칙을 HTTPS verify 성공까지 유지하고, 성공 직후 제거합니다.

## 10 자동화 준비

Docker Hub 저장소는 공개 저장소를 기본값으로 사용합니다.
GitHub에는 이미지 게시와 SSH 접속에 필요한 값만 등록합니다.

| GitHub Secret | 역할 |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub 이미지 경로와 로그인 계정 |
| `DOCKERHUB_TOKEN` | Docker Hub 이미지 push 인증 |
| `EC2_HOST` | 배포 대상 호스트 |
| `EC2_USERNAME` | EC2 SSH 사용자 |
| `EC2_SSH_KEY` | EC2 SSH 개인 키 |

`production` Environment에는 runtime 값을 나눠 등록합니다.

| 구분 | 이름 |
| --- | --- |
| Secret | `PROD_DB_PASSWORD`, `PROD_MYSQL_ROOT_PASSWORD`, `PROD_JWT_SECRET` |
| Secret | `PROD_MAIL_USERNAME`, `PROD_MAIL_PASSWORD`, `PROD_GOOGLE_CLIENT_SECRET` |
| Variable | `PROD_DB_USERNAME`, `PROD_MYSQL_DATABASE`, `PROD_GOOGLE_CLIENT_ID` |
| Variable | `PROD_DOMAIN`, `PROD_CERTBOT_EMAIL` |
| Optional Variable | `PROD_FRONTEND_URL`, `PROD_PASSWORD_RESET_URL`, `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` |

앱의 `DB_PASSWORD`와 MySQL의 `MYSQL_PASSWORD`는 같은 `PROD_DB_PASSWORD`에서 만들고 root 비밀번호는 분리합니다.
workflow는 `PROD_DOMAIN`, `PROD_CERTBOT_EMAIL`을 runtime `.env`의 `APP_DOMAIN`, `CERTBOT_EMAIL`로 전달합니다.
애플리케이션 URL Variable을 생략하면 workflow가 `https://<PROD_DOMAIN>`을 기준으로 기본 URL을 만듭니다.
DB 비밀번호, JWT, OAuth, Mail 같은 애플리케이션 runtime 값은 GitHub의 `production` Environment에서 관리합니다.
SSH host key는 workflow 실행 중 `ssh-keyscan`으로 `known_hosts`에 기록합니다.
Actions는 값을 로그에 출력하지 않고 권한 `600`의 runtime 파일을 만든 뒤 EC2의 `.env.next`로 전송합니다.
EC2에 Docker Compose plugin이 없으면 workflow가 공식 release checksum을 확인하고 배포 사용자 영역에 고정 버전을 설치합니다.
배포 사용자가 Docker daemon에 접근하지 못하면 passwordless sudo를 확인한 뒤 `docker` 그룹에 추가하고 새 SSH session에서 접근을 다시 검증합니다.
publish job에서 Nginx template을 실제 `nginx -t`로 검사하고, EC2에서는 staging bundle의 필수 파일, shell 문법과 Compose 설정을 다시 검증합니다.
현재 bundle과 `.env`를 보존한 뒤 trap이 감싼 구간에서 새 파일을 설치합니다.
첫 HTTPS 배포와 이후 배포 모두 MySQL·Redis와 volume은 유지하면서 필요한 app·Nginx·Certbot 경계를 갱신합니다.
MySQL과 Redis의 host port는 공개하지 않고 Compose 내부 network에서만 사용합니다.

## workflow와 태그 정책

- `.github/workflows/ci.yml`: PR과 `main` push에서 `test + bootJar`를 실행합니다.
- `10-answer`의 `.github/workflows/deploy.yml`: 브랜치에 포함된 커밋의 새 `deploy-https-vX.Y.Z` annotated tag가 push될 때 이미지 게시, 배포, 검증을 수행합니다.
- deployment concurrency는 한 번에 하나의 운영 배포만 진행하게 합니다.
- GitHub tag ruleset은 `deploy-https-v*`의 update와 delete를 제한해 이미 사용한 HTTPS tag를 보호합니다.

가이드 `main`이나 answer 브랜치를 push하는 것만으로는 운영 EC2가 바뀌지 않습니다.
이미 원격에 push한 `deploy-v1.0.0`~`deploy-v1.0.3` 태그는 09 HTTP 배포 이력으로 보존하고 삭제·이동·재사용하지 않습니다.
HTTPS 배포는 `10-answer`의 새 커밋에 `deploy-https-v1.0.0`처럼 별도 prefix의 새 버전 태그를 만들어 시작합니다.

## 배포 성공 기준

`scripts/check-deploy.sh`는 다음을 모두 확인합니다.

- MySQL과 Redis가 healthy 상태인지
- Nginx가 healthy이고 Certbot이 running 상태인지
- `aandi-app` 컨테이너가 running 상태인지
- 컨테이너가 요청한 SHA 이미지 reference와 image ID를 사용하는지
- OCI `org.opencontainers.image.revision` label이 배포 SHA와 같은지
- 도메인의 HTTP 요청이 HTTPS로 전환되는지
- 유효한 인증서로 DB·Redis 상태를 포함한 HTTPS readiness가 제한 시간 안에 성공하는지
- GitHub runner에서도 공개 도메인의 HTTPS readiness가 성공하는지

하나라도 다르면 verify job이 실패합니다.
이전 배포 정보가 있으면 이전 Compose·Nginx template·script bundle, `.env`와 image를 함께 rollback한 뒤 이전 HTTP 또는 HTTPS 상태도 다시 확인합니다.
Docker Hub와 EC2가 필요한 구간은 로컬 명령만으로 완전히 검증할 수 없습니다.

## 브랜치 확인과 비교

```bash
git clone https://github.com/stdiodh/spring-boot-deployment-runtime-lab.git
cd spring-boot-deployment-runtime-lab
git fetch --prune --tags origin
git switch 09-answer
```

09의 HTTP 기준을 확인한 뒤 10의 HTTPS 완성본과 비교합니다.

```bash
git diff --stat 09-answer..10-answer
git diff 09-answer..10-answer
git switch 10-answer
```

## Visual Lab

`main` 가이드 브랜치에는 Docker Runtime과 CI/CD 흐름을 먼저 살펴보는 정적 학습 화면이 있습니다.

```text
docs/visual-lab/index.html
```

## 문서 안내

- [이론 정리](./docs/theory.md)
- [구현 안내](./docs/implementation.md)
- [체크리스트](./docs/checklist.md)
- [Visual Lab](./docs/visual-lab/index.html)
