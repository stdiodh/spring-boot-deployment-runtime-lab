# 구현 가이드

## 1. 구현 전에 확인할 문제

이번 answer는 이미 동작하는 Spring Boot 앱을 jar로 만들고, Docker 실행 단위로 묶고, 운영 설정을 환경변수로 분리해 서버에서도 같은 방식으로 띄울 수 있게 만든 비교 기준입니다.

완성 흐름은 아래와 같습니다.

```text
test -> bootJar -> Dockerfile -> image build -> compose 실행 -> 상태와 로그 확인
```

## 2. 구현 순서

1. `Dockerfile`에서 jar 복사 경로와 실행 명령을 확인합니다.
2. `src/main/resources/application-prod.yaml`에서 운영 값을 환경변수로 받는지 확인합니다.
3. `deploy/compose.prod.yaml`에서 앱, MySQL, Redis 실행 구성을 확인합니다.
4. `.github/workflows/deploy.yml`에서 release bundle, SSH key, 업로드, EC2 실행 흐름을 확인합니다.
5. 컨테이너 상태와 로그로 실행 결과를 확인합니다.

## 3. Step 1. Dockerfile 확인

### 해야 할 일

`Dockerfile`에서 `bootJar` 결과물을 컨테이너 안으로 복사하고 Java 실행 명령으로 이어지는지 확인합니다.

```dockerfile
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### 왜 이 작업을 하는가

배포 단위는 소스 폴더 전체가 아니라 실행 가능한 결과물입니다. Dockerfile은 그 결과물을 어떤 런타임에서 어떤 명령으로 실행할지 고정합니다.

### 확인 방법

아래 명령으로 jar와 image 빌드를 분리해서 확인합니다.

```bash
./gradlew bootJar
docker build -t aandi-deployment-runtime-lab:local .
```

## 4. Step 2. 운영 profile 확인

### 해야 할 일

`src/main/resources/application-prod.yaml`에서 DB, Redis, JWT, mail, OAuth 값을 환경변수로 받는지 확인합니다.

### 왜 이 작업을 하는가

운영 값은 환경마다 달라지고 민감한 값도 포함합니다. 설정 파일은 실제 값을 보관하는 곳이 아니라 어떤 값을 외부에서 받아야 하는지 정의하는 곳이어야 합니다.

### 확인 방법

- 실제 DB 비밀번호, JWT secret, OAuth secret, SMTP password가 파일에 직접 들어가지 않았는지 확인합니다.
- 환경변수 이름과 실제 secret 값을 구분해서 설명합니다.

## 5. Step 3. 운영 compose 확인

### 해야 할 일

`deploy/compose.prod.yaml`에서 앱 컨테이너가 prod profile로 실행되고 MySQL, Redis와 연결되는지 확인합니다.

### 왜 이 작업을 하는가

애플리케이션만 실행되어도 DB나 Redis 연결 값이 맞지 않으면 정상 기동하지 못합니다. compose 파일은 앱과 의존 서비스를 같은 실행 묶음으로 확인하게 해줍니다.

### 확인 방법

- 앱 컨테이너에 필요한 환경변수가 전달되는지 확인합니다.
- MySQL healthcheck와 Redis service가 앱 실행 흐름에 어떤 의미를 갖는지 설명합니다.

## 6. Step 4. 배포 workflow 확인

### 해야 할 일

`.github/workflows/deploy.yml`에서 테스트, jar 빌드, release bundle 준비, SSH key 복원, EC2 업로드, 컨테이너 재기동 흐름을 확인합니다.

### 왜 이 작업을 하는가

서버에 접속해 손으로 반복하는 작업은 누락되기 쉽습니다. workflow는 "어떤 파일을 만들고, 어디로 옮기고, 어떤 순서로 실행할지"를 기록합니다.

### 확인 방법

- workflow 안에 실제 pem key나 운영 비밀번호가 직접 쓰이지 않았는지 확인합니다.
- GitHub Secrets는 값 자체가 아니라 이름으로만 참조하는지 확인합니다.
- release bundle에 jar, Dockerfile, compose 파일, env 예시가 포함되는지 확인합니다.

## 7. Step 5. 로그로 결과 확인

### 해야 할 일

배포 후 `docker compose ps`와 `docker logs`로 앱 상태를 확인합니다.

### 왜 이 작업을 하는가

배포 명령이 끝났다고 해서 앱이 정상 기동한 것은 아닙니다. DB 연결 실패, 포트 충돌, secret 누락은 로그에서 드러납니다.

### 확인 방법

운영 환경에서는 아래 계열의 명령으로 상태와 로그를 확인합니다.

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
```

## 마지막 확인

- `./gradlew test`가 통과합니다.
- `./gradlew bootJar`가 통과합니다.
- Docker image build가 성공합니다.
- 운영 secret 값은 코드에 직접 남지 않습니다.
- 배포 성공 기준에 컨테이너 상태와 로그 확인이 포함되어 있습니다.

<details>
<summary>멘토용 진행 포인트</summary>

- starter와 비교할 때 Dockerfile의 결과, prod profile의 환경변수 자리, workflow의 secret 참조 위치를 순서대로 확인합니다.
- 힌트가 필요하면 jar 경로, 환경변수 주입 위치, compose service 연결, 로그 확인 순서로 좁혀갑니다.
- EC2가 없는 환경에서는 운영 배포 대신 로컬 build/test/image build까지를 통과 기준으로 기록합니다.

</details>
