# 10 CI/CD Deployment

## 이 시퀀스에서 다루는 문제

이전 시퀀스에서는 애플리케이션을 Docker 실행 단위로 묶었습니다. 이번 시퀀스는 그 배포 흐름을 사람이 손으로 반복하지 않도록 build, test, deploy, verify 단계로 고정하는 작업을 다룹니다.

이번 범위는 GitHub Actions workflow와 shell script의 책임 분리입니다. 고급 배포 전략, 복잡한 브랜치 전략, 모니터링 도구 전체, Kubernetes/Terraform은 포함하지 않습니다.

## 학습 목표

- CI와 CD를 이번 코드 기준으로 구분합니다.
- build, test, deploy, verify 단계가 어떤 순서로 이어져야 하는지 설명합니다.
- workflow와 shell script의 책임을 분리합니다.
- 배포 성공 판정에 verify 단계가 필요한 이유를 설명합니다.

## 멘티 시작 흐름

실습은 이 starter 브랜치에서 진행합니다.

```bash
git clone -b 10-implementation https://github.com/stdiodh/spring-boot-deployment-runtime-lab.git
cd spring-boot-deployment-runtime-lab
git checkout -b feat/<이름>
```

먼저 `docs/theory.md`에서 자동화가 필요한 이유를 읽고, `docs/implementation.md`의 순서대로 workflow와 script TODO를 채웁니다.

## 읽는 순서

1. [이론 정리](./docs/theory.md)
2. [구현 가이드](./docs/implementation.md)
3. [체크리스트](./docs/checklist.md)

핵심 파일은 아래 순서로 확인합니다.

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/deploy.sh`
- `scripts/check-deploy.sh`

## 실행 / 테스트 방법

로컬 검증은 아래 명령으로 시작합니다.

```bash
./gradlew test bootJar
```

배포 검증 script는 운영 환경의 `.env`, Docker, 실행 중인 컨테이너 상태에 의존합니다. 로컬에서 실행할 때는 필요한 환경이 준비되어 있는지 먼저 확인합니다.

```bash
bash scripts/check-deploy.sh
```

## 완료 기준

- build와 test가 deploy보다 먼저 실행됩니다.
- workflow 실패 시 다음 단계로 넘어가지 않습니다.
- deploy script와 verify script의 역할이 분리되어 있습니다.
- verify 단계가 컨테이너 상태, 로그, HTTP 응답 확인을 포함합니다.
- `./gradlew test bootJar`가 통과합니다.

<details>
<summary>멘토용 진행 포인트</summary>

## 수업 전 확인

- GitHub Actions와 EC2 검증은 외부 환경이 필요하므로 로컬 검증 범위와 운영 검증 범위를 분리합니다.
- secret 값 자체를 workflow나 문서에 쓰지 않고 이름과 주입 위치만 다룹니다.
- 09 시퀀스의 Dockerfile, prod profile, compose 흐름이 배경 지식으로 준비되어 있는지 확인합니다.

## 수업 중 질문

- build/test가 실패했는데 deploy로 넘어가면 어떤 문제가 생기나요?
- workflow와 script를 나누면 어떤 변경을 더 작게 처리할 수 있나요?
- verify가 없으면 배포 성공을 어떤 기준으로 오해할 수 있나요?

## 리뷰 기준

- 멘티가 자동화를 속도보다 순서 고정과 실패 차단 관점에서 설명하는지 확인합니다.
- deploy와 verify의 책임이 script로 분리되어 있는지 봅니다.
- 막힌 경우 완성 내용을 보여주기보다 job 의존성, artifact 전달, script 실행 위치, verify 기준 순서로 질문합니다.

</details>
