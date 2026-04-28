# spring-boot-deployment-runtime-lab

> Docker, EC2, GitHub Actions, Secrets를 이용한 배포와 실행 환경 실습 레포입니다.

이 브랜치는 실습 starter가 아니라 안내용 `main` 브랜치입니다.  
학생은 `09-implementation`에서 시작하고, 강사는 `09-answer`를 비교 기준으로 사용합니다.

## 이 레포가 다루는 시퀀스

- `09-deployment-and-runtime-environment`

## 이 레포에서 배우는 것

- Spring Boot jar를 Docker 실행 단위로 묶기
- `application-prod.yaml`로 운영 설정 분리하기
- GitHub Actions로 기본 배포 흐름 만들기
- GitHub Secrets로 EC2 pem key, 계정, 시크릿 분리하기
- 배포 후 로그로 기동 상태 확인하기

## 브랜치 안내

- `09-implementation`: 학생용 starter 브랜치
- `09-answer`: 완성 정답 브랜치
- `main`: 레포 소개와 브랜치 안내 브랜치

## 문서 안내

- [레포 가이드](./docs/repo-guide.md)
- [브랜치 가이드](./docs/branch-guide.md)
- [시퀀스 맵](./docs/sequence-map.md)

실습 문서는 각 시퀀스 브랜치에서 확인합니다.

- `09-implementation`
  - `README.md`
  - `docs/theory.md`
  - `docs/implementation.md`
  - `docs/answer-guide.md`
  - `docs/checklist.md`
  - `docs/assets.md`
- `09-answer`
  - 같은 문서 구조 + 완성 코드

## 시작 방법

1. 학생: `09-implementation`으로 이동
2. 문서 순서: `README` → `docs/theory.md` → `docs/implementation.md`
3. 구현 후 `09-answer`와 비교
