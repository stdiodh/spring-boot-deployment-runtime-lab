# Spring Boot Deployment Runtime Lab

이 레포는 A&I 백엔드 커리큘럼의 `09~10` 배포와 운영 자동화 시퀀스를 담는 토픽 레포입니다.
`main`은 두 시퀀스의 기준 계약을 보여 주는 가이드 브랜치이고, 학생 실습은 오늘 번호에 맞는 `NN-implementation`에서 시작합니다.

## 이 레포에서 배우는 것

- 실행 가능한 Spring Boot JAR를 이름이 고정된 Docker 이미지로 묶는 방법
- 운영 설정과 배포 이미지 식별자를 실행 환경에서 주입하는 방법
- CI 실패가 이미지 게시와 배포를 차단하는 구조
- 이미지를 한 번 빌드해 Docker Hub를 거쳐 EC2까지 전달하는 구조
- commit SHA 이미지, 실행 revision, HTTP 응답으로 배포를 판정하는 방법
- GitHub의 운영 secret으로 EC2 runtime `.env`를 안전하게 만드는 방법
- Docker Compose로 MySQL과 Redis를 준비하고 앱만 갱신하면서 volume을 유지하는 방법

## 브랜치와 시퀀스 경계

| 용도 | 브랜치 |
| --- | --- |
| 가이드 | `main` |
| 학생 시작 | `09-implementation`, `10-implementation` |
| 참고 정답 | `09-answer`, `10-answer` |

| 시퀀스 | 준비하거나 구현할 것 |
| --- | --- |
| 09 Docker Runtime | `app.jar`, Dockerfile, 운영 profile, Compose, EC2 runtime scaffold |
| 10 CI/CD | CI gate, SHA 이미지 게시, EC2 pull, 앱 갱신, 배포 검증 |

시퀀스 10의 공식 선행 기준은 `09-answer`입니다.
수업 일정을 앞당기면 번호나 prerequisite를 바꾸지 않고, 멘토가 09의 완성된 runtime scaffold를 먼저 제공합니다.

## 기준 배포 흐름

```text
source
  -> test + bootJar
  -> build/libs/app.jar
  -> Docker image build
  -> Docker Hub SHA tag + latest alias
  -> GitHub production secret으로 runtime .env 생성
  -> EC2에 .env.next 전송 후 원자적 교체
  -> EC2 exact SHA pull
  -> Compose로 MySQL + Redis + app 기동
  -> service health + image + revision + readiness verify
```

배포에는 `${GITHUB_SHA}` 태그를 사용합니다.
`latest`는 사람이 최근 이미지를 찾기 위한 보조 별칭일 뿐, EC2가 실행할 버전을 결정하지 않습니다.

## 09 로컬 확인

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
| Optional Variable | `PROD_FRONTEND_URL`, `PROD_PASSWORD_RESET_URL`, `PROD_WEBSOCKET_ALLOWED_ORIGIN_PATTERNS` |

앱의 `DB_PASSWORD`와 MySQL의 `MYSQL_PASSWORD`는 같은 `PROD_DB_PASSWORD`에서 만들고 root 비밀번호는 분리합니다.
URL Variable을 생략하면 workflow가 `EC2_HOST`와 `8080` 포트를 기준으로 기본 URL을 만듭니다.
DB 비밀번호, JWT, OAuth, Mail 같은 애플리케이션 runtime 값은 GitHub의 `production` Environment에서 관리합니다.
SSH host key는 workflow 실행 중 `ssh-keyscan`으로 `known_hosts`에 기록합니다.
Actions는 값을 로그에 출력하지 않고 권한 `600`의 runtime 파일을 만든 뒤 EC2의 `.env.next`로 전송합니다.
EC2에 Docker Compose plugin이 없으면 workflow가 공식 release checksum을 확인하고 배포 사용자 영역에 고정 버전을 설치합니다.
배포 사용자가 Docker daemon에 접근하지 못하면 passwordless sudo를 확인한 뒤 `docker` 그룹에 추가하고 새 SSH session에서 접근을 다시 검증합니다.
EC2에서 Compose 설정을 검증한 뒤 기존 `.env`를 백업하고 `.env.next`를 `.env`로 원자적으로 교체합니다.
첫 배포에는 MySQL, Redis, app을 모두 만들고 이후 배포에는 MySQL volume을 유지하면서 app만 새 SHA image로 교체합니다.
MySQL과 Redis의 host port는 공개하지 않고 Compose 내부 network에서만 사용합니다.

## workflow 실행 정책

- `.github/workflows/ci.yml`: PR과 `main` push에서 `test + bootJar`를 실행합니다.
- `.github/workflows/deploy.yml`: `main`에서 수동 실행할 때만 이미지 게시, 배포, 검증을 수행합니다.
- deployment concurrency는 한 번에 하나의 운영 배포만 진행하게 합니다.

가이드 레포의 `main` 변경은 문서나 수업 scaffold 수정일 수 있으므로 자동으로 EC2를 바꾸면 안 됩니다.
그래서 가이드 workflow는 `workflow_dispatch`만 사용합니다.

실제 서비스 레포에 적용할 때는 동일한 job과 gate를 유지하고 배포 trigger만 검토를 통과한 `main` push로 매핑합니다.

```yaml
on:
  push:
    branches:
      - main
```

## 배포 성공 기준

`scripts/check-deploy.sh`는 다음을 모두 확인합니다.

- MySQL과 Redis가 healthy 상태인지
- `aandi-app` 컨테이너가 running 상태인지
- 컨테이너가 요청한 SHA 이미지 reference와 image ID를 사용하는지
- OCI `org.opencontainers.image.revision` label이 배포 SHA와 같은지
- 제한 시간 안에 readiness 응답이 성공하는지

하나라도 다르면 verify job이 실패합니다.
이전 배포 정보가 있으면 `.env.previous`와 이전 image로 rollback한 뒤 rollback 상태도 다시 확인합니다.
Docker Hub와 EC2가 필요한 구간은 로컬 명령만으로 완전히 검증할 수 없습니다.

## 시작과 비교

```bash
git clone https://github.com/stdiodh/spring-boot-deployment-runtime-lab.git
cd spring-boot-deployment-runtime-lab
git checkout 10-implementation
```

직접 구현한 뒤에만 참고 정답과 비교합니다.

```bash
git fetch origin
git diff 10-implementation..10-answer
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
