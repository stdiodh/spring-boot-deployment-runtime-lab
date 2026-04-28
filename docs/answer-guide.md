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
