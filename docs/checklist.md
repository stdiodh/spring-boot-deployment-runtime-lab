# 배포와 실행 환경 체크리스트

## 학생 체크리스트

- [ ] `Dockerfile`이 jar를 복사하고 실행하도록 완성했습니다.
- [ ] `application-prod.yaml`에서 운영값을 환경변수로 분리했습니다.
- [ ] `deploy/compose.prod.yaml`에서 앱, MySQL, Redis 연결을 확인했습니다.
- [ ] `deploy.yml`에서 SSH 키와 운영 비밀값을 GitHub Secrets로 받게 만들었습니다.
- [ ] 배포 후 `docker compose ps` 또는 `docker logs`로 기동 상태를 확인했습니다.

## 강사 / PPT 체크리스트

- [ ] 로컬 실행과 운영 실행의 차이를 그림으로 설명할 수 있습니다.
- [ ] jar → Dockerfile → EC2 → 로그 확인 흐름을 한 화면에서 보여줄 수 있습니다.
- [ ] GitHub Secrets에 pem 키와 계정 정보를 왜 넣어야 하는지 설명할 수 있습니다.
- [ ] `application.yaml`과 `application-prod.yaml` 차이를 시연할 수 있습니다.
- [ ] 배포 성공 여부를 “로그 확인”으로 판단하는 장면을 포함했습니다.
