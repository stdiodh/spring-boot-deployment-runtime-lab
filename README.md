# 09 Docker/Runtime

## 이 시퀀스에서 다루는 문제

이번 answer 브랜치는 Spring Boot jar를 Docker 실행 단위로 묶고, 운영 profile과 환경변수 주입 흐름을 완성한 비교 기준입니다. 로컬에서만 실행되는 앱을 서버에서도 같은 방식으로 띄우려면 실행 결과물, 컨테이너 이미지, 운영 설정, 로그 확인 기준이 함께 필요합니다.

이번 범위는 "한 번 실행 가능한 배포 단위 만들기"입니다. CI/CD 전략 전체, 무중단 배포, 도메인/SSL, Nginx, ECS, Kubernetes는 다음 단계 이후의 확장 주제로 남깁니다.

## 학습 목표

- Spring Boot jar와 Docker image의 관계를 설명합니다.
- `application-prod.yaml`이 실제 값을 저장하는 파일이 아니라 운영 값의 자리를 정의하는 파일임을 이해합니다.
- compose 실행에서 앱, MySQL, Redis가 어떤 환경변수를 공유하는지 확인합니다.
- starter 구현과 answer 구현의 차이를 jar 경로, secret 주입, 로그 확인 기준으로 비교합니다.

## 멘티 시작 흐름

먼저 starter 브랜치에서 직접 구현한 뒤, 이 브랜치의 문서를 비교 기준으로 사용합니다.

```bash
git fetch origin
git diff origin/09-implementation..origin/09-answer
```

비교할 때는 파일이 채워졌는지만 보지 않고 어떤 값이 코드 밖으로 분리되었는지 함께 확인합니다.

## 읽는 순서

1. [이론 정리](./docs/theory.md)
2. [구현 가이드](./docs/implementation.md)
3. [체크리스트](./docs/checklist.md)

## 실행 / 테스트 방법

로컬 의존 서비스를 실행합니다.

```bash
docker compose up -d
```

테스트와 jar 빌드를 확인합니다.

```bash
./gradlew test
./gradlew bootJar
```

컨테이너 이미지 빌드 흐름은 아래 명령으로 확인합니다.

```bash
docker build -t aandi-deployment-runtime-lab:local .
```

## 완료 기준

- `Dockerfile`이 jar를 컨테이너 실행 단위로 묶는 방식을 설명합니다.
- 운영 설정이 환경변수 기반으로 분리되어 있습니다.
- compose 실행에서 앱과 의존 서비스가 어떤 값으로 연결되는지 설명합니다.
- `docker compose ps`와 로그 확인이 완료 기준에 포함되어 있습니다.
- `./gradlew test`와 `./gradlew bootJar`가 통과합니다.

<details>
<summary>멘토용 진행 포인트</summary>

## 수업 전 확인

- answer 브랜치에서 `./gradlew test bootJar`가 통과하는지 확인합니다.
- Docker build는 로컬 Docker 상태에 의존하므로 실패 시 Docker 실행 상태와 jar 경로를 먼저 분리합니다.
- 실제 운영 비밀번호, JWT secret, OAuth secret, SMTP password는 문서나 코드에 노출하지 않습니다.

## 수업 중 질문

- answer의 Dockerfile은 jar를 어떤 이름으로 컨테이너에 복사하나요?
- 운영 설정 파일에는 실제 값이 아니라 어떤 정보가 남아 있나요?
- 배포 명령 성공과 애플리케이션 정상 기동은 어떻게 구분하나요?

## 리뷰 기준

- 멘티가 answer 코드를 그대로 외우는 것이 아니라 jar, image, container, log check의 순서를 설명하는지 봅니다.
- secret 이름과 secret 값을 구분하고, 값 자체를 코드에 남기지 않는 기준을 설명하는지 확인합니다.
- 범위 밖 인프라 자동화는 다음 시퀀스나 별도 운영 주제로 넘깁니다.

</details>
