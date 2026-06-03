# 체크리스트

## 1. 기능 확인

- [ ] `docker compose up -d`로 로컬 의존 서비스를 실행했습니다.
- [ ] `./gradlew test`가 통과합니다.
- [ ] `./gradlew bootJar`가 통과합니다.
- [ ] Docker image build가 성공합니다.
- [ ] 운영 환경에서는 compose 실행 후 컨테이너 상태와 로그를 확인했습니다.

## 2. 코드 구조 확인

- [ ] `Dockerfile`이 jar를 컨테이너 실행 단위로 묶습니다.
- [ ] `application-prod.yaml`은 운영 값을 환경변수로 받습니다.
- [ ] `deploy/compose.prod.yaml`은 앱, MySQL, Redis 실행 구성을 분리해 보여줍니다.
- [ ] workflow는 test, build, upload, deploy, log check 흐름을 분리합니다.
- [ ] 실제 secret 값은 코드와 문서에 직접 남지 않습니다.

## 3. 실패 케이스 확인

- [ ] `./gradlew test` 실패와 Docker build 실패를 분리해서 읽을 수 있습니다.
- [ ] jar 경로가 맞지 않을 때 Docker build가 왜 실패하는지 설명할 수 있습니다.
- [ ] 환경변수가 누락되었을 때 애플리케이션 로그에서 어떤 단서를 볼지 설명할 수 있습니다.
- [ ] `docker compose up -d`가 끝나도 앱이 죽어 있을 수 있음을 설명할 수 있습니다.

## 4. 설명할 수 있어야 하는 것

- [ ] Spring Boot jar와 Docker image의 관계
- [ ] `application.yaml`과 `application-prod.yaml`을 나누는 이유
- [ ] GitHub Secrets와 환경변수의 역할 차이
- [ ] compose가 앱과 의존 서비스를 함께 띄우는 방식
- [ ] 배포 성공 판정에 로그 확인이 필요한 이유

## 5. 남은 한계와 다음 시퀀스 연결

- [ ] 이번 answer는 운영 실행 단위를 만드는 단계이며 CI/CD 전략 전체를 완성하지 않습니다.
- [ ] 무중단 배포, 도메인/SSL, Nginx, 클라우드 인프라 자동화는 이번 범위 밖입니다.
- [ ] 다음 시퀀스에서는 이 배포 흐름을 CI/CD workflow와 script로 반복 가능하게 고정합니다.

<details>
<summary>멘토용 리뷰 기준</summary>

- 통과 기준: 멘티가 answer 구현을 보고 jar, Dockerfile, image, container, log check의 순서를 설명합니다.
- 보완 필요 기준: Docker build만 보고 배포 성공이라고 판단하거나 secret 이름과 secret 값을 구분하지 못합니다.
- 질문 예시: "배포 명령은 성공했는데 애플리케이션이 죽어 있다면 어디를 먼저 보나요?"
- 비교 포인트: starter 구현과 answer 구현의 차이를 jar 경로, prod profile, secret 주입 위치, 로그 확인 명령 순서로 봅니다.

</details>
