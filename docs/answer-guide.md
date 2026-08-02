# Deprecated Answer Guide

이 문서는 예전 링크 호환을 위해 남겨둔 안내 문서입니다.
`main` 가이드 브랜치는 두 answer 브랜치가 공유하는 runtime과 태그 배포 계약을 보여 줍니다.

이 토픽은 별도 implementation 브랜치를 사용하지 않습니다.

- `09-answer`: `deploy-v1.0.3`에 고정한 EC2 `:8080` HTTP Docker Compose 배포 기준
- `10-answer`: CI/CD에 Nginx, 도메인, Certbot, HTTPS 검증까지 포함한 완성 상태

`git diff 09-answer..10-answer`와 각 브랜치의 `README.md`, `docs/theory.md`, `docs/implementation.md`, `docs/checklist.md`를 기준으로 확인합니다.
이미 원격에 push한 09의 `deploy-v*` 또는 10의 `deploy-https-v*` 태그는 삭제·이동·재사용하지 않습니다.
