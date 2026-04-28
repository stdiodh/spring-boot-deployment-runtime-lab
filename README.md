# 배포와 실행 환경

> Docker, EC2, GitHub Actions, Secrets를 이용해 로컬에서 돌아가던 Spring Boot 앱을 운영 환경으로 옮겨보는 실습입니다.

> 이번 시퀀스 한 줄 요약  
> 이번 실습은 실행 가능한 애플리케이션을 하나의 배포 단위로 묶고, 환경변수와 시크릿을 분리한 뒤, GitHub Actions로 EC2까지 전달해보는 과정입니다.

## 이 레포에서 다루는 것

- Dockerfile로 애플리케이션 패키징하기
- `application-prod.yaml`로 운영 설정 분리하기
- GitHub Actions에서 jar를 만들고 EC2로 전달하기
- GitHub Secrets에 SSH 키와 운영 비밀값 숨기기
- 컨테이너 로그로 배포 결과 확인하기

## 문서

- [이론 문서](./docs/theory.md)
- [구현 문서](./docs/implementation.md)
- [정답 가이드](./docs/answer-guide.md)
- [체크리스트](./docs/checklist.md)
- [제공 자산 정리](./docs/assets.md)

## 학생이 직접 구현하는 핵심 파일

- [`Dockerfile`](./Dockerfile)
- [`src/main/resources/application-prod.yaml`](./src/main/resources/application-prod.yaml)
- [`deploy/compose.prod.yaml`](./deploy/compose.prod.yaml)
- [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)

이 브랜치는 `09-implementation` starter입니다.  
핵심 파일에는 TODO가 들어 있고, 정답 비교는 `09-answer` 브랜치에서 합니다.

## 실행 흐름 요약

1. `./gradlew test bootJar`로 애플리케이션 jar를 만듭니다.
2. `Dockerfile`로 앱 이미지를 만듭니다.
3. `application-prod.yaml`과 `.env`로 운영 설정을 분리합니다.
4. GitHub Actions가 jar와 배포 파일을 EC2로 전달합니다.
5. EC2에서 `docker compose`로 컨테이너를 다시 띄우고 로그를 확인합니다.

## 로컬 확인

```bash
docker compose up -d
./gradlew test
./gradlew bootRun
```

## 운영 배포 흐름

1. GitHub Secrets에 EC2 접속 정보와 운영 비밀값을 넣습니다.
2. GitHub Actions에서 `deploy.yml`을 실행합니다.
3. EC2에 업로드된 jar, `Dockerfile`, `compose.prod.yaml`로 운영 컨테이너를 다시 띄웁니다.
4. 마지막에 `docker logs`로 애플리케이션 로그를 확인합니다.
