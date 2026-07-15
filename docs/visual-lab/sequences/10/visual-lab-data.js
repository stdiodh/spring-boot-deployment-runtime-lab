window.visualLabData = {
  "kind": "sequence",
  "sequence": "10",
  "title": "CI/CD Deployment",
  "subtitle": "Automation and operations flow",
  "goal": "build, deploy, verify job과 artifact 전달, 배포/검증 스크립트의 책임을 이해합니다.",
  "problem": "사람이 매번 같은 배포 명령을 손으로 반복하면 순서가 흔들리고 실패 기준이 누락될 수 있습니다.",
  "workbench": {
    "kind": "pipeline",
    "title": "Pipeline Gate",
    "instruction": "실패 지점을 선택해 이후 job이 차단되는지와 배포 성공을 판정할 증거를 확인하세요.",
    "scenarios": [
      {
        "id": "pipeline-verified",
        "label": "검증까지 완료",
        "flowId": "build-deploy-verify",
        "tone": "recovered",
        "prompt": "검증된 artifact가 배포되고 compose, 로그, HTTP 확인까지 이어집니다.",
        "route": [
          "Push / workflow_dispatch",
          "build job",
          "Artifact",
          "deploy job",
          "deploy.sh",
          "EC2 Runtime",
          "verify job",
          "check-deploy.sh",
          "HTTP response"
        ],
        "snapshot": [
          {
            "label": "Workflow",
            "value": "build · deploy · verify 통과",
            "tone": "recovered"
          },
          {
            "label": "성공 증거",
            "value": "compose 상태 · 로그 · HTTP 응답",
            "tone": "recovered"
          }
        ],
        "evidence": "build 산출물이 artifact로 전달되고 verify 단계가 compose 상태, 로그, HTTP 응답을 확인합니다.",
        "outcome": "배포 명령 종료가 아니라 verify 증거까지 통과해야 성공으로 판정합니다."
      },
      {
        "id": "pipeline-build-failed",
        "label": "build에서 차단",
        "flowId": "build-deploy-verify",
        "tone": "blocked",
        "prompt": "테스트 또는 bootJar가 실패했을 때 deploy가 실행되는지 확인합니다.",
        "route": [
          "Push / workflow_dispatch",
          "build job",
          "Artifact",
          "deploy job",
          "verify job"
        ],
        "snapshot": [
          {
            "label": "첫 실패",
            "value": "build 실패 · deploy 차단",
            "tone": "blocked"
          },
          {
            "label": "Artifact",
            "value": "생성되지 않음",
            "tone": "blocked"
          }
        ],
        "evidence": "build와 test가 실패하면 artifact가 만들어지지 않고 `needs`로 연결된 다음 job은 진행되지 않아야 합니다.",
        "outcome": "처음 실패한 build step을 원인 분석의 출발점으로 삼습니다.",
        "stopAfter": 1
      },
      {
        "id": "pipeline-deploy-failed",
        "label": "deploy에서 차단",
        "flowId": "workflow-step-responsibility",
        "tone": "blocked",
        "prompt": "artifact는 준비됐지만 서버 갱신에 실패한 경우 verify 경계를 확인합니다.",
        "route": [
          "build job",
          "Artifact",
          "deploy job",
          "deploy.sh",
          "EC2 Runtime",
          "verify job"
        ],
        "snapshot": [
          {
            "label": "Deploy",
            "value": "서버 갱신 실패 · verify 차단",
            "tone": "blocked"
          },
          {
            "label": "verify job",
            "value": "실행되지 않음",
            "tone": "blocked"
          }
        ],
        "evidence": "deploy.sh는 release 파일 배치와 애플리케이션 컨테이너 갱신을 담당하며, 실패 시 다음 job으로 넘어가지 않습니다.",
        "outcome": "build 성공과 deploy 성공을 분리하고 deploy step 로그를 먼저 확인합니다.",
        "stopAfter": 3
      },
      {
        "id": "pipeline-verify-failed",
        "label": "verify 실패",
        "flowId": "workflow-step-responsibility",
        "tone": "warning",
        "prompt": "컨테이너 갱신 뒤 상태, 로그 또는 HTTP 확인이 실패한 경우 성공 판정을 보류합니다.",
        "route": [
          "Artifact",
          "deploy job",
          "deploy.sh",
          "EC2 Runtime",
          "verify job",
          "check-deploy.sh",
          "배포 성공 판정"
        ],
        "snapshot": [
          {
            "label": "Verify",
            "value": "compose · log · HTTP 증거 부족",
            "tone": "warning"
          },
          {
            "label": "배포 성공 판정",
            "value": "보류",
            "tone": "warning"
          }
        ],
        "evidence": "check-deploy.sh의 compose 상태, 앱 로그, HTTP 응답 중 하나라도 실패하면 workflow는 성공으로 끝나지 않아야 합니다.",
        "outcome": "실행 파일 전달은 끝났지만 서비스 정상 여부가 확인되지 않았으므로 배포 완료로 보지 않습니다.",
        "stopAfter": 5
      }
    ]
  },
  "repo": {
    "name": "spring-boot-deployment-runtime-lab",
    "path": "spring-boot-deployment-runtime-lab"
  },
  "defaultSequence": "10",
  "actors": [
    {
      "id": "developer",
      "label": "개발자",
      "kind": "person"
    },
    {
      "id": "actions",
      "label": "GitHub Actions",
      "kind": "ci"
    },
    {
      "id": "build",
      "label": "Deploy Workflow",
      "kind": "ci"
    },
    {
      "id": "deploy",
      "label": "Upload/Deploy Steps",
      "kind": "ci"
    },
    {
      "id": "infra",
      "label": "EC2 Runtime",
      "kind": "infra"
    },
    {
      "id": "app",
      "label": "Running App",
      "kind": "server"
    }
  ],
  "flows": [
    {
      "id": "build-deploy-verify",
      "title": "test -> build -> upload -> deploy 흐름",
      "summary": "자동화의 핵심은 성공 경로뿐 아니라 실패하면 다음 단계로 넘어가지 않는 차단 경로입니다.",
      "mermaid": "sequenceDiagram\n  actor Developer\n  participant Build as build job\n  participant Deploy as deploy job\n  participant Verify as verify job\n  participant Server as Runtime server\n  Developer->>Build: push or workflow_dispatch\n  Build->>Build: test, bootJar, artifact upload\n  Build->>Deploy: release artifact\n  Deploy->>Server: deploy.sh\n  Deploy->>Verify: needs deploy\n  Verify->>Server: check-deploy.sh\n  Server-->>Verify: compose, log, HTTP result",
      "steps": [
        {
          "order": 1,
          "actor": "Developer",
          "input": "Push event",
          "owner": "GitHub Actions",
          "action": "workflow를 시작합니다.",
          "output": "Deploy workflow",
          "note": "자동화는 변경 이벤트를 기준으로 같은 순서를 반복합니다.",
          "id": "build-deploy-verify-step-1",
          "from": "Developer",
          "to": "GitHub Actions",
          "message": "workflow를 시작합니다.",
          "messageKind": "request",
          "problem": "Push event",
          "concept": "GitHub Actions",
          "check": "Deploy workflow",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "order": 2,
          "actor": "GitHub Actions",
          "input": "Source code",
          "owner": "Deploy workflow",
          "action": "test와 build를 실행합니다.",
          "output": "Artifact",
          "note": "build가 실패하면 deploy는 실행되지 않아야 합니다.",
          "id": "build-deploy-verify-step-2",
          "from": "GitHub Actions",
          "to": "Deploy workflow",
          "message": "test와 build를 실행합니다.",
          "messageKind": "request",
          "problem": "Source code",
          "concept": "Deploy workflow",
          "check": "Artifact",
          "codePointIds": [
            "inline-deploy-steps",
            "workflow-stages"
          ]
        },
        {
          "order": 3,
          "actor": "Deploy workflow",
          "input": "Artifact",
          "owner": "Upload and deploy steps",
          "action": "release bundle을 서버로 업로드하고 EC2 배포 명령을 실행합니다.",
          "output": "Restarted service",
          "note": "workflow는 원격 실행 순서를 조율합니다.",
          "id": "build-deploy-verify-step-3",
          "from": "Deploy workflow",
          "to": "Upload and deploy steps",
          "message": "release bundle을 서버로 업로드하고 EC2 배포 명령을 실행합니다.",
          "messageKind": "request",
          "problem": "Artifact",
          "concept": "Upload and deploy steps",
          "check": "Restarted service",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "order": 4,
          "actor": "Upload and deploy steps",
          "input": "Running service",
          "owner": "Log check step",
          "action": "compose 상태와 앱 로그로 배포 결과를 확인합니다.",
          "output": "Deployment result",
          "note": "verify 실패는 배포 실패로 봐야 합니다.",
          "id": "build-deploy-verify-step-4",
          "from": "Upload and deploy steps",
          "to": "Log check step",
          "message": "compose 상태와 앱 로그로 배포 결과를 확인합니다.",
          "messageKind": "response",
          "problem": "Running service",
          "concept": "Log check step",
          "check": "Deployment result",
          "codePointIds": [
            "inline-deploy-steps",
            "workflow-stages"
          ]
        }
      ],
      "bandKind": "scenario"
    },
    {
      "id": "workflow-step-responsibility",
      "title": "배포와 검증 script 책임 흐름",
      "summary": "이번 시퀀스는 workflow가 순서를 조율하고 deploy.sh와 check-deploy.sh가 서버 작업을 나눠 맡습니다.",
      "steps": [
        {
          "order": 1,
          "actor": "Workflow",
          "input": "Artifact and secrets",
          "owner": "deploy.sh",
          "action": "release 파일을 배치하고 애플리케이션 컨테이너를 갱신합니다.",
          "output": "Runtime update",
          "note": "workflow는 원격 실행을 조율하고 서버 재기동 책임은 deploy.sh에 둡니다.",
          "id": "workflow-step-responsibility-step-1",
          "from": "Workflow",
          "to": "deploy.sh",
          "message": "release 파일을 배치하고 애플리케이션 컨테이너를 갱신합니다.",
          "messageKind": "request",
          "problem": "Artifact and secrets",
          "concept": "deploy.sh",
          "check": "Runtime update",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "order": 2,
          "actor": "Workflow",
          "input": "Runtime endpoint",
          "owner": "check-deploy.sh",
          "action": "배포 후 compose 상태, 앱 로그, HTTP 응답을 확인합니다.",
          "output": "Pass or fail",
          "note": "배포 완료 기준은 명령 종료가 아니라 서비스 확인입니다.",
          "id": "workflow-step-responsibility-step-2",
          "from": "Workflow",
          "to": "check-deploy.sh",
          "message": "배포 후 compose 상태, 앱 로그, HTTP 응답을 확인합니다.",
          "messageKind": "request",
          "problem": "Runtime endpoint",
          "concept": "check-deploy.sh",
          "check": "Pass or fail",
          "codePointIds": [
            "inline-deploy-steps",
            "workflow-stages"
          ]
        },
        {
          "order": 3,
          "actor": "GitHub Actions",
          "input": "Step result",
          "owner": "Workflow status",
          "action": "실패한 step을 기준으로 전체 결과를 실패 처리합니다.",
          "output": "Action result",
          "note": "처음 실패한 단계가 원인 분석의 출발점입니다.",
          "id": "workflow-step-responsibility-step-3",
          "from": "GitHub Actions",
          "to": "Workflow status",
          "message": "실패한 step을 기준으로 전체 결과를 실패 처리합니다.",
          "messageKind": "error",
          "problem": "Step result",
          "concept": "Workflow status",
          "check": "Action result",
          "codePointIds": [
            "workflow-stages",
            "inline-deploy-steps"
          ]
        },
        {
          "id": "workflow-step-responsibility-check-4",
          "order": 4,
          "actor": "Workflow status",
          "owner": "확인 지점",
          "from": "Workflow status",
          "to": "확인 지점",
          "message": "결과와 실패 지점을 확인합니다.",
          "messageKind": "response",
          "problem": "구현 후 실제로 어느 지점이 통과했는지 확인해야 합니다.",
          "concept": "Verification",
          "action": "문서의 확인 명령이나 화면에서 결과를 검증합니다.",
          "check": "성공 흐름과 실패 흐름을 말로 설명합니다.",
          "note": "Visual Lab은 코드를 대신 완성하지 않고 확인 지점을 고정합니다.",
          "codePointIds": [
            "inline-deploy-steps"
          ]
        }
      ],
      "bandKind": "scenario"
    }
  ],
  "flow": [
    {
      "id": "build-deploy-verify-step-1",
      "label": "GitHub Actions",
      "problem": "Push event",
      "concept": "GitHub Actions",
      "action": "workflow를 시작합니다.",
      "check": "Deploy workflow",
      "codePointIds": [
        "workflow-stages",
        "inline-deploy-steps"
      ]
    },
    {
      "id": "build-deploy-verify-step-2",
      "label": "Deploy workflow",
      "problem": "Source code",
      "concept": "Deploy workflow",
      "action": "test와 build를 실행합니다.",
      "check": "Artifact",
      "codePointIds": [
        "inline-deploy-steps",
        "workflow-stages"
      ]
    },
    {
      "id": "build-deploy-verify-step-3",
      "label": "Upload and deploy steps",
      "problem": "Artifact",
      "concept": "Upload and deploy steps",
      "action": "release bundle을 서버로 업로드하고 EC2 배포 명령을 실행합니다.",
      "check": "Restarted service",
      "codePointIds": [
        "workflow-stages",
        "inline-deploy-steps"
      ]
    },
    {
      "id": "build-deploy-verify-step-4",
      "label": "Log check step",
      "problem": "Running service",
      "concept": "Log check step",
      "action": "compose 상태와 앱 로그로 배포 결과를 확인합니다.",
      "check": "Deployment result",
      "codePointIds": [
        "inline-deploy-steps",
        "workflow-stages"
      ]
    }
  ],
  "codePoints": [
    {
      "id": "workflow-stages",
      "title": "Workflow는 build, deploy, verify 책임을 분리합니다",
      "file": ".github/workflows/deploy.yml",
      "language": "yaml",
      "snippet": "jobs:\n  build:\n    steps:\n      - run: ./gradlew test bootJar\n      - uses: actions/upload-artifact@v4\n  deploy:\n    needs: build\n    steps:\n      - uses: actions/download-artifact@v4\n      - run: bash scripts/deploy.sh\n  verify:\n    needs: deploy\n    steps:\n      - run: bash scripts/check-deploy.sh",
      "explanation": "완성 workflow는 build 산출물을 artifact로 넘기고 deploy와 verify를 `needs`로 연결해 실패 경계를 분리합니다.",
      "check": "실패한 step 이후 작업이 실행되지 않는지 확인합니다."
    },
    {
      "id": "inline-deploy-steps",
      "title": "Deploy와 verify script가 서버 작업을 분리합니다",
      "file": ".github/workflows/deploy.yml",
      "language": "yaml",
      "snippet": "- name: Deploy on EC2\n  run: APP_IMAGE=${APP_IMAGE} bash scripts/deploy.sh ${RELEASE_DIR}\n\n- name: Verify deployment on EC2\n  run: bash scripts/check-deploy.sh ${RELEASE_DIR}",
      "explanation": "완성 workflow는 배포와 검증 script를 호출하고, 배포 script는 DB와 Redis를 내리지 않은 채 image를 갱신합니다.",
      "check": "배포 실패 시 어떤 step 로그를 먼저 볼지 확인합니다."
    }
  ],
  "concepts": [
    {
      "title": "CI는 먼저 멈추는 장치입니다",
      "body": "빌드와 테스트가 실패하면 deploy 단계로 넘어가지 않게 합니다."
    },
    {
      "title": "CD는 검증된 산출물을 실행 환경으로 옮깁니다",
      "body": "배포는 파일 전달과 실행 전환, 상태 확인까지 포함합니다."
    },
    {
      "title": "Verify는 완료 기준입니다",
      "body": "서비스가 실제로 응답하는지 확인해야 배포 성공을 말할 수 있습니다."
    },
    {
      "title": "Secret은 workflow 입력입니다",
      "body": "서버 접속 정보와 민감한 값은 코드가 아니라 안전한 저장소에서 주입합니다."
    }
  ],
  "practice": [
    "build가 실패하면 deploy가 실행되지 않아야 하는 이유를 설명할 수 있나요?",
    "artifact가 workflow 단계 사이에서 어떤 역할을 하는지 말할 수 있나요?",
    "release bundle이 서버로 전달되는 이유를 설명할 수 있나요?",
    "배포 후 compose 상태와 앱 로그를 확인해야 하는 이유를 말할 수 있나요?"
  ],
  "mentorHints": [],
  "relatedDocs": [],
  "relatedCode": [],
  "topic": "Automation and operations flow",
  "question": "한 번 성공한 배포 흐름을 어떻게 반복 가능하고 실패에 강하게 만들까?",
  "source": {
    "theory": "../../../theory.md",
    "implementation": "../../../implementation.md",
    "checklist": "../../../checklist.md"
  },
  "why": {
    "problem": "사람이 매번 같은 배포 명령을 손으로 반복하면 순서가 흔들리고 실패 기준이 누락될 수 있습니다.",
    "limits": [
      "build 실패 후 deploy가 이어지면 실패 원인이 더 커집니다.",
      "deploy 명령만 자동화하고 verify를 빼면 서비스 정상 여부를 확인하지 못합니다.",
      "workflow step의 책임이 흐려지면 실패 지점을 읽기 어려워집니다."
    ],
    "choice": "workflow는 test/build, bundle, upload, EC2 deploy, 로그 확인을 step 순서로 고정합니다."
  },
  "overview": [
    "Push",
    "GitHub Actions",
    "Test",
    "Build",
    "Artifact",
    "Upload",
    "EC2 Deploy",
    "Log Check"
  ],
  "responsibilities": [
    {
      "name": "CI workflow",
      "role": "build와 test 기준을 자동으로 확인합니다.",
      "caution": "검증 없이 deploy로 넘어가지 않습니다."
    },
    {
      "name": "Artifact",
      "role": "검증된 빌드 결과물을 다음 단계로 전달합니다.",
      "caution": "source와 실행 산출물을 혼동하지 않습니다."
    },
    {
      "name": "Upload/Deploy steps",
      "role": "release bundle 업로드와 EC2 배포 명령을 실행합니다.",
      "caution": "업로드와 재기동 순서를 바꾸지 않습니다."
    },
    {
      "name": "Log check step",
      "role": "배포 후 compose 상태와 앱 로그를 확인합니다.",
      "caution": "로그 확인을 생략하면 실패한 배포를 놓칠 수 있습니다."
    }
  ],
  "glossary": [
    {
      "term": "CI",
      "meaning": "변경된 코드가 빌드되고 테스트되는지 자동으로 확인하는 흐름입니다.",
      "caution": "실패 후 deploy가 이어지면 안 됩니다."
    },
    {
      "term": "CD",
      "meaning": "검증된 결과물을 실행 환경으로 전달하고 배포하는 흐름입니다.",
      "caution": "전달만으로 서비스 정상 여부가 보장되지는 않습니다."
    },
    {
      "term": "Artifact",
      "meaning": "build job이 만든 배포 가능한 산출물입니다.",
      "caution": "source code와 실행 파일을 구분해야 합니다."
    },
    {
      "term": "Verify",
      "meaning": "배포 후 서비스 상태와 로그를 확인하는 단계입니다.",
      "caution": "컨테이너 상태와 로그를 함께 봅니다."
    },
    {
      "term": "Secret",
      "meaning": "workflow가 안전하게 주입받는 민감한 설정 값입니다.",
      "caution": "로그나 저장소 파일에 실제 값을 남기지 않습니다."
    }
  ],
  "practical": [
    {
      "title": "실패 차단이 자동화의 핵심입니다",
      "body": "성공 경로를 빠르게 만드는 것보다 실패 후 다음 단계로 넘어가지 않는 것이 더 중요합니다."
    },
    {
      "title": "workflow와 script 책임을 분리합니다",
      "body": "workflow는 job 순서를 조율하고 deploy.sh와 check-deploy.sh는 서버 갱신과 검증을 각각 맡습니다."
    },
    {
      "title": "verify 없는 deploy는 완료가 아닙니다",
      "body": "프로세스가 올라왔는지, compose 상태와 앱 로그가 정상인지 확인해야 운영 흐름이 끝납니다."
    }
  ],
  "checks": [
    "build가 실패하면 deploy가 실행되지 않아야 하는 이유를 설명할 수 있나요?",
    "artifact가 workflow 단계 사이에서 어떤 역할을 하는지 말할 수 있나요?",
    "release bundle이 서버로 전달되는 이유를 설명할 수 있나요?",
    "배포 후 compose 상태와 앱 로그를 확인해야 하는 이유를 말할 수 있나요?"
  ],
  "next": {
    "id": "11",
    "title": "Refactoring Foundation",
    "reason": "자동화가 변경 후 동작을 확인해주기 시작하면, 다음에는 코드 구조를 작게 정리하며 테스트로 동작 보존을 확인합니다."
  },
  "sourceDocs": []
};
