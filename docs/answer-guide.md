# 배포와 실행 환경 정답 가이드

## 정답 흐름 요약

정답 기준에서는 아래 네 파일이 핵심입니다.

- `Dockerfile`
- `src/main/resources/application-prod.yaml`
- `deploy/compose.prod.yaml`
- `.github/workflows/deploy.yml`

이 네 파일이 함께 맞물려야
로컬 jar 빌드 -> EC2 업로드 -> 컨테이너 재기동 -> 로그 확인 흐름이 완성됩니다.

## 1. Dockerfile 정답

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

핵심은 아래 두 가지입니다.

- `build/libs/*.jar`를 컨테이너 안으로 복사한다
- `java -jar /app/app.jar`로 실행한다

이번 단계에서는 이미지 최적화보다
"jar를 컨테이너 안에서 실행한다"는 개념이 먼저입니다.

## 2. application-prod.yaml 정답

```yaml
spring:
  datasource:
    url: ${DB_URL:}
    username: ${DB_USERNAME:}
    password: ${DB_PASSWORD:}
  data:
    redis:
      host: ${REDIS_HOST:}
      port: ${REDIS_PORT:6379}

jwt:
  secret: ${JWT_SECRET:}
```

핵심은 운영 환경에서 달라질 수 있는 값을 환경변수로 빼는 것입니다.

- DB 접속 정보
- Redis 접속 정보
- JWT 비밀키
- SMTP 계정
- OAuth 클라이언트 정보
- 프론트 URL

여기서 먼저 봐야 할 것은
"어떤 값이 들어갔는가"보다 "어떤 값이 파일에 직접 들어가지 않았는가"입니다.

## 3. compose.prod.yaml 정답 포인트

```yaml
services:
  app:
    image: aandi-deployment-runtime-lab:latest
    environment:
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE}
      DB_URL: ${DB_URL}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
```

여기서 학생이 꼭 봐야 할 점은 아래입니다.

- 운영 profile이 `prod`로 들어간다
- 앱 컨테이너가 `.env` 값을 전달받는다
- MySQL과 Redis가 함께 뜬다
- 마지막에는 앱 로그를 확인할 수 있는 상태가 된다

## 4. GitHub Actions 정답 포인트

### 테스트와 jar 빌드

```yaml
- name: Run tests and build jar
  run: ./gradlew test bootJar
```

배포 전에 테스트와 jar 생성을 같이 거는 이유는,
"실행 가능한 패키지"가 먼저 준비되어야 하기 때문입니다.

### SSH 키 복원

```yaml
- name: Write SSH key
  run: |
    printf '%s' "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/aandi-ec2.pem
    chmod 600 ~/.ssh/aandi-ec2.pem
```

이 단계의 핵심은 pem 키 파일을 레포에 두지 않고,
CI 환경에서만 잠깐 복원해 쓰는 것입니다.

### EC2에서 재기동

```yaml
- name: Deploy on EC2
  run: |
    ssh -i ~/.ssh/aandi-ec2.pem "${{ secrets.EC2_USERNAME }}@${{ secrets.EC2_HOST }}" <<EOF
      docker compose -f deploy/compose.prod.yaml down || true
      docker build -t aandi-deployment-runtime-lab:latest .
      docker compose --env-file .env -f deploy/compose.prod.yaml up -d
      docker logs --tail 50 aandi-app
    EOF
```

핵심은 아래 순서입니다.

1. 기존 컨테이너 정리
2. 새 이미지 빌드
3. 새 컨테이너 기동
4. 로그 확인

## 5. 환경변수 우선순위 관점에서 꼭 봐야 하는 것

정답 기준에서는 아래 감각이 잡혀야 합니다.

- `application-prod.yaml`은 자리만 정의한다
- `.env`는 운영 compose가 읽는 실제 실행 값이 된다
- GitHub Secrets는 workflow 실행 시점에 가장 바깥쪽에서 비밀값을 만든다

즉, 운영 환경에서는
"마지막에 주입한 실행 값이 실제 동작을 결정한다"는 감각이 필요합니다.

## 6. 필요한 GitHub Secrets 예시

- `EC2_HOST`
- `EC2_USERNAME`
- `EC2_SSH_KEY`
- `PROD_DB_URL`
- `PROD_DB_USERNAME`
- `PROD_DB_PASSWORD`
- `PROD_REDIS_HOST`
- `PROD_REDIS_PORT`
- `PROD_JWT_SECRET`
- `PROD_JWT_EXPIRATION_MS`
- `PROD_MAIL_HOST`
- `PROD_MAIL_PORT`
- `PROD_MAIL_USERNAME`
- `PROD_MAIL_PASSWORD`
- `PROD_GOOGLE_CLIENT_ID`
- `PROD_GOOGLE_CLIENT_SECRET`
- `PROD_FRONTEND_URL`
- `PROD_PASSWORD_RESET_URL`
- `PROD_MYSQL_DATABASE`
- `PROD_MYSQL_ROOT_PASSWORD`

## 7. 강사가 빠르게 비교할 체크 포인트

- `Dockerfile`이 jar를 복사하고 실행하는가
- `application-prod.yaml`이 운영값을 환경변수로 받는가
- `deploy.yml`이 SSH 키를 Secrets에서 복원하는가
- `deploy.yml`이 EC2에서 `.env`를 만들고 `docker compose up -d`를 실행하는가
- 마지막에 `docker logs`나 `docker compose ps`까지 확인하는가
- 비밀값이 코드에 직접 적혀 있지 않은가

## 8. 자주 나는 실수

- `JWT_SECRET`를 여전히 `application.yaml`에 고정해두는 경우
- `Dockerfile`의 jar 경로가 실제 빌드 결과와 맞지 않는 경우
- workflow에서 SSH 키 권한을 `600`으로 주지 않는 경우
- `.env`는 만들었지만 `compose.prod.yaml`이 그 값을 컨테이너에 넘기지 않는 경우
- 배포 후 로그를 확인하지 않고 끝내는 경우

## 9. answer 기준 완성 형태

`09-answer`에서는 아래가 모두 보여야 합니다.

- 운영 설정이 코드 바깥으로 밀려난 상태
- workflow가 Secrets를 통해 비밀값을 복원하는 상태
- EC2에서 재기동 후 로그 확인까지 이어지는 상태

핵심은 배포 파일을 많이 늘리는 것이 아니라,
"어떤 값은 코드에 있으면 안 되고, 어떤 값은 실행 시점에만 잠깐 존재해야 하는가"를 분명히 드러내는 것입니다.
