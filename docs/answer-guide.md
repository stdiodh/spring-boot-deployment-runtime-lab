# 자동화와 운영 흐름 정답 비교 가이드

이 브랜치는 starter이므로 정답 코드를 그대로 싣지 않습니다.
완성된 비교 기준은 `10-answer` 브랜치에서 확인합니다.

## 정답 브랜치에서 꼭 비교할 파일

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/deploy.sh`
- `scripts/check-deploy.sh`

## 비교할 때 볼 포인트

- `ci.yml`이 build/test를 자동으로 실행하는가
- `deploy.yml`이 build, deploy, verify job을 분리했는가
- `deploy.sh`가 workflow 밖으로 분리되어 있는가
- `check-deploy.sh`가 `docker compose ps`, `docker logs`, `curl`을 모두 포함하는가
- Secrets가 여전히 코드에 직접 적혀 있지 않은가

이번 비교의 핵심은 “자동화가 된다”보다
"어디서 실패를 막고 어디서 성공을 판단하는가"를 보는 것입니다.

## 꼭 확인해야 하는 실무 포인트

### 1. test를 통과하지 못한 결과가 deploy로 넘어가지 않는가

정답 브랜치의 `ci.yml`은 최소한 아래 감각이 보여야 합니다.

```yaml
- name: Run build and test
  run: ./gradlew test bootJar
```

여기서 먼저 봐야 할 것은
"build가 되느냐"보다 "검증이 먼저 오느냐"입니다.

### 2. workflow 안에 모든 서버 명령을 다 적지 않는가

정답 브랜치에서는 배포 로직이 아래처럼 script로 빠져야 합니다.

```yaml
- name: Deploy on EC2
  run: |
    ssh ... "bash scripts/deploy.sh"
```

이 구조를 봐야 하는 이유는 아래입니다.

- workflow는 순서를 담당한다
- script는 실제 작업을 담당한다
- 서버 로직 수정이 쉬워진다

### 3. verify가 배포 뒤의 별도 단계로 살아 있는가

정답 브랜치의 `check-deploy.sh`에서는 아래 흐름이 보여야 합니다.

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
```

여기서 봐야 할 포인트는 아래입니다.

- 컨테이너 상태 확인
- 애플리케이션 로그 확인
- 실제 HTTP 응답 확인

즉, 배포 성공 여부를 명령 종료가 아니라 실행 결과로 판단하고 있는가를 봐야 합니다.

## 강사가 빠르게 볼 체크 포인트

- `ci.yml`이 build/test를 자동으로 실행하는가
- `deploy.yml`이 artifact 업로드와 deploy/verify 순서를 분명히 보여주는가
- `deploy.sh`가 workflow 밖으로 분리되어 있는가
- `check-deploy.sh`가 상태, 로그, 응답을 모두 확인하는가
- 실패한 단계가 다음 단계로 넘어가지 않게 설계되어 있는가

## 학생이 자주 놓치는 부분

- build만 되고 test는 비워둔 경우
- verify를 배포 뒤의 선택사항으로 오해하는 경우
- workflow 안에 모든 명령을 길게 적는 경우
- Secrets 참조 대신 값을 직접 적어버리는 경우

정답 비교에서 가장 중요한 질문은 이것입니다.

"이 자동화는 어디에서 멈춰야 하고, 어디에서 성공이라고 말할 수 있는가?"
