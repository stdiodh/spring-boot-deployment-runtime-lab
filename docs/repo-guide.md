# 레포 가이드

## 이 레포의 역할

이 레포는 A&I 백엔드 커리큘럼의 `09. 배포와 실행 환경` 시퀀스를 담당합니다.

핵심 메시지는 아래입니다.

- 로컬에서 돌아가는 앱을 하나의 배포 단위로 묶는다
- 운영 환경 설정은 코드 밖으로 분리한다
- GitHub Actions와 Secrets로 EC2 배포를 자동화한다
- 배포 직후에는 로그로 상태를 확인한다

## 이 레포에서 직접 다루는 범위

- Dockerfile
- prod profile
- Docker Compose 운영 실행
- GitHub Actions 기본 배포 흐름
- EC2 접속용 시크릿 분리

## 이 레포에서 깊게 다루지 않는 범위

- Kubernetes
- ECS
- Terraform
- Nginx, SSL, 도메인
- 고급 운영 자동화 전체

이 부분은 다음 시퀀스나 별도 트랙에서 다루는 것이 더 적절합니다.
