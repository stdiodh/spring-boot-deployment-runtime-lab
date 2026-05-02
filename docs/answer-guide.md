# 자동화와 운영 흐름 정답 가이드

## 정답 흐름 요약

정답 기준에서는 아래 네 파일이 핵심입니다.

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/deploy.sh`
- `scripts/check-deploy.sh`

이 네 파일이 함께 맞물려야
build -> test -> deploy -> verify 흐름이 반복 가능하게 완성됩니다.

## 1. CI 정답 포인트

정답 기준의 `ci.yml`은 아래 감각이 보여야 합니다.

```yaml
- name: Run build and test
  run: ./gradlew test bootJar
```

핵심은 아래입니다.

- build와 test가 같이 묶여 있다
- 배포 전에 검증이 먼저 온다
- 깨진 코드는 다음 단계로 넘기지 않는다

## 2. deploy workflow 정답 포인트

정답 기준의 `deploy.yml`은 아래 역할이 분리되어 보여야 합니다.

- build job
- deploy job
- verify job

이 구조를 봐야 하는 이유는 아래입니다.

- artifact를 만든 단계와 실제 배포 단계를 구분할 수 있다
- 실패 지점을 더 명확하게 읽을 수 있다
- verify가 마지막 판정 단계로 분리된다

예시 핵심:

```yaml
jobs:
  build:
  deploy:
    needs: build
  verify:
    needs: deploy
```

## 3. deploy.sh 정답 포인트

정답 기준의 `deploy.sh`는 아래 순서를 가져야 합니다.

1. 기존 컨테이너 정리
2. 새 이미지 빌드
3. 새 컨테이너 기동

예시 핵심:

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml down || true
docker build -t "${APP_IMAGE}" .
docker compose --env-file .env -f deploy/compose.prod.yaml up -d
```

여기서 먼저 봐야 할 것은
"명령이 많다"가 아니라 "배포 순서가 분명하다"입니다.

## 4. check-deploy.sh 정답 포인트

정답 기준의 `check-deploy.sh`는 아래 세 가지를 함께 봐야 합니다.

1. 컨테이너 상태
2. 애플리케이션 로그
3. 실제 HTTP 응답

예시 핵심:

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
```

이 단계의 핵심은
"배포 명령이 끝났다"와 "앱이 정상이다"를 구분하는 것입니다.

## 5. workflow와 script를 왜 나눴는가

정답 기준에서는 아래 감각이 잡혀야 합니다.

- workflow는 순서를 묶는다
- script는 실제 서버 작업을 수행한다

예를 들면:

```yaml
- name: Deploy on EC2
  run: |
    ssh ... "bash scripts/deploy.sh"
```

이 구조면 workflow는 읽기 쉬워지고,
서버 작업 로직은 script 안에서 따로 유지보수할 수 있습니다.

## 6. 실패 차단 지점은 어디에 있는가

정답 기준에서 꼭 확인해야 할 질문은 이것입니다.

"어느 단계에서 실패하면 다음 단계로 넘어가면 안 되는가?"

이번 시퀀스에서는 아래가 기본입니다.

- build/test 실패 -> deploy 금지
- deploy 실패 -> verify 금지
- verify 실패 -> 배포 성공 판정 금지

즉, 자동화는 “끝까지 돈다”보다
"잘못된 상태를 다음 단계로 넘기지 않는다"가 더 중요합니다.

## 7. 강사가 빠르게 볼 체크 포인트

- `ci.yml`이 build/test를 자동으로 실행하는가
- `deploy.yml`이 build, deploy, verify job을 분리했는가
- `deploy.sh`가 workflow 밖으로 분리되어 있는가
- `check-deploy.sh`가 `docker compose ps`, `docker logs`, `curl`을 모두 포함하는가
- 실패한 단계가 다음 단계로 넘어가지 않게 설계되어 있는가
- Secrets가 코드에 직접 적혀 있지 않은가

## 8. 자주 나는 실수

- build만 하고 test를 비워두는 경우
- verify를 배포 뒤 선택사항으로 생각하는 경우
- workflow 안에 모든 서버 명령을 길게 적는 경우
- Secrets 참조 대신 값을 직접 적어버리는 경우

## 9. answer 기준 완성 형태

`10-answer`에서는 아래가 모두 보여야 합니다.

- build/test/deploy/verify 순서가 분리된 상태
- workflow와 script의 책임이 나뉜 상태
- verify가 배포 성공 판정의 일부로 들어간 상태

핵심은 자동화 파일을 많이 만드는 것이 아니라,
"무엇을 먼저 검증하고, 어디서 실패를 멈추고, 무엇으로 성공을 판정하는가"를 분명히 드러내는 것입니다.
