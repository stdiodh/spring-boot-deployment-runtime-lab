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

- [ ] GitHub에는 Docker Hub와 EC2 접속 secret만 있습니다.
- [ ] workflow가 `ssh-keyscan`으로 `known_hosts`를 준비합니다.
- [ ] DB, JWT, OAuth, Mail 값은 EC2 runtime `.env`에 있습니다.
- [ ] EC2 `.env` 권한은 `600`입니다.
- [ ] workflow가 EC2 `.env`를 매 배포마다 다시 만들지 않습니다.
- [ ] secret 실제 값이 workflow, script, 문서, 로그에 노출되지 않습니다.

## EC2 배포

- [ ] 09의 Compose와 runtime `.env`가 먼저 준비되어 있습니다.
- [ ] `scripts/deploy.sh`가 정확한 SHA image를 pull합니다.
- [ ] MySQL과 Redis는 `--no-recreate`로 보존되고, 없거나 멈춘 경우 기동됩니다.
- [ ] app은 `--no-deps`로 갱신됩니다.
- [ ] 기존 MySQL과 Redis container를 내리거나 다시 만들지 않습니다.
- [ ] MySQL volume과 기존 데이터가 유지됩니다.
- [ ] 같은 SHA를 다시 배포해도 script가 실패하지 않습니다.
- [ ] deployment concurrency가 동시 운영 배포를 직렬화합니다.

## 배포 검증

- [ ] app container가 running 상태인지 확인합니다.
- [ ] 실제 image reference와 image ID가 예상 SHA image와 같습니다.
- [ ] OCI revision label이 예상 commit SHA와 같습니다.
- [ ] HTTP 성공 응답을 제한된 횟수로 재시도합니다.
- [ ] 실패 시 Compose 상태와 최근 app log를 확인할 수 있습니다.
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

- 통과 기준: 학생이 `test -> SHA image -> registry -> EC2 pull -> app-only update -> verify`를 설명합니다.
- 보완 기준: `latest`를 실제 배포 버전으로 사용하거나, EC2에서 image를 다시 build합니다.
- 질문 예시: “workflow가 성공했지만 실행 revision이 다른 경우 이 배포는 성공인가요?”
- 질문 예시: “DB secret을 GitHub Actions가 매번 `.env`로 쓰지 않는 이유는 무엇인가요?”

</details>
