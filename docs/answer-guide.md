# 참고 구현 가이드

이 문서는 answer 브랜치에서만 사용하는 비교 가이드입니다. starter 구현을 마친 뒤 jar, Dockerfile, 운영 profile, compose, workflow, 로그 확인 흐름이 서로 이어지는지 확인합니다.

## 1. 꼭 비교할 파일

- `Dockerfile`
- `src/main/resources/application-prod.yaml`
- `deploy/compose.prod.yaml`
- `.github/workflows/deploy.yml`

## 2. Dockerfile 비교 포인트

확인할 핵심은 jar를 컨테이너 안으로 복사하고 Java로 실행하는 흐름입니다.

```dockerfile
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

- jar 경로가 `bootJar` 결과물과 맞는지 확인합니다.
- 컨테이너 내부 파일명이 실행 명령과 맞는지 확인합니다.
- 최적화보다 실행 단위 이해가 이번 단계의 우선순위입니다.

## 3. 운영 profile 비교 포인트

`application-prod.yaml`에는 실제 운영 값이 아니라 환경변수 자리가 남아야 합니다.

```yaml
spring:
  datasource:
    url: ${DB_URL:}
    username: ${DB_USERNAME:}
    password: ${DB_PASSWORD:}
```

- DB, Redis, JWT, mail, OAuth 값이 환경변수로 연결되는지 봅니다.
- 실제 secret 값이 파일에 직접 남아 있지 않은지 확인합니다.
- 로컬 기본 설정과 운영 설정의 역할을 구분합니다.

## 4. compose 비교 포인트

`deploy/compose.prod.yaml`은 앱과 의존 서비스를 함께 띄우는 실행 묶음입니다.

- 앱 컨테이너가 prod profile로 실행되는지 확인합니다.
- DB, Redis, JWT, mail, OAuth 환경변수가 앱 컨테이너에 전달되는지 확인합니다.
- MySQL healthcheck와 Redis service가 앱 실행 흐름에 어떤 영향을 주는지 설명합니다.

## 5. workflow 비교 포인트

workflow는 아래 순서를 유지해야 합니다.

1. 테스트와 jar 빌드
2. release bundle 준비
3. SSH key 복원
4. EC2 release 디렉터리 업로드
5. EC2에서 env 파일 생성
6. Docker build와 compose 재기동
7. 컨테이너 상태와 로그 확인

비밀값은 workflow 파일에 직접 쓰지 않고 `secrets.*` 참조로만 사용합니다.

## 6. 로그 확인 기준

배포 마지막에는 아래 계열의 확인이 필요합니다.

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
```

명령이 성공해도 애플리케이션이 DB 연결 실패나 secret 누락으로 종료될 수 있으므로, 로그 확인까지 완료 기준에 포함합니다.

## 7. 멘토 리뷰 포인트

- starter와 answer의 차이를 코드 길이가 아니라 역할 연결로 비교합니다.
- secret 값 자체를 요구하지 않고 secret 이름과 주입 위치만 확인합니다.
- EC2 환경이 없으면 `./gradlew test bootJar`와 Docker build까지를 로컬 검증 범위로 둡니다.
- 다음 시퀀스에서는 이 배포 흐름을 CI/CD 자동화 규칙으로 더 안정화한다는 연결을 남깁니다.
