# 자동화와 운영 흐름 제공 자산

## 미리 제공하는 것

- 09 시퀀스에서 만든 배포 가능한 앱
- Dockerfile
- `application-prod.yaml`
- `deploy/compose.prod.yaml`
- workflow 기본 틀
- 배포 스크립트 기본 위치
- GitHub Secrets 이름 규칙

## 왜 미리 제공하는가

- 이번 시퀀스의 핵심은 “자동화 흐름 연결”이지 운영 인프라를 처음부터 다시 만드는 것이 아닙니다.
- 학생이 직접 구현해야 하는 부분을 build/test/deploy/verify 흐름에 집중시키기 위함입니다.
- 장황한 배포 세부값보다 순서와 역할이 먼저 보이게 하기 위함입니다.

## 학생이 직접 작성하지 않는 범위

- GitHub Actions 고급 기능 전체
- Blue-Green, Canary 같은 배포 전략
- Kubernetes, Helm, Terraform
- 모니터링 도구 전체
- 복잡한 서버 운영 정책 전체
