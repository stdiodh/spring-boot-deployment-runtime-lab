# 자동화와 운영 흐름

> GitHub Actions와 배포 스크립트를 이용해 build, test, deploy, verify를 반복 가능하게 묶어보는 실습입니다.

> 이번 시퀀스 한 줄 요약  
> 이번 실습은 한 번 성공시킨 배포를 사람 손이 아니라 workflow와 스크립트가 같은 순서로 다시 실행하게 만드는 과정입니다.

## 이 레포에서 다루는 것

- CI와 CD의 가장 기본적인 구분
- GitHub Actions에서 build, test, deploy, verify 단계 나누기
- 배포 명령을 workflow 밖의 스크립트로 분리하기
- GitHub Secrets를 계속 안전하게 유지하기
- 배포 후 확인 단계까지 자동화에 포함하기

## 문서

- [이론 문서](./docs/theory.md)
- [구현 문서](./docs/implementation.md)
- [정답 가이드](./docs/answer-guide.md)
- [체크리스트](./docs/checklist.md)
- [제공 자산 정리](./docs/assets.md)

## 학생이 직접 구현하는 핵심 파일

- [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
- [`scripts/deploy.sh`](./scripts/deploy.sh)
- [`scripts/check-deploy.sh`](./scripts/check-deploy.sh)

이 브랜치는 `10-implementation` starter입니다.  
핵심 파일에는 TODO가 들어 있고, 정답 비교는 `10-answer` 브랜치에서 합니다.

## 자동화 흐름 요약

1. 코드가 변경되면 workflow가 시작됩니다.
2. workflow가 `build`와 `test`를 실행합니다.
3. 빌드 산출물과 배포 파일을 묶어 서버로 전달합니다.
4. 서버에서 배포 스크립트가 새 버전을 다시 띄웁니다.
5. 마지막에 확인 스크립트가 컨테이너 상태와 HTTP 응답을 점검합니다.

## 로컬 확인

```bash
./gradlew test bootJar
bash scripts/check-deploy.sh
```

## 운영 확인

1. GitHub Actions `CI`가 build/test를 통과하는지 봅니다.
2. `Deploy to EC2`가 artifact 업로드와 원격 배포를 끝내는지 봅니다.
3. verify 단계에서 `docker compose ps`, `docker logs`, HTTP 응답 확인까지 통과하는지 봅니다.
