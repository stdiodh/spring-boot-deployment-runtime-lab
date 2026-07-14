# 09 Docker/Runtime

## 이 시퀀스에서 다루는 문제

로컬에서는 `bootRun`으로 애플리케이션을 실행할 수 있지만, 운영 환경에서는 JDK, DB 주소, Redis 주소, JWT secret, OAuth secret, SMTP 계정이 달라집니다. 이번 시퀀스는 Spring Boot jar를 Docker 실행 단위로 묶고, 운영 설정을 환경변수로 분리한 뒤 컨테이너 상태와 로그로 실행 결과를 확인하는 과정을 다룹니다.

이번 범위는 "한 번 실행 가능한 배포 단위 만들기"입니다. CI/CD 전략 전체, 무중단 배포, 도메인/SSL, Nginx, ECS, Kubernetes는 다음 단계 이후의 확장 주제로 남깁니다.

## 학습 목표

- Spring Boot jar와 Docker image의 관계를 설명합니다.
- `application-prod.yaml`이 실제 값을 저장하는 파일이 아니라 운영 값의 자리를 정의하는 파일임을 이해합니다.
- compose 실행에서 앱, MySQL, Redis가 어떤 환경변수를 공유하는지 확인합니다.
- 배포 완료를 명령 성공이 아니라 컨테이너 상태와 로그로 판단합니다.

## 멘티 시작 흐름

실습은 이 starter 브랜치에서 진행합니다.

```bash
git clone -b 09-implementation https://github.com/stdiodh/spring-boot-deployment-runtime-lab.git
cd spring-boot-deployment-runtime-lab
git checkout -b feat/<이름>
```

먼저 `docs/theory.md`에서 배포 단위와 운영 설정 분리의 이유를 읽고, `docs/implementation.md`의 순서대로 TODO를 채웁니다.

## 읽는 순서

1. [이론 정리](./docs/theory.md)
2. [구현 가이드](./docs/implementation.md)
3. [체크리스트](./docs/checklist.md)

핵심 파일은 아래 순서로 확인합니다.

- `Dockerfile`
- `src/main/resources/application-prod.yaml`
- `deploy/compose.prod.yaml`
- `.github/workflows/deploy.yml`

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

- Docker Desktop 또는 Docker Engine이 실행 가능한지 확인합니다.
- 실제 운영 비밀번호, JWT secret, OAuth secret, SMTP password를 코드나 문서에 쓰지 않도록 안내합니다.
- GitHub Actions와 EC2 배포는 환경 의존성이 있으므로 로컬 검증과 운영 검증을 분리해서 설명합니다.

## 수업 중 질문

- 배포 단위가 소스 폴더가 아니라 jar와 image가 되는 이유는 무엇인가요?
- 운영 값은 왜 `application-prod.yaml`에 직접 쓰지 않나요?
- `docker compose up -d` 이후 로그를 확인해야 하는 이유는 무엇인가요?

## 리뷰 기준

- 멘티가 jar, Dockerfile, image, container의 순서를 설명하는지 확인합니다.
- 환경변수 이름과 실제 secret 값을 구분하는지 봅니다.
- 막힌 경우 완성 내용을 보여주기보다 jar 경로, 환경변수 주입 위치, 로그 확인 순서부터 질문합니다.

</details>
