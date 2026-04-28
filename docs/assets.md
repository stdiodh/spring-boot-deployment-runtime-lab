# 배포와 실행 환경 제공 자산

## 미리 제공하는 것

- 기존 Spring Boot 애플리케이션 코드
- 로컬 개발용 `compose.yaml`
- `Dockerfile` 기본 구조
- `application-prod.yaml` 기본 구조
- `deploy/compose.prod.yaml` 기본 구조
- `.github/workflows/deploy.yml` 기본 구조
- `.env.example`
- EC2 기본 접속 가이드
- GitHub Secrets 목록

## 왜 미리 제공하는가

- 이번 시퀀스의 핵심은 “운영 환경으로 옮기는 흐름”이지, AWS 전체를 처음부터 세팅하는 것이 아닙니다.
- 학생이 직접 쳐야 하는 부분은 핵심 TODO에 집중하고, 주변 인프라 설명은 가볍게 제공합니다.
- 긴 보일러플레이트 대신 실행 흐름과 비밀값 분리에 집중하게 만들기 위함입니다.

## 학생이 직접 작성하지 않는 범위

- EC2 인스턴스 생성 전체 과정
- 보안 그룹과 네트워크 심화 설정
- 도메인, SSL, Nginx 설정
- Terraform, ECS, Kubernetes 같은 고급 인프라
- 운영 모니터링 도구 전체
- 완전한 CI/CD 전략 전체

## 이번 시퀀스에서 특히 미리 정리해둘 항목

- GitHub Secrets 이름 규칙
- EC2 사용자 계정 이름
- 배포 대상 디렉터리 경로
- 포트 충돌 시 확인 순서
- 로그 확인 명령 예시
