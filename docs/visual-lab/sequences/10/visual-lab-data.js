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
    "visual": {
      "src": "../../assets/diagrams/10-pipeline-gates.svg",
      "alt": "build가 artifact를 만들고 deploy가 서버를 갱신한 뒤 verify가 compose 상태와 로그를 출력하고 HTTP 응답 성공을 확인하는 세 개의 파이프라인 게이트",
      "caption": "build와 deploy 통과 뒤 verify는 ps·log 출력을 관찰하고 `curl --fail`이 성공할 때 workflow를 완료합니다."
    },
    "terms": [
      { "term": "job", "meaning": "CI/CD workflow 안에서 하나의 책임을 수행하는 실행 단위" },
      { "term": "artifact", "meaning": "build job이 만들고 다음 job으로 전달하는 검증된 배포 파일" },
      { "term": "needs", "meaning": "이전 job 성공을 다음 job의 실행 조건으로 연결하는 의존 선언" },
      { "term": "verify", "meaning": "배포 명령 이후 실제 서비스 상태를 증거로 확인하는 별도 단계" }
    ],
    "comparison": {
      "label": "명령 실행과 서비스 검증",
      "left": {
        "title": "deploy command",
        "body": "release 파일을 배치하고 애플리케이션 container를 갱신하는 작업입니다. 명령 종료는 중간 상태입니다."
      },
      "right": {
        "title": "verified service",
        "body": "compose 상태와 애플리케이션 로그를 관찰하고 HTTP health check가 성공한 상태입니다. ps와 log 내용을 별도로 판정하는 script는 아닙니다."
      }
    },
    "nodes": {
      "git-trigger": {
        "label": "Git trigger",
        "icon": "person",
        "kind": "trigger",
        "role": "push 또는 수동 실행으로 workflow 시작",
        "boundary": "Source event"
      },
      "github-actions": {
        "label": "GitHub Actions",
        "icon": "pipeline",
        "kind": "orchestrator",
        "role": "job 순서와 needs gate 관리",
        "boundary": "Workflow",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "build-job": {
        "label": "build job",
        "icon": "gate",
        "kind": "job gate",
        "role": "test, bootJar, artifact upload",
        "boundary": "Build job",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "release-bundle": {
        "label": "release-bundle",
        "icon": "artifact",
        "kind": "artifact",
        "role": "job 사이에서 전달되는 검증된 배포 파일",
        "boundary": "Artifact transfer"
      },
      "deploy-job": {
        "label": "deploy job",
        "icon": "gate",
        "kind": "job gate",
        "role": "artifact를 받아 EC2 갱신 수행",
        "boundary": "Deploy job",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "secret-references": {
        "label": "Secret references",
        "icon": "security",
        "kind": "protected config",
        "role": "SSH와 운영 환경 변수 이름을 안전하게 참조",
        "boundary": "Trust boundary"
      },
      "ec2-host": {
        "label": "EC2 host",
        "icon": "host",
        "kind": "runtime host",
        "role": "release bundle을 받아 배포 script 실행",
        "boundary": "Remote runtime"
      },
      "deploy-script": {
        "label": "scripts/deploy.sh",
        "icon": "tool",
        "kind": "deployment script",
        "role": "app image build와 compose 갱신",
        "boundary": "Remote runtime",
        "codePointIds": [
          "inline-deploy-steps"
        ]
      },
      "app-container": {
        "label": "Application container",
        "icon": "runtime",
        "kind": "runtime instance",
        "role": "갱신된 애플리케이션 실행 단위",
        "boundary": "Remote runtime"
      },
      "verify-job": {
        "label": "verify job",
        "icon": "gate",
        "kind": "verification gate",
        "role": "deploy 통과 뒤 서비스 증거 확인",
        "boundary": "Verify job",
        "codePointIds": [
          "workflow-stages"
        ]
      },
      "verify-script": {
        "label": "scripts/check-deploy.sh",
        "icon": "test",
        "kind": "verification script",
        "role": "compose 상태·로그 출력 관찰과 HTTP 성공 확인",
        "boundary": "Verification",
        "codePointIds": [
          "inline-deploy-steps"
        ]
      },
      "http-response": {
        "label": "HTTP response",
        "icon": "response",
        "kind": "runtime evidence",
        "role": "애플리케이션 응답 가능 여부",
        "boundary": "Verification"
      },
      "workflow-result": {
        "label": "Workflow result",
        "icon": "evidence",
        "kind": "decision evidence",
        "role": "build, deploy, verify의 최종 판정",
        "boundary": "Workflow result"
      },
      "build-failure": {
        "label": "Build failure",
        "icon": "evidence",
        "kind": "failure evidence",
        "role": "test 또는 bootJar의 첫 실패",
        "boundary": "Build job"
      },
      "deploy-failure": {
        "label": "Deploy failure",
        "icon": "evidence",
        "kind": "failure evidence",
        "role": "서버 파일 전달 또는 app 갱신 실패",
        "boundary": "Deploy job"
      },
      "verify-failure": {
        "label": "Verification failure",
        "icon": "evidence",
        "kind": "failure evidence",
        "role": "docker 명령 오류 또는 HTTP health check 실패",
        "boundary": "Verify job"
      }
    },
    "scenarios": [
      {
        "id": "pipeline-verified",
        "label": "release-bundle·EC2 입력 준비",
        "flowId": "build-deploy-verify",
        "tone": "recovered",
        "prompt": "build job이 release-bundle을 만들었고 EC2 배포 입력이 준비되었습니다. 어디까지 관찰해야 성공을 판단할지 예측합니다.",
        "prediction": {
          "prompt": "어느 gate까지 통과해야 배포 성공으로 판단할 수 있을까요?",
          "options": [
            { "id": "build", "label": "build job 성공" },
            { "id": "deploy", "label": "deploy 스크립트 종료" },
            { "id": "verify", "label": "ps·log 관찰 후 HTTP health check 성공" }
          ],
          "answer": "verify",
          "explanation": "artifact 전달과 서버 갱신은 중간 상태입니다. 실제 서비스 증거를 확인하는 verify가 최종 gate입니다."
        },
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
        "diagram": {
          "caption": "needs gate가 build, deploy, verify를 차례로 열고, artifact 전달과 runtime 검증이 모두 통과해야 workflow가 성공합니다.",
          "lanes": [
            {
              "id": "workflow-orchestration",
              "label": "Workflow orchestration",
              "description": "job의 성공 상태가 다음 needs gate를 여는 조건입니다.",
              "steps": [
                {
                  "from": "git-trigger",
                  "to": "github-actions",
                  "verb": "workflow 시작",
                  "payload": "push | workflow_dispatch",
                  "kind": "request"
                },
                {
                  "from": "github-actions",
                  "to": "build-job",
                  "verb": "build 실행",
                  "payload": "./gradlew test bootJar",
                  "kind": "call",
                  "codePointIds": [
                    "workflow-stages"
                  ]
                },
                {
                  "from": "build-job",
                  "to": "release-bundle",
                  "verb": "artifact 업로드",
                  "payload": "release-bundle",
                  "kind": "transform"
                },
                {
                  "from": "release-bundle",
                  "to": "deploy-job",
                  "verb": "artifact 다운로드",
                  "payload": "needs: build passed",
                  "kind": "call"
                },
                {
                  "from": "deploy-job",
                  "to": "verify-job",
                  "verb": "verify gate 개방",
                  "payload": "needs: deploy passed",
                  "kind": "call",
                  "concept": "실패 차단 gate"
                }
              ]
            },
            {
              "id": "remote-deploy",
              "label": "Artifact transfer → EC2 runtime",
              "description": "deploy job은 bundle과 secret 참조를 사용해 원격 app container를 갱신합니다.",
              "steps": [
                {
                  "from": "deploy-job",
                  "to": "ec2-host",
                  "verb": "전송과 원격 실행",
                  "payload": "SCP release-bundle + SSH command",
                  "kind": "call"
                },
                {
                  "from": "secret-references",
                  "to": "ec2-host",
                  "verb": "운영 설정 주입",
                  "payload": "secret references only",
                  "kind": "config",
                  "check": "secret 값은 diagram과 log에 노출하지 않습니다."
                },
                {
                  "from": "ec2-host",
                  "to": "deploy-script",
                  "verb": "script 실행",
                  "payload": "bash scripts/deploy.sh",
                  "kind": "call",
                  "codePointIds": [
                    "inline-deploy-steps"
                  ]
                },
                {
                  "from": "deploy-script",
                  "to": "app-container",
                  "verb": "app 갱신",
                  "payload": "docker build + compose up -d",
                  "kind": "transform",
                  "check": "DB와 Redis를 불필요하게 내리는 흐름으로 해석하지 않습니다."
                }
              ]
            },
            {
              "id": "runtime-verification",
              "label": "Runtime verification",
              "description": "배포 명령 종료와 서비스 정상 판정을 분리합니다.",
              "steps": [
                {
                  "from": "verify-job",
                  "to": "verify-script",
                  "verb": "원격 검증 실행",
                  "payload": "bash scripts/check-deploy.sh",
                  "kind": "call"
                },
                {
                  "from": "verify-script",
                  "to": "app-container",
                  "verb": "상태와 로그 확인",
                  "payload": "docker compose ps + docker logs",
                  "kind": "compare"
                },
                {
                  "from": "verify-script",
                  "to": "http-response",
                  "verb": "응답 확인",
                  "payload": "curl http://localhost:8080/",
                  "kind": "request"
                },
                {
                  "from": "http-response",
                  "to": "workflow-result",
                  "verb": "성공 판정",
                  "payload": "ps·log output observed + HTTP health check passed",
                  "kind": "response"
                }
              ]
            }
          ]
        },
        "snapshot": [
          {
            "label": "Workflow",
            "value": "build · deploy · verify 통과",
            "tone": "recovered"
          },
          {
            "label": "성공 증거",
            "value": "ps·log 출력 · HTTP health check",
            "tone": "recovered"
          }
        ],
        "evidence": "build 산출물이 artifact로 전달되고 check-deploy.sh가 compose 상태와 로그를 출력한 뒤 `curl --fail`로 HTTP 응답을 확인합니다.",
        "outcome": "배포 명령 종료가 아니라 runtime 출력을 관찰하고 HTTP health check가 성공해야 workflow를 성공으로 판정합니다."
      },
      {
        "id": "pipeline-build-failed",
        "label": "test·bootJar 실패",
        "flowId": "build-deploy-verify",
        "tone": "blocked",
        "prompt": "테스트 또는 bootJar가 실패했을 때 deploy가 실행되는지 확인합니다.",
        "prediction": {
          "prompt": "build가 실패하면 deploy job은 어떻게 될까요?",
          "options": [
            { "id": "continue", "label": "실패한 artifact로 계속 진행" },
            { "id": "skip", "label": "needs 조건 때문에 실행하지 않음" },
            { "id": "verify", "label": "verify만 먼저 실행" }
          ],
          "answer": "skip",
          "explanation": "검증된 artifact가 없으므로 needs로 연결된 deploy와 verify는 시작되지 않아야 합니다."
        },
        "route": [
          "Push / workflow_dispatch",
          "build job",
          "Artifact",
          "deploy job",
          "verify job"
        ],
        "diagram": {
          "caption": "build job이 실패하면 artifact가 없고 needs gate가 deploy와 verify를 blocked 상태로 남깁니다.",
          "lanes": [
            {
              "id": "build-blocked",
              "label": "Build gate",
              "description": "처음 실패한 build step에서 원인 분석을 시작합니다.",
              "steps": [
                {
                  "from": "git-trigger",
                  "to": "github-actions",
                  "verb": "workflow 시작",
                  "payload": "push | workflow_dispatch",
                  "kind": "request"
                },
                {
                  "from": "github-actions",
                  "to": "build-job",
                  "verb": "test와 build 실행",
                  "payload": "./gradlew test bootJar",
                  "kind": "call"
                },
                {
                  "from": "build-job",
                  "to": "build-failure",
                  "verb": "첫 실패 기록",
                  "payload": "test 또는 bootJar failure",
                  "kind": "failure",
                  "check": "실패한 step과 log를 먼저 확인합니다."
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "release-bundle",
              "reason": "build가 실패해 artifact를 업로드하지 못했습니다."
            },
            {
              "label": "deploy job",
              "reason": "needs: build 조건이 충족되지 않아 blocked 상태입니다."
            },
            {
              "label": "verify job",
              "reason": "deploy가 실행되지 않았으므로 검증도 시작되지 않습니다."
            }
          ]
        },
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
        "label": "EC2 갱신 명령 오류",
        "flowId": "workflow-step-responsibility",
        "tone": "blocked",
        "prompt": "artifact는 준비됐지만 서버 갱신에 실패한 경우 verify 경계를 확인합니다.",
        "prediction": {
          "prompt": "artifact가 존재하지만 서버 갱신이 실패했다면 어디부터 확인할까요?",
          "options": [
            { "id": "build", "label": "이미 통과한 build 테스트" },
            { "id": "deploy", "label": "deploy step과 서버 갱신 로그" },
            { "id": "verify", "label": "실행되지 않은 HTTP verify" }
          ],
          "answer": "deploy",
          "explanation": "build 성공과 deploy 성공은 별도입니다. 처음 실패한 deploy step과 서버 갱신 책임을 먼저 좁힙니다."
        },
        "route": [
          "build job",
          "Artifact",
          "deploy job",
          "deploy.sh",
          "EC2 Runtime",
          "verify job"
        ],
        "diagram": {
          "caption": "artifact 생성과 서버 갱신은 별도 책임이며, deploy가 실패하면 verify gate는 열리지 않습니다.",
          "lanes": [
            {
              "id": "deploy-blocked",
              "label": "Artifact transfer → Deploy gate",
              "description": "검증된 bundle이 있어도 원격 갱신 실패는 별도로 진단합니다.",
              "steps": [
                {
                  "from": "build-job",
                  "to": "release-bundle",
                  "verb": "artifact 업로드",
                  "payload": "release-bundle",
                  "kind": "transform"
                },
                {
                  "from": "release-bundle",
                  "to": "deploy-job",
                  "verb": "artifact 다운로드",
                  "payload": "needs: build passed",
                  "kind": "call"
                },
                {
                  "from": "deploy-job",
                  "to": "ec2-host",
                  "verb": "전송과 원격 실행",
                  "payload": "SCP + SSH",
                  "kind": "call"
                },
                {
                  "from": "ec2-host",
                  "to": "deploy-script",
                  "verb": "갱신 script 실행",
                  "payload": "scripts/deploy.sh",
                  "kind": "call"
                },
                {
                  "from": "deploy-script",
                  "to": "deploy-failure",
                  "verb": "서버 갱신 중단",
                  "payload": "image build 또는 compose failure",
                  "kind": "failure",
                  "check": "deploy step log에서 첫 실패 명령을 확인합니다."
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "verify job",
              "reason": "needs: deploy 조건이 충족되지 않아 실행되지 않습니다."
            }
          ]
        },
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
        "label": "deploy 후 HTTP 응답 없음",
        "flowId": "workflow-step-responsibility",
        "tone": "warning",
        "prompt": "app container 갱신 명령은 끝났지만 `curl --fail` HTTP 확인이 성공하지 않았습니다. 현재 상태를 예측합니다.",
        "prediction": {
          "prompt": "deploy는 끝났지만 HTTP 확인이 실패했습니다. 현재 상태는 무엇일까요?",
          "options": [
            { "id": "complete", "label": "배포 완료" },
            { "id": "rollback", "label": "자동 rollback 완료" },
            { "id": "unverified", "label": "갱신됐지만 정상 여부는 미확인" }
          ],
          "answer": "unverified",
          "explanation": "파일 전달과 container 갱신만으로 서비스 정상 상태를 보장하지 않습니다. verify 실패 증거를 해결해야 합니다."
        },
        "route": [
          "Artifact",
          "deploy job",
          "deploy.sh",
          "EC2 Runtime",
          "verify job",
          "check-deploy.sh",
          "배포 성공 판정"
        ],
        "diagram": {
          "caption": "container 갱신이 끝나도 compose 상태, log, HTTP 증거 중 하나가 실패하면 배포 성공 판정을 보류합니다.",
          "lanes": [
            {
              "id": "verify-warning",
              "label": "Deploy passed → Verify failed",
              "description": "deploy 완료와 서비스 정상 상태를 서로 다른 gate로 봅니다.",
              "steps": [
                {
                  "from": "release-bundle",
                  "to": "deploy-job",
                  "verb": "배포 입력 전달",
                  "payload": "release-bundle",
                  "kind": "call"
                },
                {
                  "from": "deploy-job",
                  "to": "app-container",
                  "verb": "app 갱신 완료",
                  "payload": "scripts/deploy.sh",
                  "kind": "transform"
                },
                {
                  "from": "deploy-job",
                  "to": "verify-job",
                  "verb": "verify gate 개방",
                  "payload": "needs: deploy passed",
                  "kind": "call"
                },
                {
                  "from": "verify-job",
                  "to": "verify-script",
                  "verb": "증거 수집",
                  "payload": "compose ps output + logs + curl --fail",
                  "kind": "compare"
                },
                {
                  "from": "verify-script",
                  "to": "verify-failure",
                  "verb": "성공 판정 중단",
                  "payload": "docker command error or HTTP health check failure",
                  "kind": "failure",
                  "check": "실패한 첫 검증 항목과 runtime log를 연결합니다."
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "Workflow success",
              "reason": "verify 증거가 모두 통과하지 않아 배포 완료로 확정하지 않습니다."
            }
          ]
        },
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
        "evidence": "check-deploy.sh는 docker 명령 오류 없이 ps·log 출력을 보여주고, `curl --fail`이 성공해야 0으로 종료합니다. 로그 내용의 정상 여부를 자동 판정하지는 않습니다.",
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
