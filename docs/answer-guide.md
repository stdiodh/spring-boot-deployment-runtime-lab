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

이번 비교의 핵심은 "파일이 채워졌는가"보다
"어떤 값이 코드 밖으로 밀려나갔는가"를 보는 것입니다.

## 꼭 확인해야 하는 실무 포인트

### 1. 설정 파일이 실제 비밀값을 가지고 있지 않은가

정답 브랜치의 `application-prod.yaml`은 아래처럼 자리만 보여야 합니다.

```yaml
spring:
  datasource:
    url: ${DB_URL:}
    username: ${DB_USERNAME:}
    password: ${DB_PASSWORD:}
```

즉, 정답 비교에서 먼저 볼 것은
"실제 비밀번호가 보이는가"가 아니라
"실제 비밀번호가 보이지 않는가"입니다.

### 2. workflow가 pem key를 코드에 적지 않는가

정답 브랜치의 `deploy.yml`은 아래처럼 Secrets를 참조해야 합니다.

```yaml
printf '%s' "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/aandi-ec2.pem
chmod 600 ~/.ssh/aandi-ec2.pem
```

여기서 봐야 할 포인트는 아래입니다.

- 키가 workflow 파일에 직접 들어가 있지 않은가
- 실행 시점에만 복원하는가
- 권한까지 같이 맞추는가

### 3. 마지막에 로그 확인이 살아 있는가

정답 브랜치에서는 배포 마지막에 아래 같은 흐름이 보이는지 확인해야 합니다.

```bash
docker compose up -d
docker logs --tail 50 aandi-app
```

배포가 끝난 뒤 로그를 확인하지 않으면,
명령은 성공했지만 앱은 죽어 있는 상황을 놓칠 수 있습니다.

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
- pem key, DB 비밀번호, OAuth 시크릿이 코드에 직접 들어가 있지 않은가
- 환경변수 자리와 실제 값 전달 경로가 분리되어 있는가
- 배포 마지막에 `docker logs` 확인 단계가 살아 있는가
