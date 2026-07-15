window.visualLabData = {
  "kind": "sequence",
  "sequence": "09",
  "title": "Docker/Runtime",
  "subtitle": "Deployment and runtime environment",
  "goal": "bootJar, Dockerfile, image, container, prod profile, 환경변수, runtime log 흐름을 하나의 실행 단위로 이해합니다.",
  "problem": "로컬에서 `bootRun`으로만 실행한 애플리케이션은 운영 서버에서 같은 조건으로 재현되기 어렵습니다.",
  "workbench": {
    "kind": "runtime",
    "title": "Runtime Boundary",
    "instruction": "실행 조건을 바꿔 jar, image, container, 설정, 로그 중 어디까지 도달하는지 확인하세요.",
    "scenarios": [
      {
        "id": "runtime-ready",
        "label": "컨테이너 실행 확인",
        "flowId": "jar-to-container",
        "tone": "recovered",
        "prompt": "테스트를 통과한 jar를 image로 묶고 컨테이너 상태와 로그까지 확인합니다.",
        "route": [
          "Source code",
          "./gradlew test bootJar",
          "build/libs/*.jar",
          "Dockerfile",
          "Docker image",
          "Container",
          "docker compose ps · logs"
        ],
        "snapshot": [
          {
            "label": "실행 상태",
            "value": "컨테이너와 로그 확인 완료",
            "tone": "recovered"
          },
          {
            "label": "검증 증거",
            "value": "docker compose ps · application logs",
            "tone": "signal"
          }
        ],
        "evidence": "bootJar 산출물 경로와 Dockerfile의 COPY 경로가 일치하고, 컨테이너 상태와 애플리케이션 로그가 확인됩니다.",
        "outcome": "빌드 산출물과 runtime 증거가 모두 연결되어야 실행 성공으로 판단합니다."
      },
      {
        "id": "runtime-test-failed",
        "label": "테스트에서 차단",
        "flowId": "jar-to-container",
        "tone": "blocked",
        "prompt": "배포 전 테스트가 실패한 상태에서 다음 실행 단위로 넘어갈 수 있는지 판단합니다.",
        "route": [
          "Source code",
          "./gradlew test",
          "bootJar",
          "Docker build",
          "Container"
        ],
        "snapshot": [
          {
            "label": "첫 실패",
            "value": "테스트 실패 · jar 생성 전 차단",
            "tone": "blocked"
          },
          {
            "label": "다음 단계",
            "value": "bootJar · Docker build 실행하지 않음",
            "tone": "blocked"
          }
        ],
        "evidence": "배포 전 기본 동작을 확인하는 `./gradlew test`가 통과하지 않았습니다.",
        "outcome": "jar와 image 문제로 확대하지 않고 처음 실패한 테스트를 먼저 해결합니다.",
        "stopAfter": 1
      },
      {
        "id": "runtime-copy-mismatch",
        "label": "jar 경로 불일치",
        "flowId": "jar-to-container",
        "tone": "blocked",
        "prompt": "bootJar 결과와 Dockerfile의 COPY 경로가 다를 때 build 경계를 추적합니다.",
        "route": [
          "./gradlew bootJar",
          "build/libs/*.jar",
          "Dockerfile COPY",
          "Docker image",
          "Container"
        ],
        "snapshot": [
          {
            "label": "Docker build",
            "value": "jar COPY 경로 불일치",
            "tone": "blocked"
          },
          {
            "label": "Image 상태",
            "value": "생성되지 않음",
            "tone": "blocked"
          }
        ],
        "evidence": "문서의 실패 확인 순서는 jar 산출물 경로와 Dockerfile의 `COPY` 경로를 먼저 비교하도록 안내합니다.",
        "outcome": "image가 만들어지지 않았으므로 container 실행 문제로 해석하지 않습니다.",
        "stopAfter": 2
      },
      {
        "id": "runtime-env-missing",
        "label": "운영 환경변수 누락",
        "flowId": "runtime-config",
        "tone": "blocked",
        "prompt": "prod profile이 요구하는 환경변수가 빠졌을 때 실행과 health 증거를 구분합니다.",
        "route": [
          "Compose runtime",
          "Environment variables",
          "application-prod.yaml",
          "Spring Boot App",
          "Runtime log",
          "Health evidence"
        ],
        "snapshot": [
          {
            "label": "Runtime config",
            "value": "필수 환경변수 누락",
            "tone": "blocked"
          },
          {
            "label": "Health evidence",
            "value": "확인되지 않음",
            "tone": "blocked"
          }
        ],
        "evidence": "application-prod.yaml은 DB, Redis, JWT, mail, OAuth2 값을 실행 환경에서 주입받습니다.",
        "outcome": "컨테이너 명령이 끝났더라도 로그와 health 증거가 없으면 정상 실행으로 판정하지 않습니다.",
        "stopAfter": 4
      }
    ]
  },
  "repo": {
    "name": "spring-boot-deployment-runtime-lab",
    "path": "spring-boot-deployment-runtime-lab"
  },
  "defaultSequence": "09",
  "actors": [
    {
      "id": "developer",
      "label": "개발자",
      "kind": "person"
    },
    {
      "id": "gradle",
      "label": "Gradle bootJar",
      "kind": "ci"
    },
    {
      "id": "docker",
      "label": "Docker Image",
      "kind": "infra"
    },
    {
      "id": "container",
      "label": "Container Runtime",
      "kind": "infra"
    },
    {
      "id": "app",
      "label": "Spring Boot App",
      "kind": "server"
    }
  ],
  "flows": [
    {
      "id": "jar-to-container",
      "title": "jar에서 컨테이너 실행까지",
      "summary": "Spring Boot source가 bootJar 결과물이 되고 Dockerfile을 통해 image와 container 실행으로 이어집니다.",
      "mermaid": "sequenceDiagram\n  actor Developer\n  participant Gradle as Gradle bootJar\n  participant Dockerfile as Dockerfile\n  participant Image as Docker Image\n  participant Container as Container Runtime\n  Developer->>Gradle: test bootJar\n  Gradle-->>Dockerfile: application jar\n  Dockerfile->>Image: build image\n  Image->>Container: run container\n  Container-->>Developer: status and logs",
      "steps": [
        {
          "order": 1,
          "actor": "Developer",
          "input": "Source code",
          "owner": "Gradle bootJar",
          "action": "테스트와 jar 생성을 실행합니다.",
          "output": "Application jar",
          "note": "운영 실행 단위는 source가 아니라 빌드 산출물에서 시작합니다.",
          "id": "jar-to-container-step-1",
          "from": "Developer",
          "to": "Gradle bootJar",
          "message": "테스트와 jar 생성을 실행합니다.",
          "messageKind": "request",
          "problem": "Source code",
          "concept": "Gradle bootJar",
          "check": "Application jar",
          "codePointIds": [
            "dockerfile-jar",
            "prod-env"
          ]
        },
        {
          "order": 2,
          "actor": "Gradle",
          "input": "Application jar",
          "owner": "Dockerfile",
          "action": "jar를 컨테이너 이미지 안으로 복사하고 Java 실행 명령을 고정합니다.",
          "output": "Docker image layer",
          "note": "실행 환경을 파일로 설명할 수 있게 됩니다.",
          "id": "jar-to-container-step-2",
          "from": "Gradle",
          "to": "Dockerfile",
          "message": "jar를 컨테이너 이미지 안으로 복사하고 Java 실행 명령을 고정합니다.",
          "messageKind": "request",
          "problem": "Application jar",
          "concept": "Dockerfile",
          "check": "Docker image layer",
          "codePointIds": [
            "prod-env",
            "dockerfile-jar"
          ]
        },
        {
          "order": 3,
          "actor": "Docker",
          "input": "Dockerfile",
          "owner": "Docker Image",
          "action": "재사용 가능한 image를 빌드합니다.",
          "output": "Image tag",
          "note": "image는 실행 준비가 끝난 패키지 단위입니다.",
          "id": "jar-to-container-step-3",
          "from": "Docker",
          "to": "Docker Image",
          "message": "재사용 가능한 image를 빌드합니다.",
          "messageKind": "request",
          "problem": "Dockerfile",
          "concept": "Docker Image",
          "check": "Image tag",
          "codePointIds": [
            "dockerfile-jar",
            "prod-env"
          ]
        },
        {
          "order": 4,
          "actor": "Runtime",
          "input": "Image tag",
          "owner": "Container",
          "action": "컨테이너를 실행하고 상태를 확인합니다.",
          "output": "Running process",
          "note": "build 성공과 runtime 성공은 분리해서 봐야 합니다.",
          "id": "jar-to-container-step-4",
          "from": "Runtime",
          "to": "Container",
          "message": "컨테이너를 실행하고 상태를 확인합니다.",
          "messageKind": "response",
          "problem": "Image tag",
          "concept": "Container",
          "check": "Running process",
          "codePointIds": [
            "prod-env",
            "dockerfile-jar"
          ]
        }
      ],
      "bandKind": "scenario"
    },
    {
      "id": "runtime-config",
      "title": "운영 설정 주입 흐름",
      "summary": "prod profile과 환경변수는 컨테이너 실행 시점에 애플리케이션 설정으로 전달됩니다.",
      "steps": [
        {
          "order": 1,
          "actor": "Operator",
          "input": "Environment variables",
          "owner": "Compose runtime",
          "action": "컨테이너 실행 시 필요한 값을 주입합니다.",
          "output": "Runtime env",
          "note": "민감한 값은 코드에 고정하지 않습니다.",
          "id": "runtime-config-step-1",
          "from": "Operator",
          "to": "Compose runtime",
          "message": "컨테이너 실행 시 필요한 값을 주입합니다.",
          "messageKind": "request",
          "problem": "Environment variables",
          "concept": "Compose runtime",
          "check": "Runtime env",
          "codePointIds": [
            "dockerfile-jar",
            "prod-env"
          ]
        },
        {
          "order": 2,
          "actor": "Compose runtime",
          "input": "Runtime env",
          "owner": "Spring profile",
          "action": "prod profile 설정과 환경변수를 연결합니다.",
          "output": "Application config",
          "note": "로컬 설정과 운영 설정을 분리해서 읽습니다.",
          "id": "runtime-config-step-2",
          "from": "Compose runtime",
          "to": "Spring profile",
          "message": "prod profile 설정과 환경변수를 연결합니다.",
          "messageKind": "request",
          "problem": "Runtime env",
          "concept": "Spring profile",
          "check": "Application config",
          "codePointIds": [
            "prod-env",
            "dockerfile-jar"
          ]
        },
        {
          "order": 3,
          "actor": "Application",
          "input": "Application config",
          "owner": "Runtime log",
          "action": "실행 결과와 오류를 로그로 확인합니다.",
          "output": "Health evidence",
          "note": "배포 명령 성공만으로 서비스가 살아 있다고 판단하지 않습니다.",
          "id": "runtime-config-step-3",
          "from": "Application",
          "to": "Runtime log",
          "message": "실행 결과와 오류를 로그로 확인합니다.",
          "messageKind": "response",
          "problem": "Application config",
          "concept": "Runtime log",
          "check": "Health evidence",
          "codePointIds": [
            "dockerfile-jar",
            "prod-env"
          ]
        },
        {
          "id": "runtime-config-check-4",
          "order": 4,
          "actor": "Runtime log",
          "owner": "확인 지점",
          "from": "Runtime log",
          "to": "확인 지점",
          "message": "결과와 실패 지점을 확인합니다.",
          "messageKind": "response",
          "problem": "구현 후 실제로 어느 지점이 통과했는지 확인해야 합니다.",
          "concept": "Verification",
          "action": "문서의 확인 명령이나 화면에서 결과를 검증합니다.",
          "check": "성공 흐름과 실패 흐름을 말로 설명합니다.",
          "note": "Visual Lab은 코드를 대신 완성하지 않고 확인 지점을 고정합니다.",
          "codePointIds": [
            "prod-env"
          ]
        }
      ],
      "bandKind": "scenario"
    }
  ],
  "flow": [
    {
      "id": "jar-to-container-step-1",
      "label": "Gradle bootJar",
      "problem": "Source code",
      "concept": "Gradle bootJar",
      "action": "테스트와 jar 생성을 실행합니다.",
      "check": "Application jar",
      "codePointIds": [
        "dockerfile-jar",
        "prod-env"
      ]
    },
    {
      "id": "jar-to-container-step-2",
      "label": "Dockerfile",
      "problem": "Application jar",
      "concept": "Dockerfile",
      "action": "jar를 컨테이너 이미지 안으로 복사하고 Java 실행 명령을 고정합니다.",
      "check": "Docker image layer",
      "codePointIds": [
        "prod-env",
        "dockerfile-jar"
      ]
    },
    {
      "id": "jar-to-container-step-3",
      "label": "Docker Image",
      "problem": "Dockerfile",
      "concept": "Docker Image",
      "action": "재사용 가능한 image를 빌드합니다.",
      "check": "Image tag",
      "codePointIds": [
        "dockerfile-jar",
        "prod-env"
      ]
    },
    {
      "id": "jar-to-container-step-4",
      "label": "Container",
      "problem": "Image tag",
      "concept": "Container",
      "action": "컨테이너를 실행하고 상태를 확인합니다.",
      "check": "Running process",
      "codePointIds": [
        "prod-env",
        "dockerfile-jar"
      ]
    }
  ],
  "codePoints": [
    {
      "id": "dockerfile-jar",
      "title": "Dockerfile은 jar를 컨테이너 실행 단위로 묶습니다",
      "file": "Dockerfile",
      "language": "dockerfile",
      "snippet": "FROM eclipse-temurin:21-jre\n\nWORKDIR /app\n\nARG JAR_FILE=build/libs/*.jar\nCOPY ${JAR_FILE} app.jar\n\nEXPOSE 8080\n\nENTRYPOINT [\"java\", \"-jar\", \"/app/app.jar\"]",
      "explanation": "로컬 jar 파일을 컨테이너 안의 실행 가능한 app.jar로 복사합니다.",
      "check": "bootJar 산출물 경로와 Dockerfile COPY 경로가 맞는지 확인합니다."
    },
    {
      "id": "prod-env",
      "title": "운영 설정은 환경변수로 주입합니다",
      "file": "src/main/resources/application-prod.yaml",
      "language": "yaml",
      "snippet": "spring:\n  datasource:\n    url: ${DB_URL}\n    username: ${DB_USERNAME}\n    password: ${DB_PASSWORD}\n  data:\n    redis:\n      host: ${REDIS_HOST}\n      port: ${REDIS_PORT:6379}\n\njwt:\n  secret: ${JWT_SECRET}\n  expiration-ms: ${JWT_EXPIRATION_MS:3600000}",
      "explanation": "운영 비밀값은 코드에 쓰지 않고 실행 환경에서 주입합니다.",
      "check": "실제 secret 값이 repository 파일에 들어가지 않았는지 확인합니다."
    }
  ],
  "concepts": [
    {
      "title": "실행 단위",
      "body": "운영에서는 source가 아니라 빌드된 jar와 image, container가 실행 단위가 됩니다."
    },
    {
      "title": "Profile 분리",
      "body": "로컬과 운영 설정을 나눠 같은 코드가 다른 환경에서 안전하게 실행되게 합니다."
    },
    {
      "title": "환경변수 주입",
      "body": "민감하거나 환경마다 다른 값을 실행 시점에 전달합니다."
    },
    {
      "title": "로그 확인",
      "body": "배포 명령이 끝난 뒤 실제 프로세스가 살아 있는지 확인하는 기준입니다."
    }
  ],
  "practice": [
    "bootJar 결과물이 Dockerfile에서 어떤 경로로 복사되는지 설명할 수 있나요?",
    "Docker image와 container의 차이를 말할 수 있나요?",
    "prod profile과 환경변수가 실행 시점에 어떻게 들어가는지 설명할 수 있나요?",
    "배포 명령은 성공했지만 앱이 죽어 있다면 어디를 먼저 봐야 하나요?"
  ],
  "mentorHints": [],
  "relatedDocs": [],
  "relatedCode": [],
  "topic": "Deployment and runtime environment",
  "question": "내 로컬에서 되던 Spring Boot 앱을 운영 실행 단위로 어떻게 묶을까?",
  "source": {
    "theory": "../../../theory.md",
    "implementation": "../../../implementation.md",
    "checklist": "../../../checklist.md"
  },
  "why": {
    "problem": "로컬에서 `bootRun`으로만 실행한 애플리케이션은 운영 서버에서 같은 조건으로 재현되기 어렵습니다.",
    "limits": [
      "jar 경로, Java 실행 환경, profile, 환경변수가 사람마다 다르면 실행 결과도 달라집니다.",
      "빌드 성공만 보고 컨테이너 상태와 로그를 보지 않으면 배포 성공을 착각할 수 있습니다.",
      "CI/CD 전체 자동화를 먼저 붙이면 실행 단위 자체의 책임이 흐려집니다."
    ],
    "choice": "먼저 jar를 Docker image와 container 실행 단위로 묶고, prod profile과 환경변수 주입 흐름을 확인합니다."
  },
  "overview": [
    "Source",
    "bootJar",
    "Dockerfile",
    "Docker Image",
    "Container",
    "Env Config",
    "Runtime Log"
  ],
  "responsibilities": [
    {
      "name": "bootJar",
      "role": "Spring Boot 애플리케이션을 실행 가능한 jar로 묶습니다.",
      "caution": "테스트 실패와 jar 생성 실패를 분리해서 봅니다."
    },
    {
      "name": "Dockerfile",
      "role": "jar를 어떤 실행 환경에서 어떻게 실행할지 파일로 고정합니다.",
      "caution": "로컬 경로에 의존하면 운영 재현성이 떨어집니다."
    },
    {
      "name": "Compose config",
      "role": "컨테이너 실행, profile, 환경변수 주입을 정리합니다.",
      "caution": "secret 값을 코드에 직접 넣지 않습니다."
    },
    {
      "name": "Runtime log",
      "role": "실행 후 애플리케이션 상태를 확인하는 근거입니다.",
      "caution": "build 성공과 서비스 정상 실행을 같은 의미로 보지 않습니다."
    }
  ],
  "glossary": [
    {
      "term": "bootJar",
      "meaning": "Spring Boot 애플리케이션을 실행 가능한 jar로 만드는 Gradle 작업입니다.",
      "caution": "서버가 정상 실행된다는 뜻까지 보장하지 않습니다."
    },
    {
      "term": "Dockerfile",
      "meaning": "컨테이너 이미지를 만들기 위한 실행 환경 설명서입니다.",
      "caution": "jar 경로와 실행 명령이 실제 산출물과 맞아야 합니다."
    },
    {
      "term": "Profile",
      "meaning": "환경별 설정 묶음을 선택하는 기준입니다.",
      "caution": "운영 profile에 필요한 값이 빠지면 runtime에서 실패할 수 있습니다."
    },
    {
      "term": "Environment Variable",
      "meaning": "실행 시점에 애플리케이션으로 전달하는 설정 값입니다.",
      "caution": "secret은 코드와 문서에 실제 값으로 남기지 않습니다."
    },
    {
      "term": "Runtime Log",
      "meaning": "컨테이너 안 애플리케이션의 실제 실행 상태를 보여주는 기록입니다.",
      "caution": "배포 성공 판정에는 로그와 상태 확인이 필요합니다."
    }
  ],
  "practical": [
    {
      "title": "빌드 성공은 배포 성공이 아닙니다",
      "body": "jar와 image가 만들어져도 환경변수나 runtime 오류로 애플리케이션은 죽을 수 있습니다."
    },
    {
      "title": "운영 설정은 실행 시점에 주입합니다",
      "body": "코드에 박힌 설정은 환경 교체와 secret 관리에 취약합니다."
    },
    {
      "title": "자동화는 다음 단계입니다",
      "body": "먼저 수동으로도 설명 가능한 실행 단위를 만들어야 workflow가 무엇을 자동화하는지 보입니다."
    }
  ],
  "checks": [
    "bootJar 결과물이 Dockerfile에서 어떤 경로로 복사되는지 설명할 수 있나요?",
    "Docker image와 container의 차이를 말할 수 있나요?",
    "prod profile과 환경변수가 실행 시점에 어떻게 들어가는지 설명할 수 있나요?",
    "배포 명령은 성공했지만 앱이 죽어 있다면 어디를 먼저 봐야 하나요?"
  ],
  "next": {
    "id": "10",
    "title": "CI/CD Deployment",
    "reason": "수동으로 실행 단위를 설명할 수 있다면, 다음에는 이 순서를 workflow와 script로 반복 가능하게 고정합니다."
  },
  "sourceDocs": []
};
