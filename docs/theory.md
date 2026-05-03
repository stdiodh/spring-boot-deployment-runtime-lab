# 자동화와 운영 흐름

build, test, deploy, verify를 왜 따로 보고 왜 자동으로 이어야 하는지 흐름으로 이해하는 문서입니다.

이번 시퀀스 한 줄 요약  
이번 실습은 수동으로 하던 배포 단계를 workflow와 스크립트로 고정해서, 사람이 바뀌어도 같은 순서로 실행되게 만드는 과정입니다.

## 먼저 이것만 기억해도 됩니다

- 자동화의 핵심은 속도보다 일관성입니다.
- CI는 보통 build와 test를 먼저 묶고, CD는 그 결과를 배포까지 이어줍니다.
- 배포 후 확인 단계도 자동화의 일부여야 합니다.

## 이 주제를 왜 배우는가

수동 배포는 처음 한두 번은 가능해도, 사람이 반복할수록 순서가 달라지고 작은 실수가 섞이기 쉽습니다.
어느 날은 테스트를 빼먹고, 어느 날은 로그 확인을 생략하고, 어느 날은 오래된 파일을 서버에 남겨둘 수도 있습니다.

그래서 이번 실습에서는 사람이 기억에 의존하던 순서를 workflow와 스크립트로 고정합니다.
이 흐름을 이해하면 다음에는 리팩토링이나 운영 개선을 할 때도
"무엇이 반복되고 무엇이 자주 흔들리는지"를 더 잘 볼 수 있습니다.

## 기초 개념 먼저 잡기

### CI

- 무엇인가요  
  코드를 합치기 전에 build와 test를 반복해서 확인하는 흐름입니다.
- 왜 필요한가요  
  배포 전에 이미 깨진 코드를 먼저 걸러낼 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `.github/workflows/ci.yml`

### CD

- 무엇인가요  
  검증된 결과를 실제 실행 환경으로 전달하는 흐름입니다.
- 왜 필요한가요  
  사람 손으로 배포 순서를 매번 반복하지 않아도 되기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `.github/workflows/deploy.yml`, `scripts/deploy.sh`

### workflow

- 무엇인가요  
  언제 어떤 순서로 작업을 실행할지 정의한 자동화 파일입니다.
- 왜 필요한가요  
  사람이 기억하던 순서를 파일로 고정할 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `ci.yml`, `deploy.yml`

### script

- 무엇인가요  
  서버에서 실제로 어떤 명령을 수행할지 담은 실행 파일입니다.
- 왜 필요한가요  
  workflow 파일이 너무 길어지지 않고, 실제 작업 로직을 따로 관리할 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `scripts/deploy.sh`, `scripts/check-deploy.sh`

### artifact

- 무엇인가요  
  build 결과물과 배포에 필요한 파일 묶음입니다.
- 왜 필요한가요  
  검증된 결과만 다음 단계로 안전하게 넘길 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `deploy.yml`의 release bundle과 upload/download 흐름

### verify

- 무엇인가요  
  배포 직후 실제로 살아났는지 확인하는 단계입니다.
- 왜 필요한가요  
  “배포 명령이 끝났다”와 “앱이 정상이다”는 다른 이야기이기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `scripts/check-deploy.sh`

## 이번 실습 흐름을 먼저 한눈에 보기

1. GitHub Actions `CI`가 코드 변경을 감지합니다.
2. build와 test가 먼저 실행됩니다.
3. `deploy` job이 release bundle을 EC2로 전달합니다.
4. 원격 `deploy.sh`가 컨테이너를 다시 띄웁니다.
5. `check-deploy.sh`가 컨테이너 상태, 로그, HTTP 응답을 확인합니다.

짧게 말하면 이번 실습은  
변경 감지 -> build -> test -> deploy -> verify 흐름을 익히는 과정입니다.

## 현재 코드 흐름에서 어디를 보면 되는가

이번 시퀀스는 배포를 사람이 아니라 파일과 자동화 흐름이 대신 반복하게 만드는 단계입니다.

1. `.github/workflows/ci.yml`
   build와 test를 먼저 거는 시작점
2. `.github/workflows/deploy.yml`
   artifact, 원격 전달, verify 흐름이 이어지는 파일
3. `scripts/deploy.sh`
   서버에서 실제 재배포 순서를 담당하는 스크립트
4. `scripts/check-deploy.sh`
   배포 직후 상태를 확인하는 스크립트

## 오늘 꼭 잡아야 할 질문

- 왜 deploy 전에 build와 test가 먼저 와야 하나요?
- CI와 CD를 아주 단순하게 어떻게 구분할 수 있나요?
- workflow와 shell script를 나누는 이유는 무엇인가요?
- verify 단계가 없으면 어떤 문제가 생길 수 있나요?

## 중요한 코드 먼저 보기

### 1. CI 흐름의 시작

```yaml
jobs:
  build_and_test:
    runs-on: ubuntu-latest
    steps:
      - run: ./gradlew test bootJar
```

- 이 설정은 코드 변경이 들어왔을 때 가장 먼저 build/test를 확인하게 만듭니다.
- 학생이 기억해야 할 핵심은 "배포 전에 검증이 먼저 온다"입니다.
- 파일: `.github/workflows/ci.yml`

### 2. 배포 명령을 스크립트로 분리한 코드

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml down || true
docker build -t "${APP_IMAGE}" .
docker compose --env-file .env -f deploy/compose.prod.yaml up -d
```

- 이 코드는 EC2에서 실제 배포를 맡는 핵심 순서를 보여줍니다.
- 학생이 기억해야 할 핵심은 "workflow는 흐름을 묶고, 스크립트는 실제 작업을 담당한다"는 점입니다.
- 파일: `scripts/deploy.sh`

### 3. 배포 후 확인 코드

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
```

- 자동화는 배포만 하고 끝나지 않습니다.
- 학생이 기억해야 할 핵심은 "verify가 있어야 자동화가 한 단계 더 완성된다"입니다.
- 파일: `scripts/check-deploy.sh`

## 핵심 개념 설명

### 1. 자동화는 순서를 고정하는 일입니다

이번 실습에서 중요한 것은 화려한 기능이 아니라,
사람이 하던 순서를 workflow가 대신 반복하게 만드는 것입니다.
그래서 build, test, deploy, verify 순서를 분명히 보여주는 것이 중요합니다.

### 2. workflow와 script는 역할이 다릅니다

workflow는 언제, 어떤 순서로 실행할지를 담당합니다.
script는 서버에서 실제로 무엇을 할지를 담당합니다.

이 둘을 나누면 문서도 읽기 쉬워지고,
나중에 서버 동작만 수정할 때도 workflow 전체를 다시 뜯어보지 않아도 됩니다.

### 3. verify가 있어야 운영 감각이 붙습니다

많은 입문자가 배포 명령이 끝나면 성공이라고 생각합니다.
하지만 운영에서는 마지막 확인이 빠지면 실패를 늦게 발견하게 됩니다.

그래서 이번 실습은 `docker compose ps`, `docker logs`, HTTP 응답 확인까지 자동화 흐름에 넣습니다.

## 실무에서 한 번 더 보기

이번 시퀀스의 실무 확장 개념은 배포 검증 단계와 실패 차단 지점입니다.

### 문제 상황 1. test 없이 바로 deploy한다

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: ./gradlew bootJar
      - run: bash scripts/deploy.sh
```

이 흐름은 빨라 보일 수 있지만 아래 문제가 있습니다.

- 테스트가 깨져도 배포로 넘어갈 수 있습니다.
- 깨진 코드를 운영 서버에서 처음 발견할 수 있습니다.

### 해결 코드 예시 1. build와 test를 먼저 고정한다

```yaml
jobs:
  build_and_test:
    runs-on: ubuntu-latest
    steps:
      - run: ./gradlew test bootJar
```

이 흐름이면 최소한 실행 가능하고 테스트를 통과한 결과물만 다음 단계로 넘어갑니다.

### 문제 상황 2. workflow 안에 모든 명령을 길게 적는다

```yaml
- name: Deploy
  run: |
    docker compose down || true
    docker build -t app:latest .
    docker compose up -d
    docker logs --tail 50 app
    curl --fail http://localhost:8080/
```

이 방식은 처음에는 한 파일에 다 보여서 편해 보일 수 있습니다.
하지만 실제로는 아래 문제가 생깁니다.

- 원격 서버에서 무슨 작업을 하는지 읽기 어려워집니다.
- 배포 로직만 수정하고 싶어도 workflow 전체를 건드려야 합니다.
- verify와 deploy의 책임이 섞입니다.

### 해결 코드 예시 2. workflow와 script의 책임을 나눈다

```yaml
- name: Deploy on EC2
  run: |
    ssh ... "bash scripts/deploy.sh"

- name: Verify deployment on EC2
  run: |
    ssh ... "bash scripts/check-deploy.sh"
```

이 구조면 workflow는 순서를 묶고,
script는 서버에서 실제 작업을 담당합니다.

### 문제 상황 3. deploy가 끝났다고 바로 성공이라고 본다

`docker compose up -d`가 끝났다고 해서
애플리케이션이 실제로 정상 동작하는 것은 아닙니다.

실제로는 아래가 그 직후에 터질 수 있습니다.

- 컨테이너는 떴지만 앱은 죽음
- DB 연결 실패
- 포트 충돌
- 루트 경로 응답 실패

### 해결 코드 예시 3. verify를 별도 단계로 둔다

```bash
docker compose --env-file .env -f deploy/compose.prod.yaml ps
docker logs --tail 50 aandi-app
curl --fail --silent http://localhost:8080/ >/dev/null
```

이번 시퀀스에서는 verify를 “있으면 좋은 옵션”이 아니라
"배포 성공 판정의 마지막 단계"로 다뤄야 합니다.

## 이번 실습에서 꼭 보면 좋은 포인트

- `ci.yml`이 어떤 브랜치에서 돌아가는지
- `deploy.yml`이 artifact와 remote script를 어떻게 연결하는지
- `deploy.sh`가 어떤 순서로 컨테이너를 다시 띄우는지
- `check-deploy.sh`가 왜 세 가지 확인을 같이 하는지

## 자주 헷갈리는 포인트

- CI와 CD를 완전히 다른 도구로 생각할 필요는 없습니다. 이번 실습에서는 둘 다 GitHub Actions 안에서 보여줘도 충분합니다.
- build가 끝났다고 배포 가능한 것은 아닙니다. test와 verify까지 이어져야 흐름이 완성됩니다.
- workflow에 모든 명령을 다 적기보다, 실제 서버 작업은 script로 빼는 편이 더 읽기 쉽습니다.
- verify는 선택사항이 아니라 자동화 품질을 높이는 핵심 단계입니다.

## 직접 말해보기

- 수동 배포보다 자동 배포가 더 좋은 이유는 무엇인가요?
- CI와 CD를 아주 간단하게 나누면 어떻게 설명할 수 있나요?
- 왜 deploy 명령을 script로 분리했나요?
- 배포 후 `curl` 확인까지 넣는 이유는 무엇인가요?

## 복습 체크리스트

- [ ] build, test, deploy, verify 순서를 말할 수 있습니다.
- [ ] CI와 CD를 이번 코드 기준으로 설명할 수 있습니다.
- [ ] workflow와 shell script의 역할 차이를 설명할 수 있습니다.
- [ ] verify 단계가 왜 필요한지 말할 수 있습니다.
- [ ] 실패 차단 지점을 왜 넣어야 하는지 설명할 수 있습니다.

## 오늘 실습에서 꼭 기억할 것

- 자동화는 속도를 자랑하는 것이 아니라 반복 실수를 줄이는 장치입니다.
- build/test가 먼저 와야 deploy가 더 믿을 수 있습니다.
- deploy 뒤 verify까지 있어야 운영 자동화 흐름이 더 완성됩니다.

## 다음 실습과 연결하기

이번 시퀀스에서는 반복 가능한 자동화 흐름을 만들었습니다.
다음에는 이 흐름을 바탕으로 구조를 더 다듬고,
리팩토링과 기초 보강 관점에서 다시 돌아보는 작업으로 연결할 수 있습니다.
