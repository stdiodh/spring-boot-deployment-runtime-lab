# Docker Runtime과 CI/CD 체크리스트

## 수업 전 확인

- [ ] 오늘 시퀀스가 `09`인지 `10`인지 확인했습니다.
- [ ] 이 토픽은 별도 implementation 브랜치를 사용하지 않음을 확인했습니다.
- [ ] 09는 `09-answer`, 10은 `10-answer`에서 확인합니다.
- [ ] `09-answer`가 `deploy-v1.0.3`의 HTTP 배포 완료 commit에 고정되어 있습니다.
- [ ] 10의 공식 prerequisite가 `09`임을 확인했습니다.
- [ ] `09-answer..10-answer` diff가 HTTP 기준에서 HTTPS 완성으로 바뀌는 범위임을 확인했습니다.

## 09 Docker Runtime

- [ ] `./gradlew clean test bootJar`가 통과합니다.
- [ ] executable JAR가 `build/libs/app.jar` 하나로 만들어집니다.
- [ ] plain JAR task가 비활성화되어 있습니다.
- [ ] `.dockerignore`가 `build/libs/app.jar`를 image build context에 포함합니다.
- [ ] Dockerfile이 정확히 `build/libs/app.jar`를 복사합니다.
- [ ] image에 `org.opencontainers.image.revision` label이 있습니다.
- [ ] `deploy/compose.prod.yaml`은 `APP_IMAGE`가 없으면 실패합니다.
- [ ] 애플리케이션 runtime 값은 `.env`로 주입됩니다.
- [ ] EC2의 `8080`으로 HTTP readiness와 Swagger UI를 확인할 수 있습니다.

## 10 CI와 image 게시

- [ ] CI는 PR과 `main` push에서 test와 `bootJar`를 실행합니다.
- [ ] test 실패 시 image build와 push가 실행되지 않습니다.
- [ ] Docker Hub에는 `${GITHUB_SHA}` tag가 게시됩니다.
- [ ] release tag는 같은 image를 사람이 찾기 위한 별칭으로 게시됩니다.
- [ ] 실제 배포 입력은 release tag가 아니라 SHA tag입니다.
- [ ] image revision label은 `${GITHUB_SHA}`입니다.

## secret과 runtime 경계

- [ ] Docker Hub와 EC2 접속값은 Repository Secret에 있습니다.
- [ ] DB, JWT, OAuth, Mail 값은 GitHub `production` Environment의 Secret과 Variable에 있습니다.
- [ ] `PROD_DOMAIN`, `PROD_CERTBOT_EMAIL`은 `production` Environment Variable에 있습니다.
- [ ] workflow가 두 값을 `APP_DOMAIN`, `CERTBOT_EMAIL`로 runtime `.env`에 전달합니다.
- [ ] Secret을 workflow 명령문에 직접 삽입하지 않고 step `env`로 전달합니다.
- [ ] workflow가 필수값 누락과 dotenv에 안전하지 않은 줄바꿈을 EC2 전송 전에 차단합니다.
- [ ] workflow가 `ssh-keyscan`으로 `known_hosts`를 준비합니다.
- [ ] EC2 `.env` 권한은 `600`입니다.
- [ ] 검증된 `.env.next`만 기존 `.env`와 원자적으로 교체됩니다.
- [ ] 기존 `.env`는 rollback을 위해 `.env.previous`로 보존됩니다.
- [ ] staging bundle의 필수 파일, shell 문법과 Compose 설정을 검사하고 완성된 이전 bundle snapshot을 보존합니다.
- [ ] secret 실제 값이 workflow, script, 문서, 로그에 노출되지 않습니다.

## EC2 배포

- [ ] EC2에는 Docker, curl, sha256sum이 설치되어 있습니다.
- [ ] Compose plugin이 없으면 workflow가 checksum 검증 후 배포 사용자 영역에 설치합니다.
- [ ] 전용 배포 사용자가 Docker daemon에 접근하며, 필요하면 passwordless sudo로 `docker` 그룹에 추가됩니다.
- [ ] 도메인의 모든 DNS A record가 EC2 대상 IPv4와 정확히 같고 AAAA record는 없습니다.
- [ ] Security Group은 `80`, `443`을 열고 `22`를 필요한 범위로 제한합니다.
- [ ] 첫 09→10 전환은 기존 `8080` 규칙을 HTTPS verify 성공까지 유지하고, 성공 직후 제거합니다.
- [ ] 신규 10 배포와 HTTPS 전환 완료 환경은 app의 `8080`을 외부에 공개하지 않습니다.
- [ ] 첫 배포가 사전 `.env`나 인증서 없이 MySQL·Redis, 인증서, app, Nginx, Certbot을 순서대로 준비합니다.
- [ ] `scripts/deploy.sh`가 정확한 SHA image를 pull합니다.
- [ ] MySQL과 Redis는 `--no-recreate`로 보존되고, 없거나 멈춘 경우 기동됩니다.
- [ ] app과 Nginx는 `--no-deps --force-recreate`로 갱신되고 Certbot 갱신 service가 기동됩니다.
- [ ] 기존 MySQL과 Redis container를 내리거나 다시 만들지 않습니다.
- [ ] MySQL은 root가 아닌 전용 애플리케이션 사용자를 제공합니다.
- [ ] MySQL named volume과 기존 데이터가 재배포 전후 유지됩니다.
- [ ] MySQL `3306`과 Redis `6379`는 host port로 공개되지 않습니다.
- [ ] Nginx만 `80`, `443`을 공개하고 `app:8080`으로 reverse proxy합니다.
- [ ] Nginx가 forwarded header와 WebSocket upgrade header를 전달합니다.
- [ ] Certbot이 webroot로 인증서를 발급·갱신하고 인증서 volume을 Nginx와 공유합니다.
- [ ] 인증서 volume과 MySQL volume은 재배포와 app rollback에서 유지됩니다.
- [ ] `docker compose down -v`를 사용하지 않습니다.
- [ ] 같은 SHA를 다시 배포해도 script가 실패하지 않습니다.
- [ ] deployment concurrency가 동시 운영 배포를 직렬화합니다.

## 배포 검증

- [ ] MySQL과 Redis가 healthy 상태인지 확인합니다.
- [ ] Nginx가 healthy이고 Certbot이 running인지 확인합니다.
- [ ] app container가 running 상태인지 확인합니다.
- [ ] 실제 image reference와 image ID가 예상 SHA image와 같습니다.
- [ ] OCI revision label이 예상 commit SHA와 같습니다.
- [ ] DB와 Redis 상태를 포함한 HTTPS readiness 응답을 제한된 횟수로 재시도합니다.
- [ ] `http://<domain>` 요청이 HTTPS로 이동합니다.
- [ ] `https://<domain>/actuator/health/readiness`가 유효한 인증서로 성공합니다.
- [ ] 실패 시 Compose 상태와 최근 app log를 확인할 수 있습니다.
- [ ] 내부 또는 외부 HTTPS 검증 실패 시 이전 bundle, `.env`, image를 자동 rollback하고 이전 HTTP 또는 HTTPS 상태를 다시 확인합니다.
- [ ] verify 실패가 workflow 전체 실패로 이어집니다.

## 태그 정책

- [ ] deploy는 `10-answer`에 포함된 commit의 새 `deploy-https-vX.Y.Z` annotated tag push만 받습니다.
- [ ] tag force-move event를 거부하고 09의 구 `deploy-vX.Y.Z` HTTP workflow와 prefix를 분리합니다.
- [ ] GitHub tag ruleset이 `deploy-https-v*`의 update와 delete를 제한합니다.
- [ ] 가이드나 answer 브랜치 push만으로 EC2가 바뀌지 않습니다.
- [ ] 원격 `deploy-v1.0.0`~`deploy-v1.0.3` 태그를 삭제·이동·재사용하지 않습니다.
- [ ] 새 배포와 rollback은 더 높은 새 버전 태그로 실행합니다.

## 로컬 마무리

- [ ] `bash -n scripts/ensure-compose.sh scripts/deploy.sh scripts/check-deploy.sh`가 통과합니다.
- [ ] Nginx HTTP·HTTPS template의 실제 `nginx -t`가 통과합니다.
- [ ] `docker compose ... config`가 통과합니다.
- [ ] `git diff --check`가 통과합니다.
- [ ] 외부 Docker Hub와 EC2 검증 여부를 별도로 기록했습니다.
- [ ] `09-answer..10-answer` diff를 비교했습니다.

<details>
<summary>멘토용 리뷰 기준</summary>

- 통과 기준: 학생이 `test -> SHA image -> runtime env -> Compose deploy -> Nginx/TLS -> HTTPS readiness -> rollback`을 설명합니다.
- 보완 기준: release tag를 실제 Compose image로 사용하거나, EC2에서 image를 다시 build하거나, app `8080`을 계속 공개합니다.
- 질문 예시: “workflow가 성공했지만 실행 revision이 다른 경우 이 배포는 성공인가요?”
- 질문 예시: “왜 MySQL과 Redis의 host port를 공개하지 않아도 app이 연결될 수 있나요?”
- 질문 예시: “인증서가 정상이어도 HTTPS readiness가 실패하면 왜 배포 실패인가요?”
- 질문 예시: “MySQL volume이 이미 있으면 GitHub Secret 변경만으로 비밀번호가 바뀌지 않는 이유는 무엇인가요?”

</details>
