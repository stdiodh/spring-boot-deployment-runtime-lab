# 이론 정리

## 1. 왜 이 개념이 필요한가

로컬에서는 `./gradlew bootRun`으로 애플리케이션을 실행할 수 있습니다. 운영 환경에서는 JDK 버전, DB 주소, Redis 주소, OAuth secret, SMTP 계정, JWT secret이 달라질 수 있습니다.

이번 answer 브랜치는 Spring Boot jar를 Docker image로 묶고, 운영 설정을 환경변수로 분리하며, compose와 로그 확인까지 이어지는 최소 배포 실행 기준을 보여줍니다.

## 2. 기존 방식의 한계

소스코드만 서버에 복사하면 실행 환경 차이를 매번 사람이 맞춰야 합니다. 운영 비밀번호를 설정 파일에 직접 쓰면 Git 히스토리와 리뷰 화면에 비밀값이 남습니다. `docker compose up -d` 명령만 보고 성공으로 판단하면 애플리케이션이 실제로 죽어 있는 상황을 놓칠 수 있습니다.

그래서 배포에서는 실행 단위, 설정 분리, 로그 확인을 함께 봐야 합니다.

## 3. 이번 시퀀스에서 선택한 접근

answer 구현의 흐름은 아래와 같습니다.

1. `./gradlew test bootJar`로 테스트와 jar 빌드를 확인합니다.
2. `Dockerfile`로 jar를 컨테이너 실행 단위로 묶습니다.
3. `application-prod.yaml`은 운영 값의 자리를 환경변수로 정의합니다.
4. `deploy/compose.prod.yaml`은 앱, MySQL, Redis가 함께 실행될 구성을 정합니다.
5. workflow는 release bundle, SSH key 복원, 업로드, EC2 실행, 로그 확인을 순서대로 연결합니다.

이번 단계에서는 CI/CD 전략 전체보다 "운영 실행 단위를 어떻게 만들고 확인하는가"에 집중합니다.

## 4. 핵심 개념

### jar

Spring Boot 애플리케이션을 실행 가능한 결과물로 묶은 파일입니다. 배포에서는 프로젝트 폴더 전체보다 실제로 실행할 결과물을 먼저 확인합니다.

### Dockerfile

애플리케이션을 어떤 이미지와 작업 디렉터리, 실행 명령으로 띄울지 정하는 파일입니다. answer에서는 jar를 `app.jar`로 복사해 Java 명령으로 실행합니다.

### profile

실행 환경에 따라 다른 설정 묶음을 적용하는 방식입니다. 로컬 설정과 운영 설정이 섞이지 않도록 `application-prod.yaml`을 분리합니다.

### environment variable

코드 밖에서 주입하는 실행 환경 값입니다. 운영 DB 주소나 secret처럼 환경마다 달라지는 값은 환경변수로 받습니다.

### GitHub Secrets

workflow 실행 시점에만 참조할 수 있는 비밀값 저장소입니다. SSH key, DB password, OAuth secret 같은 값은 코드에 직접 남기지 않습니다.

### runtime log

서버에서 애플리케이션이 실제로 어떻게 기동되었는지 보여주는 기록입니다. 배포 명령이 끝난 뒤에도 로그를 확인해야 DB 연결 실패, 포트 충돌, secret 누락을 발견할 수 있습니다.

## 5. 짧은 예제와 해설

Dockerfile의 핵심은 jar를 컨테이너 안으로 복사하고 Java로 실행하는 것입니다.

```dockerfile
ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

운영 설정은 실제 값을 저장하지 않고 환경변수 자리만 둡니다.

```yaml
spring:
  datasource:
    url: ${DB_URL:}
    username: ${DB_USERNAME:}
    password: ${DB_PASSWORD:}
```

배포 흐름의 마지막은 컨테이너 상태와 로그 확인입니다.

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
```

이 세 조각은 "실행 결과물 만들기", "운영 값 분리하기", "정상 기동 확인하기"를 각각 담당합니다.

## 6. 다음 구현으로 연결되는 지점

answer 비교 후에는 아래 질문으로 구현을 설명할 수 있어야 합니다.

- jar 파일은 Docker image 안에서 어떤 이름으로 복사되나요?
- 운영 DB, Redis, JWT, mail, OAuth 값은 어디에서 주입되나요?
- workflow에서 secret 값 자체가 아니라 secret 이름만 참조하는 이유는 무엇인가요?
- 배포 명령 성공과 애플리케이션 정상 기동은 왜 다른 기준인가요?

다음 시퀀스에서는 이 수동 배포 흐름을 CI/CD workflow와 script로 더 반복 가능하게 고정합니다.

<details>
<summary>멘토용 설명 포인트</summary>

- starter 구현과 비교할 때 Dockerfile의 세 줄을 외우게 하기보다 jar가 image 안에서 실행되는 순서를 설명하게 합니다.
- secret 값 자체를 예시로 쓰지 않고 secret 이름과 주입 위치를 구분하게 합니다.
- 로그 확인을 "추가 작업"이 아니라 배포 성공 판정의 일부로 설명하게 합니다.

</details>
