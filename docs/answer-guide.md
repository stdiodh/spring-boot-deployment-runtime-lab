# 배포와 실행 환경 정답 비교 가이드

이 브랜치는 starter이므로 정답 코드를 그대로 싣지 않습니다.  
완성된 비교 기준은 `09-answer` 브랜치에서 확인합니다.

## 정답 브랜치에서 꼭 비교할 파일

- `Dockerfile`
- `src/main/resources/application-prod.yaml`
- `deploy/compose.prod.yaml`
- `.github/workflows/deploy.yml`

## 비교할 때 볼 포인트

- `Dockerfile`이 jar 복사와 실행 명령을 모두 채웠는가
- `application-prod.yaml`이 운영값을 환경변수로만 받는가
- `compose.prod.yaml`이 prod profile과 앱 환경변수를 전달하는가
- `deploy.yml`이 SSH key 복원, 업로드, EC2 재기동, 로그 확인을 모두 포함하는가
- 민감한 값이 코드에 직접 적혀 있지 않은가

## 필요한 GitHub Secrets 예시

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

## 강사가 빠르게 볼 체크 포인트

- TODO가 실제 명령과 환경변수 연결로 바뀌었는가
- pem 키, DB 비밀번호, OAuth 시크릿이 코드에 직접 들어가 있지 않은가
- 배포 마지막에 `docker logs` 확인 단계가 살아 있는가
