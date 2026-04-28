# 자동화와 운영 흐름 구현 가이드

## 이 도메인이 필요한 이유

09에서는 배포를 한 번 성공시키는 경험이 중요했습니다.  
10에서는 그 배포를 같은 순서로 반복하게 만드는 자동화가 핵심입니다.

## 학생이 완성할 최종 흐름

1. `ci.yml`이 build와 test를 자동으로 실행합니다.
2. `deploy.yml`이 artifact와 배포 단계를 연결합니다.
3. `deploy.sh`가 EC2에서 새 버전을 다시 띄웁니다.
4. `check-deploy.sh`가 배포 직후 상태를 자동으로 확인합니다.

## 학생이 직접 구현할 순서

1. workflow 파일 구조를 읽습니다.
2. build step을 채웁니다.
3. test step을 채웁니다.
4. deploy step을 연결합니다.
5. verify 단계까지 점검합니다.

## TODO를 넣을 파일

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/deploy.sh`
- `scripts/check-deploy.sh`

## 각 파일의 역할

- `ci.yml`: PR이나 push에서 build/test를 자동으로 확인하는 파일
- `deploy.yml`: artifact 업로드, EC2 전달, 원격 배포, verify를 묶는 파일
- `deploy.sh`: 서버에서 실제 배포 순서를 실행하는 스크립트
- `check-deploy.sh`: 배포 직후 컨테이너 상태와 앱 응답을 확인하는 스크립트

## 미리 제공할 것

- 09 시퀀스에서 만든 배포 가능한 앱
- Dockerfile, prod profile, compose 파일
- GitHub Secrets 이름 규칙
- 기본 workflow 파일 틀
- 배포 대상 경로와 앱 이미지 이름

## 단계별 구현 안내

### 1. workflow 구조를 먼저 읽습니다

- 어떤 이벤트에서 시작되는지 봅니다.
- build/test와 deploy/verify가 같은 파일인지, 나뉘었는지 봅니다.
- 이번 실습에서는 복잡한 기능보다 순서가 눈에 잘 보이는지가 더 중요합니다.

### 2. build step을 채웁니다

- `./gradlew bootJar`까지 연결합니다.
- release bundle에 어떤 파일이 들어가야 하는지 확인합니다.
- 배포 전에 실행 가능한 산출물이 준비되어야 합니다.
- starter에서는 일부 step이 `echo TODO...` 상태라서, 어떤 파일을 release bundle에 넣을지 학생이 직접 채워야 합니다.

### 3. test step을 채웁니다

- `./gradlew test`를 넣습니다.
- build만 되고 테스트가 빠진 자동화는 신뢰하기 어렵다는 점을 같이 기억합니다.

### 4. deploy step을 연결합니다

- SSH key는 GitHub Secrets에서 복원합니다.
- artifact를 EC2로 올립니다.
- 서버에서는 workflow 안에 긴 명령을 직접 적기보다 `deploy.sh`로 분리합니다.
- starter에서는 workflow와 script 둘 다 핵심 명령이 비워져 있으므로, 두 파일을 함께 보면서 연결해야 합니다.

### 5. verify 단계를 넣습니다

- `docker compose ps`
- `docker logs`
- `curl` 같은 HTTP 응답 확인

이 세 가지를 통해 “명령은 끝났지만 앱은 죽어 있는” 상황을 더 빨리 찾을 수 있습니다.

## 실행 확인 방법

### 로컬

```bash
./gradlew test bootJar
bash scripts/check-deploy.sh
```

### GitHub Actions

1. `CI` workflow가 build/test를 통과하는지 확인합니다.
2. `Deploy to EC2` workflow가 artifact, deploy, verify를 끝내는지 확인합니다.

## 학생 체크 질문

- build와 test 중 어떤 것이 먼저 와야 할까요?
- deploy를 workflow 안에 다 적지 않고 script로 뺀 이유는 무엇인가요?
- verify가 없다면 어떤 문제를 늦게 발견할 수 있나요?
- CI와 CD를 이번 실습 기준으로 어떻게 설명할 수 있나요?

## 강사 / PPT 체크 질문

- build → test → deploy → verify 흐름 그림이 있는가
- 수동 배포와 자동 배포 차이를 예시로 설명할 수 있는가
- workflow와 script 역할 차이를 시연할 수 있는가
- verify 단계가 포함된 자동화와 빠진 자동화의 차이를 설명할 수 있는가

## 다음 도메인 연결 포인트

이번 시퀀스는 자동화 흐름의 가장 기본 뼈대를 잡는 단계입니다.  
다음에는 이 흐름을 바탕으로 구조를 다시 정리하고, 어떤 부분을 리팩토링해야 하는지 보는 단계로 이어질 수 있습니다.
