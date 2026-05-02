# 배포와 실행 환경 구현 가이드

## 이 도메인이 필요한 이유

지금까지는 앱을 만드는 것에 집중했다면,
이번에는 그 앱을 실행 환경으로 옮기는 것을 다룹니다.
즉, 동작하는 코드를 운영 환경에서도 다시 실행할 수 있게 만드는 과정입니다.

## 학생이 완성할 최종 흐름

1. `Dockerfile`로 앱 jar를 컨테이너 실행 단위로 묶습니다.
2. `application-prod.yaml`로 운영 설정을 분리합니다.
3. `compose.prod.yaml`로 앱, MySQL, Redis 실행 구성을 맞춥니다.
4. GitHub Actions가 jar를 만들고 EC2로 전달하도록 연결합니다.
5. Secrets와 로그 확인까지 이어서 배포 흐름을 마무리합니다.

## 이번 실습에서 같이 봐야 하는 실무 질문

1. 왜 운영 비밀값은 설정 파일이 아니라 환경변수와 Secrets로 가야 하는가
2. 왜 배포 마지막 확인은 “명령 성공”이 아니라 “로그 확인”이어야 하는가

## 학생이 직접 구현할 순서

1. `Dockerfile`에서 jar 복사 경로와 실행 명령을 채웁니다.
2. `application-prod.yaml`에서 운영 환경변수 자리를 채웁니다.
3. `deploy/compose.prod.yaml`에서 앱 컨테이너와 의존 서비스 연결을 확인합니다.
4. `.github/workflows/deploy.yml`에서 jar 빌드, 업로드, EC2 재기동 흐름을 완성합니다.
5. GitHub Secrets를 채운 뒤 워크플로우를 실행하고 로그를 확인합니다.

## TODO를 넣을 파일

- `Dockerfile`
- `src/main/resources/application-prod.yaml`
- `deploy/compose.prod.yaml`
- `.github/workflows/deploy.yml`

## 각 파일의 역할

- `Dockerfile`: jar를 컨테이너 안에서 실행할 수 있게 묶는 파일
- `application-prod.yaml`: 운영 환경에서 필요한 값을 밖에서 받는 설정 파일
- `compose.prod.yaml`: 앱, MySQL, Redis를 어떤 방식으로 같이 띄울지 정하는 파일
- `deploy.yml`: 테스트, 빌드, 업로드, EC2 재기동을 자동으로 연결하는 파일

## 미리 제공할 것

- 기존 애플리케이션 코드와 테스트
- 로컬 개발용 `compose.yaml`
- EC2 준비 가이드
- GitHub Secrets에 넣을 항목 목록
- 기본 워크플로우 구조와 배포 대상 경로

## 단계별 구현 안내

### 1. Dockerfile을 완성합니다

- `build/libs/*.jar`를 컨테이너 안으로 복사합니다.
- 컨테이너 안에서 어떤 명령으로 앱을 띄울지 적습니다.
- 지금 단계에서는 멀티 스테이지 최적화보다 “jar가 어떻게 실행되는지” 이해하는 것이 더 중요합니다.

이 단계에서 먼저 이해해야 하는 문장:

- "배포 단위는 소스코드 폴더가 아니라 실행 가능한 결과물이다."
- "Dockerfile은 그 결과물을 어떤 환경에서 띄울지 고정한다."

### 2. 운영 profile을 완성합니다

- `application-prod.yaml`에 DB, Redis, JWT, SMTP, OAuth 값을 환경변수로 연결합니다.
- 운영 값을 하드코딩하지 않습니다.
- 로컬 기본값은 `application.yaml`에 두고, 운영값은 prod profile로 분리합니다.

이 단계의 핵심은 단순히 `${...}`를 치는 것이 아니라,
"설정 파일은 실제 값을 저장하는 곳이 아니라 필요한 값의 자리를 정의하는 곳"이라는 점을 이해하는 것입니다.

### 3. 운영 compose를 맞춥니다

- 앱 컨테이너에 `SPRING_PROFILES_ACTIVE=prod`가 들어가도록 확인합니다.
- 앱이 MySQL, Redis와 연결될 수 있도록 환경변수를 전달합니다.
- 운영 compose는 실행 확인용 최소 구성으로 유지합니다.

여기서 학생이 같이 떠올려야 하는 질문:

- "운영 환경에서 어떤 값은 compose가 넘기고, 어떤 값은 Secrets가 만들까?"
- "환경변수 우선순위는 어디서 결정될까?"

### 4. GitHub Actions 배포 파일을 완성합니다

- `./gradlew test bootJar`를 실행합니다.
- 만들어진 jar와 `Dockerfile`, `deploy/compose.prod.yaml`을 EC2로 올립니다.
- EC2 안에서 `.env`를 만들고 `docker compose up -d`를 다시 실행합니다.
- SSH 키, DB 비밀번호, OAuth 시크릿은 모두 GitHub Secrets에서 받습니다.
- starter에서는 `deploy.yml`이 `echo TODO...` 상태이므로, 실제 업로드와 배포 명령을 학생이 직접 채워야 합니다.

이 단계에서 특히 강조해야 하는 문장:

- "pem key를 코드에 넣지 않는다."
- "workflow 안에서도 비밀값은 Secrets 참조로만 쓴다."

### 5. 마지막에 로그를 확인합니다

- 배포가 끝났다고 바로 성공으로 보지 않습니다.
- `docker compose ps`와 `docker logs --tail 50 aandi-app`까지 확인합니다.
- 앱이 떴는지, DB 연결이 실패했는지, 포트가 충돌했는지를 로그에서 먼저 봅니다.

이 단계의 핵심은 "배포 성공"의 기준을 명확히 잡는 것입니다.
컨테이너를 띄웠다는 사실보다, 애플리케이션이 실제로 정상 기동했는지가 더 중요합니다.

## 실행 확인 방법

### 로컬

```bash
docker compose up -d
./gradlew test
./gradlew bootJar
docker build -t aandi-deployment-runtime-lab:local .
```

### 운영

1. GitHub 저장소의 Secrets를 채웁니다.
2. Actions에서 `Deploy to EC2`를 실행합니다.
3. EC2에서 컨테이너 상태와 로그를 확인합니다.

## 학생 체크 질문

- `Dockerfile`은 왜 jar 파일 경로를 알아야 하나요?
- 운영 DB 주소를 `application-prod.yaml`에 직접 적지 않는 이유는 무엇인가요?
- EC2 pem 키를 Secrets로 빼는 이유는 무엇인가요?
- 배포 후 첫 확인이 왜 로그인가요?
- 환경변수 우선순위를 모르고 있으면 어떤 문제가 생길 수 있을까요?

## 강사 / PPT 체크 질문

- jar → Docker image → EC2 실행 흐름 그림이 있는가
- `application.yaml`과 `application-prod.yaml` 차이를 시연할 수 있는가
- Secrets를 코드에 넣지 않는 이유를 분명히 설명하는가
- 마지막에 로그를 보여주며 “배포 완료”를 판단하는 장면이 있는가
- workflow와 운영 시크릿의 역할 구분이 선명한가

## 다음 도메인 연결 포인트

이번 시퀀스는 배포를 한 번 성공시키는 흐름까지가 핵심입니다.
다음 시퀀스에서는 이 과정을 더 안정적으로 운영하기 위한
CI/CD 전략과 자동화 규칙으로 확장할 수 있습니다.
