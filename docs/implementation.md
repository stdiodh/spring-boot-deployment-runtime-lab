# 구현 가이드

## 1. 구현 전에 확인할 문제

이번 구현은 새 기능을 추가하는 작업이 아닙니다. 09 시퀀스에서 만든 배포 가능한 앱을 같은 순서로 반복 실행하도록 workflow와 script를 연결하는 작업입니다.

완성해야 할 흐름은 아래와 같습니다.

```text
build -> test -> artifact -> deploy -> verify
```

## 2. 구현 순서

1. `.github/workflows/ci.yml`에서 build/test 기준을 확인합니다.
2. `.github/workflows/deploy.yml`에서 job 의존성과 artifact 전달 흐름을 채웁니다.
3. `scripts/deploy.sh`에서 서버 재배포 순서를 채웁니다.
4. `scripts/check-deploy.sh`에서 컨테이너 상태, 로그, HTTP 응답 확인을 채웁니다.
5. 실패한 단계 이후 작업이 실행되지 않는지 확인합니다.

## 3. Step 1. CI workflow 확인

### 해야 할 일

`.github/workflows/ci.yml`에서 build와 test가 자동으로 실행되는지 확인합니다.

### 왜 이 작업을 하는가

배포 전에 깨진 코드를 먼저 막아야 합니다. CI는 배포 속도를 높이기 전에 기본 동작이 깨지지 않았는지 반복해서 확인하는 장치입니다.

### 확인 방법

로컬에서 같은 기준을 실행합니다.

```bash
./gradlew test bootJar
```

## 4. Step 2. deploy workflow 확인

### 해야 할 일

`.github/workflows/deploy.yml`에서 build job, deploy job, verify job이 어떤 순서로 연결되는지 확인하고 TODO를 채웁니다.

### 왜 이 작업을 하는가

workflow는 사람이 기억하던 순서를 파일로 고정합니다. build가 실패하면 deploy가 실행되지 않아야 하고, deploy가 실패하면 verify가 실행되지 않아야 합니다.

### 확인 방법

- job의 `needs` 관계를 확인합니다.
- release bundle에 jar, Dockerfile, deploy 디렉터리, scripts 디렉터리가 포함되는지 확인합니다.
- secret 값 자체가 workflow에 직접 적혀 있지 않은지 확인합니다.

## 5. Step 3. deploy script 확인

### 해야 할 일

`scripts/deploy.sh`에서 DB와 Redis를 내리지 않고 새 image를 빌드한 뒤 compose로 앱을 갱신하는 흐름을 채웁니다.

### 왜 이 작업을 하는가

workflow에 모든 서버 명령을 길게 넣으면 배포 로직을 수정할 때 workflow 전체를 건드려야 합니다. deploy script로 분리하면 서버에서 실제 수행할 작업을 좁은 파일 안에서 관리할 수 있습니다.

### 확인 방법

- script가 `set -euo pipefail`을 유지하는지 확인합니다.
- `APP_IMAGE`와 release 경로를 외부에서 받을 수 있는지 확인합니다.
- prod compose와 `.env`를 함께 사용하는지 확인합니다.

## 6. Step 4. verify script 확인

### 해야 할 일

`scripts/check-deploy.sh`에서 컨테이너 상태, 애플리케이션 로그, HTTP 응답 확인을 채웁니다.

### 왜 이 작업을 하는가

배포 명령이 끝났다고 해서 앱이 정상 기동한 것은 아닙니다. verify는 자동화가 "배포를 실행했다"에서 끝나지 않고 "앱이 살아 있다"까지 확인하게 만드는 단계입니다.

### 확인 방법

- 컨테이너 상태 확인이 있는지 확인합니다.
- 최근 로그 확인이 있는지 확인합니다.
- HTTP 응답 확인이 있는지 확인합니다.

## 7. Step 5. 실패 차단 확인

### 해야 할 일

build, deploy, verify 중 하나가 실패하면 다음 단계로 넘어가지 않는지 확인합니다.

### 왜 이 작업을 하는가

자동화에서 중요한 것은 성공 경로뿐 아니라 실패했을 때 멈추는 위치입니다. 실패 차단 지점이 있어야 깨진 산출물이 운영 환경으로 넘어가지 않습니다.

### 확인 방법

- GitHub Actions 로그에서 처음 실패한 step을 기준으로 원인을 읽습니다.
- 실패한 job 이후 job이 실행되지 않았는지 확인합니다.

## 마지막 확인

- `./gradlew test bootJar`가 통과합니다.
- build, deploy, verify job의 책임이 분리되어 있습니다.
- deploy script와 verify script의 책임이 섞이지 않았습니다.
- secret 값은 GitHub Secrets 참조로만 사용합니다.

<details>
<summary>멘토용 진행 포인트</summary>

- 각 Step에서 명령어를 먼저 외우게 하기보다 실패하면 어디서 멈춰야 하는지 설명하게 합니다.
- 힌트가 필요하면 job 의존성, artifact 구성, script 실행 위치, verify 기준 순서로 좁혀갑니다.
- 운영 환경이 없는 경우 로컬에서는 `./gradlew test bootJar`와 script 정적 검토까지를 검증 범위로 둡니다.

</details>
