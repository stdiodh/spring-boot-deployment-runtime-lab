# 체크리스트

## 1. 기능 확인

- [ ] `./gradlew test bootJar`가 통과합니다.
- [ ] CI workflow에서 build/test 기준을 확인했습니다.
- [ ] deploy workflow에서 build, deploy, verify job 순서를 확인했습니다.
- [ ] `scripts/deploy.sh`가 서버 재배포 책임을 맡습니다.
- [ ] `scripts/check-deploy.sh`가 배포 후 상태 확인 책임을 맡습니다.

## 2. 코드 구조 확인

- [ ] workflow는 순서와 job 의존성을 담당합니다.
- [ ] script는 서버에서 실제 실행할 명령을 담당합니다.
- [ ] release bundle에 필요한 파일이 빠지지 않습니다.
- [ ] secret 값 자체는 workflow나 script에 직접 남지 않습니다.
- [ ] verify 단계가 deploy 단계와 분리되어 있습니다.

## 3. 실패 케이스 확인

- [ ] test 실패 시 deploy로 넘어가지 않는 구조입니다.
- [ ] deploy 실패 시 verify로 넘어가지 않는 구조입니다.
- [ ] artifact 누락이 생겼을 때 어느 job에서 실패할지 설명할 수 있습니다.
- [ ] HTTP 응답 확인 실패가 배포 성공 판정을 막는 이유를 설명할 수 있습니다.

## 4. 설명할 수 있어야 하는 것

- [ ] CI와 CD의 차이
- [ ] build, test, deploy, verify 순서
- [ ] workflow와 script를 분리하는 이유
- [ ] artifact가 필요한 이유
- [ ] verify 단계가 배포 성공 판정에 포함되어야 하는 이유

## 5. 남은 한계와 다음 시퀀스 연결

- [ ] 이번 시퀀스는 기본 CI/CD 흐름을 고정하는 단계이며 고급 배포 전략 전체를 다루지 않습니다.
- [ ] Blue-Green, Canary, Kubernetes, Terraform, 모니터링 도구 전체는 이번 범위 밖입니다.
- [ ] 다음 시퀀스에서는 자동화가 지켜주는 동작을 바탕으로 코드 구조를 리팩토링합니다.

<details>
<summary>멘토용 리뷰 기준</summary>

- 통과 기준: 멘티가 build/test/deploy/verify 흐름과 실패 차단 지점을 설명합니다.
- 보완 필요 기준: 배포 명령만 자동화하고 verify를 완료 기준에서 빼고 있습니다.
- 질문 예시: "deploy가 성공했지만 HTTP 응답 확인이 실패하면 이 workflow는 성공인가요?"
- 비교 포인트: 리뷰 단계에서는 job 의존성, artifact 전달, deploy script, verify script를 순서대로 봅니다.

</details>
