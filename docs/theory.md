# 배포와 실행 환경

> Docker, 운영 profile, GitHub Actions, GitHub Secrets가 왜 함께 등장하는지 흐름으로 이해하는 문서입니다.

> 이번 시퀀스 한 줄 요약  
> 이번 실습은 로컬에서만 잘 돌던 앱을 운영 환경에 맞는 하나의 배포 단위로 묶고, EC2에서 다시 실행하면서 환경 분리와 로그 확인의 필요성을 체감하는 과정입니다.

## 먼저 이것만 기억해도 됩니다

- 배포는 코드를 복사하는 일이 아니라 실행 환경을 함께 맞추는 일입니다.
- 운영 환경의 비밀값은 코드에 넣지 않고 환경변수와 Secrets로 분리해야 합니다.
- 서버에서 문제가 생기면 가장 먼저 볼 것은 로그입니다.

## 이 주제를 왜 배우는가

로컬에서는 `bootRun` 한 번으로 앱이 잘 돌아가도, 서버에서는 이야기가 달라집니다.
JDK 버전, DB 주소, Redis 주소, OAuth 키, SMTP 계정, JWT 비밀키가 모두 달라질 수 있기 때문입니다.

그래서 이번 실습에서는 실행 가능한 애플리케이션을 하나의 배포 단위로 묶고,
운영 환경에 맞는 값을 밖에서 주입하는 방식을 배웁니다.
이 흐름을 이해하면 다음 단계에서 더 본격적인 CI/CD와 운영 자동화를 붙일 때도
왜 그런 도구가 필요한지 훨씬 자연스럽게 이해할 수 있습니다.

## 기초 개념 먼저 잡기

### jar

- 무엇인가요  
  Spring Boot 앱을 실행 가능한 결과물로 묶은 파일입니다.
- 왜 필요한가요  
  서버에 올릴 때 프로젝트 전체보다 “실제로 실행되는 결과물”이 먼저 정리되어야 하기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `build/libs/*.jar`, `bootJar`

### Dockerfile

- 무엇인가요  
  애플리케이션을 어떤 환경에서 어떤 명령으로 실행할지 적어두는 파일입니다.
- 왜 필요한가요  
  로컬과 서버의 실행 차이를 줄여주고, “이 앱은 이렇게 띄운다”를 고정할 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  루트 `Dockerfile`

### profile

- 무엇인가요  
  실행 환경에 따라 다른 설정 묶음을 적용하는 방식입니다.
- 왜 필요한가요  
  로컬과 운영 서버가 같은 설정을 쓰면 DB 주소나 비밀키가 뒤섞일 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `application.yaml`, `application-prod.yaml`, `.env`의 `SPRING_PROFILES_ACTIVE`

### environment variable

- 무엇인가요  
  코드 밖에서 주입하는 실행 환경 값입니다.
- 왜 필요한가요  
  운영 서버마다 달라지는 값을 파일에 하드코딩하지 않게 도와주기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `${DB_URL}`, `${JWT_SECRET}`, `${MAIL_USERNAME}`

### GitHub Secrets

- 무엇인가요  
  workflow에서만 꺼내 쓸 수 있는 비밀값 저장소입니다.
- 왜 필요한가요  
  SSH 키, DB 비밀번호, OAuth 시크릿을 코드에 올리지 않기 위해 필요합니다.
- 이번 코드에서는 어디에 보이나요  
  `.github/workflows/deploy.yml`의 `secrets.*`

### runtime log

- 무엇인가요  
  서버에서 앱이 실제로 어떻게 올라갔는지 보여주는 기록입니다.
- 왜 필요한가요  
  배포 명령은 성공했지만 애플리케이션은 실패하는 상황을 가장 빨리 확인할 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `docker logs --tail 50 aandi-app`

## 이번 실습 흐름을 먼저 한눈에 보기

1. GitHub Actions가 애플리케이션 jar를 만듭니다.
2. `Dockerfile`이 그 jar를 실행 가능한 이미지로 묶습니다.
3. `application-prod.yaml`과 `.env`가 운영 값을 밖에서 주입합니다.
4. GitHub Secrets가 EC2 접속 키와 운영 비밀값을 숨겨서 전달합니다.
5. EC2가 `docker compose`로 앱, MySQL, Redis를 다시 띄웁니다.
6. 마지막에 컨테이너 로그로 실제 기동 상태를 확인합니다.

짧게 말하면 이번 실습은  
코드 -> jar -> Docker 이미지 -> EC2 실행 -> 로그 확인 흐름을 익히는 과정입니다.

## 현재 코드 흐름에서 어디를 보면 되는가

이번 시퀀스는 이미 동작하는 앱을 운영 환경으로 옮기는 단계입니다.

1. `Dockerfile`
   jar가 어떤 실행 단위로 바뀌는지 보여주는 시작점
2. `src/main/resources/application-prod.yaml`
   운영 환경 전용 설정 자리
3. `deploy/compose.prod.yaml`
   앱, MySQL, Redis가 어떻게 함께 뜨는지 보여주는 파일
4. `.github/workflows/deploy.yml`
   build, 전달, 재기동, 로그 확인 순서가 모이는 파일
5. `.env.example`
   어떤 환경변수가 필요한지 보여주는 힌트 파일

## 오늘 꼭 잡아야 할 질문

- 왜 운영 환경에서는 설정을 코드 밖으로 빼야 하나요?
- `Dockerfile`은 jar와 어떤 관계가 있나요?
- GitHub Actions는 직접 서버에서 앱을 실행하는가요, 아니면 전달만 하는가요?
- 배포 후 문제가 생기면 어디서부터 확인해야 하나요?

## 중요한 코드 먼저 보기

### 1. 운영 환경 전용 설정

```yaml
spring:
  datasource:
    url: ${DB_URL:}
    username: ${DB_USERNAME:}
    password: ${DB_PASSWORD:}

jwt:
  secret: ${JWT_SECRET:}
```

- 이 파일은 로컬 설정과 운영 설정이 왜 달라져야 하는지 보여줍니다.
- 학생이 기억해야 할 핵심은 "운영 값은 코드에 하드코딩하지 않는다"입니다.
- 파일: `src/main/resources/application-prod.yaml`

### 2. jar를 컨테이너 실행 단위로 묶는 코드

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

- 이 코드는 Spring Boot jar를 Docker 이미지 안으로 가져와 실행합니다.
- 학생이 기억해야 할 핵심은 "Dockerfile은 앱 실행 환경을 문서처럼 고정하는 파일"이라는 점입니다.
- 파일: `Dockerfile`

### 3. Secrets를 받아 EC2로 배포하는 흐름

```yaml
- name: Write SSH key
  run: |
    printf '%s' "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/aandi-ec2.pem
    chmod 600 ~/.ssh/aandi-ec2.pem
```

- GitHub Actions는 민감한 값을 레포에 넣지 않고 `secrets.*`에서 꺼내 씁니다.
- 학생이 기억해야 할 핵심은 "CI/CD 파일 안에서도 비밀값은 직접 적지 않는다"입니다.
- 파일: `.github/workflows/deploy.yml`

## 핵심 개념 설명

### 1. 배포 단위는 “실행 가능한 하나”여야 합니다

배포 단계에서는 프로젝트 폴더 전체보다
실제로 실행할 수 있는 단위가 무엇인지가 더 중요합니다.
이번 실습에서는 Spring Boot jar가 그 핵심이고,
Dockerfile은 그 jar를 컨테이너 안에서 실행 가능한 상태로 묶어줍니다.

학생 입장에서는 “코드를 다 올린다”보다
“실행 가능한 결과물을 만든다”는 관점이 먼저 잡혀야 합니다.

### 2. 운영 설정은 코드에서 분리해야 합니다

운영 DB 비밀번호, JWT 시크릿, SMTP 계정, OAuth 클라이언트 시크릿은 코드에 들어가면 안 됩니다.
이번 실습에서는 `application-prod.yaml`이 어떤 값이 필요한지 정의하고,
실제 값은 `.env`와 GitHub Secrets에서 받습니다.

즉, 설정 파일의 역할은 값을 저장하는 것이 아니라
어떤 값을 밖에서 받을지 약속하는 것에 가깝습니다.

### 3. 배포 성공의 마지막 기준은 로그입니다

`docker compose up -d`가 끝났다고 해서 앱이 정상 기동한 것은 아닙니다.
실제로는 DB 연결 실패, Redis 연결 실패, 포트 충돌, OAuth 시크릿 누락 같은 문제가 그 뒤에 바로 드러날 수 있습니다.

그래서 이번 시퀀스에서는 배포 완료의 마지막 기준을
"명령 성공"이 아니라 "로그에서 실제 기동 상태를 확인했는가"로 잡아야 합니다.

## 실무에서 한 번 더 보기

이번 시퀀스의 실무 확장 개념은 환경변수 우선순위와 시크릿 관리입니다.

### 문제 상황 1. 비밀번호를 설정 파일에 직접 적는다

```yaml
spring:
  datasource:
    url: jdbc:mysql://prod-db:3306/aandi
    username: root
    password: super-secret-password

jwt:
  secret: hard-coded-jwt-secret
```

이렇게 두면 실행은 쉬워 보일 수 있습니다.
하지만 실제로는 아래 문제가 생깁니다.

- Git 히스토리에 비밀값이 남습니다.
- 개발 환경과 운영 환경을 바꾸기 어렵습니다.
- 누가 어떤 비밀값을 봤는지 통제하기 어렵습니다.

### 해결 코드 예시 1. 설정 파일에는 자리만 둔다

```yaml
spring:
  datasource:
    url: ${DB_URL:}
    username: ${DB_USERNAME:}
    password: ${DB_PASSWORD:}

jwt:
  secret: ${JWT_SECRET:}
```

이 방식이면 어떤 값이 필요한지는 파일이 보여주고,
실제 값은 실행 환경이 넣어줍니다.

### 문제 상황 2. workflow 안에 pem key를 직접 적는다

```yaml
- name: Deploy
  run: |
    cat <<'EOF' > ~/.ssh/aandi.pem
    -----BEGIN PRIVATE KEY-----
    ...
    EOF
```

이 방식은 예시로는 보일 수 있어도,
실제 운영에서는 비밀키가 workflow 코드와 히스토리에 남아서 매우 위험합니다.

### 해결 코드 예시 2. Secrets에서 꺼내고 실행 시점에만 임시 파일로 만든다

```yaml
- name: Write SSH key
  run: |
    printf '%s' "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/aandi-ec2.pem
    chmod 600 ~/.ssh/aandi-ec2.pem
```

이 방식이면 키를 코드에 남기지 않고,
배포 실행 시점에만 잠깐 복원해서 쓸 수 있습니다.

### 환경변수 우선순위는 왜 중요한가

실무에서는 같은 값이 여러 곳에 있을 수 있습니다.
예를 들어 아래처럼 생각할 수 있습니다.

- `application.yaml`
- `application-prod.yaml`
- `.env`
- GitHub Secrets에서 만들어진 환경변수

학생이 지금 단계에서 꼭 이해해야 할 포인트는,
"운영에서는 마지막에 주입한 환경변수가 실제 실행 값을 결정한다"는 감각입니다.

## 이번 실습에서 꼭 보면 좋은 포인트

- `Dockerfile`에서 jar 경로가 어떻게 연결되는지
- `application-prod.yaml`이 어떤 환경변수를 요구하는지
- `deploy.yml`에서 SSH 키가 어디서 오는지
- `docker compose` 실행 후 왜 로그 확인까지 이어지는지
- `.env`와 GitHub Secrets가 어떤 역할로 나뉘는지

## 자주 헷갈리는 포인트

- Docker가 jar를 대체하는 것이 아닙니다. 이번 실습에서는 jar를 감싸서 실행합니다.
- GitHub Actions에 비밀값을 적는 것이 아니라, GitHub Secrets를 참조합니다.
- 배포가 끝났다고 해서 성공이 아닙니다. 마지막 로그 확인까지 해야 실제 기동을 알 수 있습니다.
- `application-prod.yaml`은 운영 값을 하드코딩하는 파일이 아니라, 운영 값의 자리만 정의하는 파일입니다.

## 직접 말해보기

- 왜 `application.yaml`과 `application-prod.yaml`을 나눠야 하나요?
- `Dockerfile`이 없으면 EC2에서 어떤 점이 번거로워질까요?
- `EC2_SSH_KEY`를 레포에 올리면 왜 위험한가요?
- 배포 직후 `docker logs`를 보는 이유는 무엇인가요?

## 복습 체크리스트

- [ ] Dockerfile이 jar를 어떻게 실행하는지 설명할 수 있습니다.
- [ ] 운영 비밀값을 코드에 넣지 말아야 하는 이유를 말할 수 있습니다.
- [ ] GitHub Secrets가 어디에 쓰이는지 코드에서 찾을 수 있습니다.
- [ ] 배포 후 로그를 왜 확인해야 하는지 설명할 수 있습니다.
- [ ] 환경변수 우선순위를 왜 이해해야 하는지 설명할 수 있습니다.

## 오늘 실습에서 꼭 기억할 것

- 배포는 실행 단위를 만드는 일입니다.
- 운영 환경은 로컬과 다르기 때문에 설정을 분리해야 합니다.
- 민감한 값은 Secrets로 숨기고, CI/CD는 그 값을 안전하게 전달해야 합니다.
- 배포 완료의 마지막 확인은 로그입니다.

## 다음 실습과 연결하기

이번 시퀀스에서는 배포를 한 번 성공시키는 기본 흐름에 집중했습니다.
다음 시퀀스에서는 이 흐름을 더 다듬어서
브랜치 전략, 더 안정적인 CI/CD, 운영 자동화 규칙 같은 주제로 확장할 수 있습니다.
