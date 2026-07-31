# Docker Runtime과 CI/CD 체크리스트

## 수업 전 확인

- [ ] 오늘 시퀀스가 `09`인지 `10`인지 확인했습니다.
- [ ] 해당 `NN-implementation` 브랜치에서 시작했습니다.
- [ ] 10의 공식 prerequisite가 `09`임을 확인했습니다.
- [ ] 10을 앞당겨 진행한다면 멘토가 09 runtime scaffold를 제공했습니다.

## 09 Docker Runtime

- [ ] `./gradlew clean test bootJar`가 통과합니다.
- [ ] executable JAR가 `build/libs/app.jar` 하나로 만들어집니다.
- [ ] plain JAR task가 비활성화되어 있습니다.
- [ ] `.dockerignore`가 `build/libs/app.jar`를 image build context에 포함합니다.
- [ ] Dockerfile이 정확히 `build/libs/app.jar`를 복사합니다.
- [ ] image에 `org.opencontainers.image.revision` label이 있습니다.
- [ ] `deploy/compose.prod.yaml`은 `APP_IMAGE`가 없으면 실패합니다.
- [ ] 애플리케이션 runtime 값은 `.env`로 주입됩니다.

## 10 CI와 image 게시

- [ ] CI는 PR과 `main` push에서 test와 `bootJar`를 실행합니다.
- [ ] test 실패 시 image build와 push가 실행되지 않습니다.
- [ ] Docker Hub에는 `${GITHUB_SHA}` tag가 게시됩니다.
- [ ] `latest`는 같은 image의 보조 별칭으로만 게시됩니다.
- [ ] 실제 배포 입력은 `latest`가 아니라 SHA tag입니다.
- [ ] image revision label은 `${GITHUB_SHA}`입니다.

## secret과 runtime 경계

- [ ] Docker Hub와 EC2 접속값은 Repository Secret에 있습니다.
- [ ] DB, JWT, OAuth, Mail 값은 GitHub `production` Environment의 Secret과 Variable에 있습니다.
- [ ] Secret을 workflow 명령문에 직접 삽입하지 않고 step `env`로 전달합니다.
- [ ] workflow가 필수값 누락과 dotenv에 안전하지 않은 줄바꿈을 EC2 전송 전에 차단합니다.
- [ ] workflow가 `ssh-keyscan`으로 `known_hosts`를 준비합니다.
- [ ] EC2 `.env` 권한은 `600`입니다.
- [ ] 검증된 `.env.next`만 기존 `.env`와 원자적으로 교체됩니다.
- [ ] 기존 `.env`는 rollback을 위해 `.env.previous`로 보존됩니다.
- [ ] secret 실제 값이 workflow, script, 문서, 로그에 노출되지 않습니다.

## EC2 배포

- [ ] EC2에는 Docker, curl, sha256sum이 설치되어 있습니다.
- [ ] Compose plugin이 없으면 workflow가 checksum 검증 후 배포 사용자 영역에 설치합니다.
- [ ] 전용 배포 사용자가 Docker daemon에 접근하며, 필요하면 passwordless sudo로 `docker` 그룹에 추가됩니다.
- [ ] 첫 배포가 사전 `.env` 없이 MySQL, Redis, app을 모두 생성합니다.
- [ ] `scripts/deploy.sh`가 정확한 SHA image를 pull합니다.
- [ ] MySQL과 Redis는 `--no-recreate`로 보존되고, 없거나 멈춘 경우 기동됩니다.
- [ ] app은 `--no-deps`로 갱신됩니다.
- [ ] 기존 MySQL과 Redis container를 내리거나 다시 만들지 않습니다.
- [ ] MySQL은 root가 아닌 전용 애플리케이션 사용자를 제공합니다.
- [ ] MySQL named volume과 기존 데이터가 재배포 전후 유지됩니다.
- [ ] MySQL `3306`과 Redis `6379`는 host port로 공개되지 않습니다.
- [ ] `docker compose down -v`를 사용하지 않습니다.
- [ ] 같은 SHA를 다시 배포해도 script가 실패하지 않습니다.
- [ ] deployment concurrency가 동시 운영 배포를 직렬화합니다.

## 배포 검증

- [ ] MySQL과 Redis가 healthy 상태인지 확인합니다.
- [ ] app container가 running 상태인지 확인합니다.
- [ ] 실제 image reference와 image ID가 예상 SHA image와 같습니다.
- [ ] OCI revision label이 예상 commit SHA와 같습니다.
- [ ] DB와 Redis 상태를 포함한 readiness 응답을 제한된 횟수로 재시도합니다.
- [ ] 실패 시 Compose 상태와 최근 app log를 확인할 수 있습니다.
- [ ] 실패 시 이전 `.env`와 image로 rollback하고 rollback HTTP 상태를 다시 확인합니다.
- [ ] verify 실패가 workflow 전체 실패로 이어집니다.

## trigger 정책

- [ ] 가이드 `main`의 deploy는 `workflow_dispatch`만 사용합니다.
- [ ] 가이드 문서 변경이 자동으로 EC2를 바꾸지 않는 이유를 설명할 수 있습니다.
- [ ] 실제 서비스에서는 같은 gate를 유지하고 검토된 `main` push로 trigger를 매핑할 수 있습니다.

## 로컬 마무리

- [ ] `bash -n scripts/deploy.sh`가 통과합니다.
- [ ] `bash -n scripts/check-deploy.sh`가 통과합니다.
- [ ] `docker compose ... config`가 통과합니다.
- [ ] `git diff --check`가 통과합니다.
- [ ] 외부 Docker Hub와 EC2 검증 여부를 별도로 기록했습니다.
- [ ] 구현 후 `10-implementation..10-answer` diff를 비교했습니다.

<details>
<summary>멘토용 리뷰 기준</summary>

- 통과 기준: 학생이 `test -> SHA image -> runtime env -> Compose deploy -> readiness -> rollback`을 설명합니다.
- 보완 기준: `latest`를 실제 배포 버전으로 사용하거나, EC2에서 image를 다시 build합니다.
- 질문 예시: “workflow가 성공했지만 실행 revision이 다른 경우 이 배포는 성공인가요?”
- 질문 예시: “왜 MySQL과 Redis의 host port를 공개하지 않아도 app이 연결될 수 있나요?”
- 질문 예시: “MySQL volume이 이미 있으면 GitHub Secret 변경만으로 비밀번호가 바뀌지 않는 이유는 무엇인가요?”

</details>
