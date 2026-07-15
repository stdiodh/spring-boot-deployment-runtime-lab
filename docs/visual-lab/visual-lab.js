(function () {
  "use strict";

  const data = window.visualLabData || {};
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const playbackSpeeds = [
    { label: "1x", ms: 2400 },
    { label: "1.5x", ms: 1600 },
    { label: "2x", ms: 1000 },
  ];
  const kindLabels = {
    request: "요청 검사기",
    "request-trace": "요청 패킷 추적",
    persistence: "영속성 경계",
    gate: "실패 차단 경계",
    auth: "인증·인가 경계",
    trust: "신뢰 경계",
    test: "테스트 하네스",
    cache: "캐시 상태 검사기",
    realtime: "연결·브로드캐스트 콘솔",
    runtime: "실행 환경 경계",
    pipeline: "배포 파이프라인 게이트",
    refactor: "동작 보존 지도",
    event: "이벤트 전달 추적",
    trace: "학습 신호 추적",
  };
  const toneLabels = {
    signal: "진행 중",
    blocked: "여기서 차단",
    warning: "주의 필요",
    recovered: "확인 완료",
  };
  const edgeKindLabels = {
    request: "요청",
    call: "호출",
    transform: "변환",
    persist: "저장",
    response: "응답",
    failure: "실패 경로",
    event: "이벤트 전달",
    config: "설정 주입",
    compare: "비교",
  };
  const state = {
    scenarioIndex: 0,
    flowIndex: 0,
    stepIndex: 0,
    speedIndex: 0,
    isPlaying: false,
    timerId: 0,
    checked: new Set(),
  };
  let sectionObserver = null;

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }
    return element;
  }

  function appendText(parent, tagName, className, text) {
    if (!text) {
      return null;
    }
    const element = createElement(tagName, className, text);
    parent.appendChild(element);
    return element;
  }

  function makeLink(label, href, className) {
    const link = createElement("a", className || "text-link", label);
    link.href = href;
    return link;
  }

  function currentSequence() {
    if (data.kind === "sequence") {
      return {
        ...data,
        id: data.sequence || "NN",
        question: data.question || data.problem || data.goal,
        checks: list(data.checks).length ? data.checks : data.practice,
      };
    }
    return null;
  }

  function flowIndexById(sequence, flowId) {
    const flows = list(sequence.flows);
    const index = flows.findIndex((flow) => flow.id === flowId);
    return index >= 0 ? index : 0;
  }

  function currentFlow(sequence) {
    return list(sequence.flows)[state.flowIndex] || list(sequence.flows)[0] || { steps: [] };
  }

  function currentSteps(sequence) {
    const diagramSteps = semanticSteps(sequence, currentScenario(sequence));
    return diagramSteps.length ? diagramSteps : list(currentFlow(sequence).steps);
  }

  function currentStep(sequence) {
    return currentSteps(sequence)[state.stepIndex] || {};
  }

  function currentLaneContext(sequence) {
    const steps = currentSteps(sequence);
    const step = steps[state.stepIndex] || {};
    if (!step._laneId) {
      return {
        id: "legacy",
        label: "전체 경로",
        start: 0,
        end: Math.max(steps.length - 1, 0),
        length: steps.length,
        index: state.stepIndex,
      };
    }
    const laneSteps = steps.filter((item) => item._laneId === step._laneId);
    return {
      id: step._laneId,
      label: step._laneLabel || "현재 경로",
      start: laneSteps[0]._globalIndex,
      end: laneSteps[laneSteps.length - 1]._globalIndex,
      length: laneSteps.length,
      index: step._laneStepIndex,
    };
  }

  function deriveRoute(flow) {
    const route = [];
    list(flow.steps).forEach((step) => {
      const from = step.from || step.actor;
      const to = step.to || step.owner;
      if (from && route[route.length - 1] !== from) {
        route.push(from);
      }
      if (to && route[route.length - 1] !== to) {
        route.push(to);
      }
    });
    return route;
  }

  function normalizedWorkbench(sequence) {
    if (sequence.workbench && list(sequence.workbench.scenarios).length) {
      return sequence.workbench;
    }

    return {
      kind: "trace",
      title: "핵심 흐름 추적",
      instruction: "흐름을 선택하고 단계별 책임과 확인 지점을 따라가세요.",
      scenarios: list(sequence.flows).map((flow, index) => ({
        id: flow.id || `flow-${index + 1}`,
        label: flow.title || `흐름 ${index + 1}`,
        flowId: flow.id,
        tone: "signal",
        prompt: flow.summary || sequence.problem,
        route: deriveRoute(flow),
        snapshot: [
          { label: "현재 흐름", value: flow.title || `흐름 ${index + 1}` },
          { label: "관찰 단계", value: `${list(flow.steps).length}개 단계` },
        ],
        evidence: flow.summary || sequence.goal,
        outcome: "단계를 선택해 Problem, Concept, Action, Check를 확인합니다.",
      })),
    };
  }

  function currentScenario(sequence) {
    const workbench = normalizedWorkbench(sequence);
    return list(workbench.scenarios)[state.scenarioIndex] || list(workbench.scenarios)[0] || {};
  }

  function semanticDiagram(scenario) {
    const diagram = scenario && scenario.diagram;
    if (!diagram || !list(diagram.lanes).some((lane) => list(lane && lane.steps).length)) {
      return null;
    }
    return diagram;
  }

  function inferredIcon(actor, label) {
    const kind = String((actor && actor.kind) || "").toLowerCase();
    const value = String(label || "").toLowerCase();
    if (kind === "person" || /student|learner|developer|operator|사용자|학생/.test(value)) return "person";
    if (kind === "client" || /browser|client|postman|swagger/.test(value)) return "client";
    if (kind === "db" || /mysql|database|table/.test(value)) return "database";
    if (kind === "cache" || /redis|cache/.test(value)) return "cache";
    if (/repository/.test(value)) return "repository";
    if (/controller|api/.test(value)) return "api";
    if (/security|filter|validation|gate/.test(value)) return "security";
    if (/broker|rabbit/.test(value)) return "broker";
    if (/queue/.test(value)) return "queue";
    if (/test|assert/.test(value)) return "test";
    if (/docker|container|runtime/.test(value)) return "runtime";
    if (/artifact|jar|image/.test(value)) return "artifact";
    if (/service/.test(value)) return "service";
    return "service";
  }

  function diagramNode(sequence, nodeId) {
    const workbench = normalizedWorkbench(sequence);
    const catalog = workbench.nodes && typeof workbench.nodes === "object" ? workbench.nodes : {};
    const declared = catalog[nodeId];
    if (declared && typeof declared === "object") {
      return {
        id: nodeId,
        label: declared.label || nodeId,
        icon: declared.icon || inferredIcon(null, declared.label || nodeId),
        kind: declared.kind || "책임 주체",
        role: declared.role || "이 단계의 책임을 수행합니다.",
        boundary: declared.boundary || "System",
        codePointIds: list(declared.codePointIds),
      };
    }

    const actor = list(sequence.actors).find((item) => item && (item.id === nodeId || item.label === nodeId));
    const label = (actor && actor.label) || nodeId;
    return {
      id: nodeId,
      label,
      icon: inferredIcon(actor, label),
      kind: (actor && actor.kind) || "책임 주체",
      role: "이 단계의 책임을 수행합니다.",
      boundary: "System",
      codePointIds: [],
    };
  }

  function semanticSteps(sequence, scenario) {
    const diagram = semanticDiagram(scenario);
    if (!diagram) {
      return [];
    }

    const normalized = [];
    list(diagram.lanes).forEach((lane, laneIndex) => {
      list(lane && lane.steps).forEach((edge, laneStepIndex) => {
        if (!edge || !edge.from || !edge.to) {
          return;
        }
        const globalIndex = normalized.length;
        const fromNode = diagramNode(sequence, edge.from);
        const toNode = diagramNode(sequence, edge.to);
        const verb = edge.verb || edgeKindLabels[edge.kind] || "전달";
        const payload = edge.payload || "전달 단위 확인";
        const linkedCodePointIds = list(edge.codePointIds).length
          ? edge.codePointIds
          : toNode.codePointIds.length
            ? toNode.codePointIds
            : fromNode.codePointIds;
        normalized.push({
          ...edge,
          id: edge.id || `${scenario.id || "scenario"}-${lane.id || laneIndex}-${laneStepIndex}`,
          from: fromNode.label,
          to: toNode.label,
          owner: toNode.label,
          problem: edge.problem || scenario.prompt,
          concept: edge.concept || `${toNode.boundary} · ${toNode.role}`,
          action: edge.action || `${verb} · ${payload}`,
          check: edge.check || scenario.evidence,
          note: edge.note || lane.description,
          codePointIds: linkedCodePointIds,
          verb,
          payload,
          _laneId: lane.id || `lane-${laneIndex + 1}`,
          _laneLabel: lane.label || `경로 ${laneIndex + 1}`,
          _laneIndex: laneIndex,
          _laneStepIndex: laneStepIndex,
          _laneStepCount: list(lane.steps).length,
          _globalIndex: globalIndex,
        });
      });
    });
    return normalized;
  }

  function iconAssetHref(iconName) {
    const base = data.kind === "sequence" ? "../../assets/system-icons.svg" : "./assets/system-icons.svg";
    return `${base}#icon-${iconName || "service"}`;
  }

  function createSystemIcon(iconName, className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add(className || "system-icon");
    use.setAttribute("href", iconAssetHref(iconName));
    svg.appendChild(use);
    return svg;
  }

  function updateLiveStatus(message) {
    let status = document.getElementById("visual-lab-status");
    if (!status) {
      status = createElement("p", "sr-only");
      status.id = "visual-lab-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      document.body.appendChild(status);
    }
    status.textContent = message;
  }

  function scenarioRoute(sequence, scenario) {
    const route = list(scenario.route);
    if (route.length) {
      return route.map((item) => (typeof item === "string" ? { label: item } : item));
    }
    return deriveRoute(currentFlow(sequence)).map((label) => ({ label }));
  }

  function linkedCodePoints(sequence, step) {
    const ids = list(step.codePointIds);
    const points = list(sequence.codePoints);
    if (!ids.length) {
      return points.slice(0, 2);
    }
    return ids.map((id) => points.find((point) => point.id === id)).filter(Boolean);
  }

  function collectSourceLinks(sequence) {
    const links = [];
    const source = sequence.source || {};
    [
      ["이론 정리", source.theory],
      ["구현 안내", source.implementation],
      ["체크리스트", source.checklist],
    ].forEach(([label, href]) => {
      if (href) {
        links.push({ label, href });
      }
    });
    [...list(sequence.sourceDocs), ...list(sequence.relatedDocs)].forEach((item) => {
      if (item && item.label && item.href) {
        links.push(item);
      }
    });
    const seen = new Set();
    return links.filter((item) => {
      const key = `${item.label}:${item.href}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function clearPlaybackTimer() {
    if (state.timerId) {
      window.clearTimeout(state.timerId);
      state.timerId = 0;
    }
  }

  function schedulePlayback(sequence) {
    clearPlaybackTimer();
    const steps = currentSteps(sequence);
    const lane = currentLaneContext(sequence);
    if (!state.isPlaying || motionQuery.matches || lane.length <= 1) {
      return;
    }
    state.timerId = window.setTimeout(() => {
      const activeElement = document.activeElement;
      const activeFocusKey = activeElement && activeElement.dataset
        ? activeElement.dataset.focusKey
        : "";
      if (activeFocusKey !== "play") {
        state.isPlaying = false;
        const playControl = document.querySelector('[data-focus-key="play"]');
        if (playControl) {
          playControl.textContent = "재생";
          playControl.setAttribute("aria-pressed", "false");
        }
        return;
      }
      if (state.stepIndex >= lane.end) {
        state.isPlaying = false;
        render({ focusKey: activeFocusKey });
        return;
      }
      state.stepIndex += 1;
      render({ focusKey: activeFocusKey });
    }, playbackSpeeds[state.speedIndex].ms);
  }

  function renderTopbar(root, sequence) {
    const header = createElement("header", "context-bar");
    const inner = createElement("div", "context-bar__inner");
    const homeHref = data.kind === "sequence" ? "../../index.html" : "./index.html";
    const brand = makeLink("A&I Backend · Visual Lab", homeHref, "brand-mark");
    const context = createElement("div", "context-meta");
    const repoName = (data.repo && data.repo.name) || data.title || "Topic Repository";
    context.append(
      createElement("span", "context-meta__repo", repoName),
      createElement("span", "context-meta__mode", sequence ? `Sequence ${sequence.id}` : "학습 경로")
    );
    inner.append(brand, context);
    header.appendChild(inner);
    root.appendChild(header);
  }

  function renderHub(root) {
    renderTopbar(root, null);
    const main = createElement("main", "hub-shell");
    main.id = "main-content";

    const intro = createElement("header", "hub-intro");
    intro.append(
      createElement("p", "eyebrow", "Repository learning path"),
      createElement("h1", "hub-title", data.title || "A&I Backend Visual Lab"),
      createElement("p", "hub-description", data.description || "시퀀스를 선택해 실제 시스템 흐름을 관찰합니다.")
    );
    const job = createElement("p", "hub-job", "질문을 선택하고, 시스템 경로를 관찰하고, 다음 판단으로 이동하세요.");
    intro.appendChild(job);
    main.appendChild(intro);

    const journey = createElement("ol", "journey-list");
    list(data.sequences).forEach((sequence) => {
      const item = createElement("li", "journey-item");
      const link = makeLink("", sequence.href || `./sequences/${sequence.sequence || sequence.id}/index.html`, "journey-link");
      const identity = createElement("div", "journey-identity");
      identity.append(
        createElement("span", "sequence-index", sequence.sequence || sequence.id),
        createElement("span", "journey-topic", sequence.topic || "Backend sequence")
      );
      const copy = createElement("div", "journey-copy");
      copy.append(
        createElement("h2", "", sequence.title || "Visual Lab"),
        createElement("p", "", sequence.summary || sequence.goal || "핵심 흐름을 확인합니다.")
      );
      link.append(identity, copy, createElement("span", "journey-action", "학습 시작 →"));
      item.appendChild(link);
      journey.appendChild(item);
    });
    main.appendChild(journey.childNodes.length ? journey : createElement("p", "empty-state", "연결된 시퀀스가 없습니다. 허브 데이터를 확인하세요."));
    root.appendChild(main);
  }

  function renderHero(main, sequence) {
    const hero = createElement("header", "sequence-hero");
    hero.id = "question";
    const identity = createElement("div", "sequence-identity");
    identity.append(
      createElement("span", "sequence-index sequence-index--large", sequence.id),
      createElement("div", "sequence-name")
    );
    const name = identity.querySelector(".sequence-name");
    name.append(
      createElement("p", "eyebrow", sequence.subtitle || sequence.topic || "Backend sequence"),
      createElement("p", "sequence-title", sequence.title || "Visual Lab")
    );

    const thesis = createElement("div", "sequence-thesis");
    thesis.append(
      createElement("p", "thesis-label", "이번 시퀀스의 질문"),
      createElement("h1", "", sequence.question || sequence.problem || sequence.title),
      createElement("p", "sequence-goal", sequence.goal || "핵심 흐름을 단계별로 확인합니다.")
    );
    hero.append(identity, thesis);
    main.appendChild(hero);
  }

  function renderLearningNav(main) {
    const nav = createElement("nav", "learning-nav");
    nav.setAttribute("aria-label", "학습 판단 단계");
    [
      ["question", "질문"],
      ["lab", "관찰"],
      ["evidence", "개념·코드"],
      ["verify", "검증"],
      ["next", "다음 질문"],
    ].forEach(([id, label], index) => {
      const link = makeLink(label, `#${id}`, "learning-nav__link");
      link.dataset.sectionLink = id;
      if (index === 0) {
        link.setAttribute("aria-current", "location");
      }
      nav.appendChild(link);
    });
    main.appendChild(nav);
  }

  function routeState(index, routeLength, scenario, stepLength) {
    if (Number.isInteger(scenario.stopAfter) && index > scenario.stopAfter) {
      return "blocked";
    }
    const mappedActiveIndex = stepLength <= 1
      ? Math.max(routeLength - 1, 0)
      : Math.round((state.stepIndex / (stepLength - 1)) * Math.max(routeLength - 1, 0));
    const reachableLastIndex = Number.isInteger(scenario.stopAfter)
      ? Math.min(scenario.stopAfter, Math.max(routeLength - 1, 0))
      : Math.max(routeLength - 1, 0);
    const activeIndex = Math.min(mappedActiveIndex, reachableLastIndex);
    if (index < activeIndex) {
      return "passed";
    }
    if (index === activeIndex) {
      return "active";
    }
    return "pending";
  }

  function routeStateLabel(routeStateName) {
    return {
      passed: "지남",
      active: "현재 관찰",
      pending: "다음",
      blocked: "도달하지 않음",
      available: "선택 가능",
    }[routeStateName];
  }

  function semanticStepState(index, laneId, activeStep) {
    if (activeStep._laneId && activeStep._laneId !== laneId) {
      return "available";
    }
    if (index < state.stepIndex) {
      return "passed";
    }
    if (index === state.stepIndex) {
      return "active";
    }
    return "pending";
  }

  function renderSemanticNode(sequence, nodeId, position) {
    const node = diagramNode(sequence, nodeId);
    const card = createElement("div", "semantic-node");
    card.dataset.position = position;
    card.dataset.kind = String(node.kind || "actor").toLowerCase().replace(/[^a-z0-9-]+/g, "-");

    const iconWrap = createElement("span", "semantic-node__icon");
    iconWrap.appendChild(createSystemIcon(node.icon));
    const identity = createElement("span", "semantic-node__identity");
    identity.append(
      createElement("strong", "semantic-node__label", node.label),
      createElement("span", "semantic-node__kind", node.kind)
    );
    const heading = createElement("span", "semantic-node__heading");
    heading.append(iconWrap, identity);
    card.append(
      heading,
      createElement("span", "semantic-node__role", node.role),
      createElement("span", "semantic-node__boundary", `책임 경계 · ${node.boundary}`)
    );
    return card;
  }

  function renderSemanticLegend() {
    const legend = createElement("div", "diagram-legend");
    legend.setAttribute("aria-label", "다이어그램 읽는 법");
    const items = [
      ["service", "책임 주체", "아이콘 상자는 실제로 행동하는 주체입니다."],
      ["event", "동작 · 전달물", "화살표는 방향, 동사, 이동 데이터를 함께 보여줍니다."],
      ["gate", "책임 경계", "주체 아래 표시는 판단이 일어나는 시스템 경계입니다."],
    ];
    items.forEach(([icon, label, description]) => {
      const item = createElement("div", "diagram-legend__item");
      const iconWrap = createElement("span", "diagram-legend__icon");
      iconWrap.appendChild(createSystemIcon(icon));
      const copy = createElement("span", "diagram-legend__copy");
      copy.append(createElement("strong", "", label), createElement("span", "", description));
      item.append(iconWrap, copy);
      legend.appendChild(item);
    });
    return legend;
  }

  function renderSemanticDiagram(sequence, scenario) {
    const diagram = semanticDiagram(scenario);
    const activeStep = currentStep(sequence);
    const figure = createElement("figure", "semantic-diagram");
    figure.setAttribute("aria-label", "선택한 조건의 의미 기반 시스템 경로");

    const reading = createElement("figcaption", "diagram-reading");
    reading.append(
      createElement("span", "diagram-reading__label", "한 문장으로 읽기"),
      createElement("strong", "diagram-reading__text", diagram.caption)
    );
    figure.append(reading, renderSemanticLegend());

    const lanes = createElement("div", "diagram-lanes");
    let globalIndex = 0;
    list(diagram.lanes).forEach((lane, laneIndex) => {
      const laneSection = createElement("section", "diagram-lane");
      const laneHeadingId = `diagram-lane-${scenario.id || state.scenarioIndex}-${lane.id || laneIndex}`;
      laneSection.setAttribute("aria-labelledby", laneHeadingId);
      const header = createElement("header", "diagram-lane__header");
      const laneTitle = createElement("h4", "", lane.label || `경로 ${laneIndex + 1}`);
      laneTitle.id = laneHeadingId;
      header.append(laneTitle, createElement("p", "", lane.description || "이 경로에서 전달되는 책임과 데이터를 확인합니다."));
      laneSection.appendChild(header);

      const flow = createElement("ol", "semantic-flow");
      list(lane.steps).forEach((edge) => {
        const edgeIndex = globalIndex;
        const laneId = lane.id || `lane-${laneIndex + 1}`;
        const edgeState = semanticStepState(edgeIndex, laneId, activeStep);
        const fromNode = diagramNode(sequence, edge.from);
        const toNode = diagramNode(sequence, edge.to);
        const transition = createElement("li", "semantic-transition");
        transition.dataset.state = edgeState;
        transition.dataset.kind = edge.kind || "call";

        const edgeButton = createElement("button", "semantic-edge");
        edgeButton.type = "button";
        edgeButton.dataset.focusKey = `diagram-step-${edgeIndex}`;
        edgeButton.setAttribute(
          "aria-label",
          `${fromNode.label}에서 ${toNode.label}로 ${edge.verb}: ${edge.payload}. ${routeStateLabel(edgeState)}`
        );
        if (edgeState === "active") {
          edgeButton.setAttribute("aria-current", "step");
        }
        const edgeHead = createElement("span", "semantic-edge__head");
        edgeHead.append(
          createElement("strong", "semantic-edge__verb", edge.verb || edgeKindLabels[edge.kind] || "전달"),
          createElement("span", "semantic-edge__kind", edgeKindLabels[edge.kind] || "전달")
        );
        const direction = createElement("span", "semantic-edge__direction");
        direction.setAttribute("aria-hidden", "true");
        edgeButton.append(
          edgeHead,
          createElement("code", "semantic-edge__payload", edge.payload || "전달 단위 확인"),
          direction,
          createElement("span", "semantic-edge__state", routeStateLabel(edgeState))
        );
        edgeButton.addEventListener("click", () => {
          state.stepIndex = edgeIndex;
          state.isPlaying = false;
          render({ focusKey: `diagram-step-${edgeIndex}` });
        });

        transition.append(
          renderSemanticNode(sequence, edge.from, "from"),
          edgeButton,
          renderSemanticNode(sequence, edge.to, "to")
        );
        flow.appendChild(transition);
        globalIndex += 1;
      });
      laneSection.appendChild(flow);
      lanes.appendChild(laneSection);
    });
    figure.appendChild(lanes);

    if (list(diagram.notReached).length) {
      const notReached = createElement("aside", "not-reached");
      notReached.appendChild(createElement("h4", "", "이 조건에서 실행되지 않는 경로"));
      const items = createElement("ul", "not-reached__list");
      list(diagram.notReached).forEach((item) => {
        const row = createElement("li", "not-reached__item");
        row.append(createElement("strong", "", item.label), createElement("span", "", item.reason));
        items.appendChild(row);
      });
      notReached.appendChild(items);
      figure.appendChild(notReached);
    }
    return figure;
  }

  function renderWorkbench(main, sequence) {
    const workbench = normalizedWorkbench(sequence);
    const scenario = currentScenario(sequence);
    const flow = currentFlow(sequence);
    const steps = currentSteps(sequence);
    const route = scenarioRoute(sequence, scenario);
    const diagram = semanticDiagram(scenario);

    document.body.dataset.labKind = workbench.kind || "trace";

    const section = createElement("section", "lab-section");
    section.id = "lab";
    const heading = createElement("header", "section-heading section-heading--lab");
    heading.append(
      createElement("p", "eyebrow", kindLabels[workbench.kind] || kindLabels.trace),
      createElement("h2", "", workbench.title || "학습 신호 추적"),
      createElement("p", "section-lede", workbench.instruction || "조건을 선택하고 시스템 경로를 관찰하세요.")
    );
    section.appendChild(heading);

    const scenarioFieldset = createElement("fieldset", "scenario-selector");
    scenarioFieldset.appendChild(createElement("legend", "scenario-selector__legend", "관찰 조건 선택"));
    const scenarioButtons = createElement("div", "scenario-selector__buttons");
    list(workbench.scenarios).forEach((item, index) => {
      const button = createElement("button", "scenario-button", item.label || `조건 ${index + 1}`);
      button.type = "button";
      button.dataset.focusKey = `scenario-${index}`;
      button.setAttribute("aria-pressed", String(index === state.scenarioIndex));
      if (index === state.scenarioIndex) {
        button.classList.add("is-active");
      }
      button.addEventListener("click", () => {
        state.scenarioIndex = index;
        state.flowIndex = flowIndexById(sequence, item.flowId);
        state.stepIndex = 0;
        state.isPlaying = false;
        render({ focusKey: `scenario-${index}` });
      });
      scenarioButtons.appendChild(button);
    });
    scenarioFieldset.appendChild(scenarioButtons);
    section.appendChild(scenarioFieldset);

    const stage = createElement("div", `workbench workbench--${workbench.kind || "trace"}`);
    stage.dataset.tone = scenario.tone || "signal";
    const stageHeader = createElement("div", "workbench__header");
    const stageTitle = createElement("div", "workbench__title");
    stageTitle.append(
      createElement("span", `status-label status-label--${scenario.tone || "signal"}`, toneLabels[scenario.tone] || toneLabels.signal),
      createElement("h3", "", scenario.label || flow.title || "현재 흐름")
    );
    stageHeader.append(stageTitle, createElement("p", "workbench__prompt", scenario.prompt || flow.summary || sequence.problem));
    stage.appendChild(stageHeader);

    if (diagram) {
      stage.appendChild(renderSemanticDiagram(sequence, scenario));
    } else {
      const traceWrap = createElement("div", "signal-trace-wrap");
      traceWrap.setAttribute("aria-label", "선택한 조건의 시스템 경로");
      const trace = createElement("ol", "signal-trace");
      route.forEach((routeItem, index) => {
        const item = createElement("li", "signal-node");
        const stateName = routeState(index, route.length, scenario, steps.length);
        item.dataset.state = stateName;
        const button = createElement("button", "signal-node__button");
        button.type = "button";
        button.dataset.focusKey = `route-${index}`;
        button.disabled = stateName === "blocked" || steps.length === 0;
        button.setAttribute("aria-label", `${routeItem.label}: ${routeStateLabel(stateName)}`);
        if (stateName === "active") {
          button.setAttribute("aria-current", "step");
        }
        button.append(
          createElement("span", "signal-node__index", String(index + 1).padStart(2, "0")),
          createElement("strong", "signal-node__label", routeItem.label),
          createElement("span", "signal-node__state", routeStateLabel(stateName))
        );
        button.addEventListener("click", () => {
          const mappedStep = route.length <= 1
            ? 0
            : Math.round((index / (route.length - 1)) * Math.max(steps.length - 1, 0));
          state.stepIndex = Math.max(0, Math.min(steps.length - 1, mappedStep));
          state.isPlaying = false;
          render({ focusKey: `route-${index}` });
        });
        item.appendChild(button);
        trace.appendChild(item);
      });
      traceWrap.appendChild(trace);
      stage.appendChild(traceWrap);
    }

    if (!diagram && list(scenario.fanOut).length) {
      const fanOut = createElement("div", "fanout-board");
      fanOut.appendChild(createElement("p", "fanout-board__label", "Broadcast recipients"));
      const recipients = createElement("div", "fanout-board__recipients");
      list(scenario.fanOut).forEach((recipient) => recipients.appendChild(createElement("span", "fanout-recipient", recipient)));
      fanOut.appendChild(recipients);
      stage.appendChild(fanOut);
    }

    const snapshot = createElement("dl", "state-snapshot");
    list(scenario.snapshot).forEach((item) => {
      const card = createElement("div", `state-snapshot__item state-snapshot__item--${item.tone || "neutral"}`);
      card.append(createElement("dt", "", item.label), createElement("dd", "", item.value));
      snapshot.appendChild(card);
    });
    if (snapshot.childNodes.length) {
      stage.appendChild(snapshot);
    }

    const outcome = createElement("div", "outcome-panel");
    const evidence = createElement("div", "outcome-panel__item");
    evidence.append(createElement("span", "outcome-label", "관찰 증거"), createElement("p", "", scenario.evidence || flow.summary || "현재 경로를 확인하세요."));
    const decision = createElement("div", "outcome-panel__item");
    decision.append(createElement("span", "outcome-label", "판단"), createElement("p", "", scenario.outcome || "선택한 단계의 확인 지점을 설명해보세요."));
    outcome.append(evidence, decision);
    stage.appendChild(outcome);

    const controls = createElement("div", "trace-controls");
    const lane = currentLaneContext(sequence);
    const previousStep = steps[state.stepIndex - 1] || {};
    const nextStep = steps[state.stepIndex + 1] || {};
    const previousLabel = diagram && state.stepIndex > 0 && lane.index === 0
      ? `← 이전 경로: ${previousStep._laneLabel || "이전 경로"}`
      : "← 이전 단계";
    const nextLabel = diagram && state.stepIndex < steps.length - 1 && lane.index === lane.length - 1
      ? `다음 경로: ${nextStep._laneLabel || "다음 경로"} →`
      : "다음 단계 →";
    const previous = createElement("button", "control-button", previousLabel);
    previous.type = "button";
    previous.dataset.focusKey = "previous";
    previous.disabled = state.stepIndex === 0 || steps.length === 0;
    previous.addEventListener("click", () => {
      state.stepIndex = Math.max(0, state.stepIndex - 1);
      state.isPlaying = false;
      render({ focusKey: state.stepIndex === 0 ? "next-step" : "previous" });
    });

    const progressWrap = createElement("div", "trace-progress");
    const progress = createElement("progress", "trace-progress__bar");
    progress.max = Math.max(lane.length, 1);
    progress.value = lane.length ? lane.index + 1 : 0;
    progress.setAttribute("aria-label", `${lane.label}, 현재 단계 ${lane.length ? lane.index + 1 : 0} / ${lane.length}`);
    progressWrap.append(
      progress,
      createElement("span", "trace-progress__text", `${lane.label} · ${lane.length ? lane.index + 1 : 0} / ${lane.length}`)
    );

    const play = createElement("button", "control-button", motionQuery.matches ? "모션 감소: 수동" : state.isPlaying ? "일시정지" : "재생");
    play.type = "button";
    play.dataset.focusKey = "play";
    play.disabled = lane.length <= 1 || motionQuery.matches;
    play.setAttribute("aria-pressed", String(state.isPlaying));
    play.addEventListener("click", () => {
      if (!state.isPlaying && state.stepIndex >= lane.end) {
        state.stepIndex = lane.start;
      }
      state.isPlaying = !state.isPlaying;
      render({ focusKey: "play" });
    });

    const speed = createElement("button", "control-button control-button--quiet", `속도 ${playbackSpeeds[state.speedIndex].label}`);
    speed.type = "button";
    speed.dataset.focusKey = "speed";
    speed.disabled = lane.length <= 1 || motionQuery.matches;
    speed.addEventListener("click", () => {
      state.speedIndex = (state.speedIndex + 1) % playbackSpeeds.length;
      render({ focusKey: "speed" });
    });

    const next = createElement("button", "control-button", nextLabel);
    next.type = "button";
    next.dataset.focusKey = "next-step";
    next.disabled = state.stepIndex >= steps.length - 1 || steps.length === 0;
    next.addEventListener("click", () => {
      state.stepIndex = Math.min(steps.length - 1, state.stepIndex + 1);
      state.isPlaying = false;
      render({ focusKey: state.stepIndex >= steps.length - 1 ? "previous" : "next-step" });
    });

    controls.append(previous, progressWrap, play, speed, next);
    stage.appendChild(controls);
    const selectedStep = currentStep(sequence);
    const statusMessage = selectedStep._laneId
      ? `${scenario.label || "현재 조건"}, ${selectedStep._laneLabel}, ${selectedStep.from}에서 ${selectedStep.to}로 ${selectedStep.verb}: ${selectedStep.payload}`
      : `${scenario.label || "현재 조건"}: ${scenario.outcome || "경로가 갱신되었습니다."}`;
    updateLiveStatus(statusMessage);
    section.appendChild(stage);
    main.appendChild(section);
  }

  function renderCodePoint(point) {
    const article = createElement("article", "code-evidence");
    const header = createElement("header", "code-evidence__header");
    header.append(
      createElement("h3", "", point.title || "코드 포인트"),
      createElement("code", "file-path", point.file || "파일 경로 확인")
    );
    article.appendChild(header);
    if (point.snippet || point.example) {
      const pre = createElement("pre", "code-block");
      pre.appendChild(createElement("code", "", point.snippet || point.example));
      article.appendChild(pre);
    }
    appendText(article, "p", "code-explanation", point.explanation || point.body);
    appendText(article, "p", "code-check", point.check ? `확인: ${point.check}` : "");
    if (point.sourceUrl) {
      const source = makeLink("이 코드 위치 열기 ↗", point.sourceUrl, "text-link");
      source.target = "_blank";
      source.rel = "noreferrer";
      article.appendChild(source);
    }
    return article;
  }

  function renderEvidence(main, sequence) {
    const step = currentStep(sequence);
    const section = createElement("section", "evidence-section");
    section.id = "evidence";
    const heading = createElement("header", "section-heading");
    heading.append(
      createElement("p", "eyebrow", "Selected evidence"),
      createElement("h2", "", "선택한 단계의 개념과 코드"),
      createElement("p", "section-lede", "현재 경로에서 무엇을 관찰했고 어느 책임을 확인해야 하는지 연결합니다.")
    );
    section.appendChild(heading);

    const layout = createElement("div", "evidence-layout");
    const primary = createElement("article", "step-evidence");
    const stepMeta = step._laneId
      ? `${step._laneLabel} · Step ${step._laneStepIndex + 1} / ${step._laneStepCount}`
      : `Step ${currentSteps(sequence).length ? state.stepIndex + 1 : 0}`;
    primary.append(
      createElement("p", "step-evidence__meta", stepMeta),
      createElement("h3", "", step.action || step.message || step.owner || "단계 정보를 확인하세요.")
    );
    appendText(primary, "p", "step-note", step.note);
    const fields = createElement("dl", "evidence-fields");
    [
      ["관찰", step.problem || step.input],
      ["개념", step.concept || step.owner],
      ["행동", step.action || step.message],
      ["확인", step.check || step.output],
    ].forEach(([label, value]) => {
      const field = createElement("div", "evidence-field");
      field.append(createElement("dt", "", label), createElement("dd", "", value || "이 단계의 데이터를 확인하세요."));
      fields.appendChild(field);
    });
    primary.appendChild(fields);

    const context = createElement("aside", "context-drawer");
    context.appendChild(createElement("h3", "", "책임과 개념"));
    const owner = String(step.owner || step.to || step.concept || "").toLowerCase();
    const responsibility = list(sequence.responsibilities).find((item) => owner.includes(String(item.name || "").toLowerCase())) || list(sequence.responsibilities)[0];
    if (responsibility) {
      const block = createElement("div", "context-block");
      block.append(createElement("span", "context-label", responsibility.name), createElement("p", "", responsibility.role || ""));
      appendText(block, "p", "context-caution", responsibility.caution);
      context.appendChild(block);
    }
    list(sequence.concepts).slice(0, 2).forEach((concept) => {
      const block = createElement("div", "context-block");
      block.append(createElement("span", "context-label", concept.title || concept.name), createElement("p", "", concept.body || concept.description || ""));
      context.appendChild(block);
    });
    layout.append(primary, context);
    section.appendChild(layout);

    const codePoints = linkedCodePoints(sequence, step);
    const codeGrid = createElement("div", "code-evidence-grid");
    codePoints.forEach((point) => codeGrid.appendChild(renderCodePoint(point)));
    section.appendChild(codeGrid.childNodes.length ? codeGrid : createElement("p", "empty-state", "이 단계에 연결된 코드 포인트가 없습니다. 데이터의 codePointIds를 확인하세요."));

    const referenceDetails = createElement("details", "reference-shelf");
    referenceDetails.appendChild(createElement("summary", "", "용어·범위·관련 문서 펼치기"));
    const referenceBody = createElement("div", "reference-shelf__body");
    const glossary = createElement("dl", "glossary-list");
    list(sequence.glossary).forEach((item) => {
      const entry = createElement("div", "glossary-entry");
      entry.append(createElement("dt", "", item.term), createElement("dd", "", item.meaning));
      appendText(entry, "p", "context-caution", item.caution);
      glossary.appendChild(entry);
    });
    referenceBody.appendChild(glossary.childNodes.length ? glossary : createElement("p", "empty-state", "추가 용어가 없습니다."));

    const practical = createElement("div", "scope-notes");
    list(sequence.practical).forEach((item) => {
      const note = createElement("article", "scope-note");
      note.append(createElement("h3", "", item.title), createElement("p", "", item.body));
      practical.appendChild(note);
    });
    if (practical.childNodes.length) {
      referenceBody.appendChild(practical);
    }

    const links = createElement("nav", "source-links");
    links.setAttribute("aria-label", "관련 학습 문서");
    collectSourceLinks(sequence).forEach((item) => {
      const link = makeLink(`${item.label} ↗`, item.href, "source-link");
      link.target = "_blank";
      link.rel = "noreferrer";
      links.appendChild(link);
    });
    if (links.childNodes.length) {
      referenceBody.appendChild(links);
    }
    referenceDetails.appendChild(referenceBody);
    section.appendChild(referenceDetails);
    main.appendChild(section);
  }

  function renderVerification(main, sequence) {
    const section = createElement("section", "verification-section");
    section.id = "verify";
    const checks = list(sequence.checks).length ? sequence.checks : list(sequence.practice);
    const heading = createElement("header", "section-heading");
    heading.append(
      createElement("p", "eyebrow", "Verification"),
      createElement("h2", "", "말로 설명할 수 있는지 확인하세요"),
      createElement("p", "section-lede", "체크 상태는 현재 페이지에서만 유지되며 정답을 대신하지 않습니다.")
    );
    section.appendChild(heading);

    const status = createElement("div", "verification-status");
    const progress = createElement("progress", "verification-progress");
    progress.max = Math.max(checks.length, 1);
    progress.value = state.checked.size;
    progress.setAttribute("aria-label", `확인 완료 ${state.checked.size} / ${checks.length}`);
    status.append(progress, createElement("span", "verification-count", `${state.checked.size} / ${checks.length} 확인`));
    section.appendChild(status);

    const listElement = createElement("ul", "verification-list");
    checks.forEach((check, index) => {
      const item = createElement("li", "verification-item");
      const input = createElement("input", "verification-checkbox");
      input.type = "checkbox";
      input.id = `verification-${index}`;
      input.checked = state.checked.has(index);
      const label = createElement("label", "verification-label", check);
      label.htmlFor = input.id;
      input.addEventListener("change", () => {
        if (input.checked) {
          state.checked.add(index);
        } else {
          state.checked.delete(index);
        }
        progress.value = state.checked.size;
        status.querySelector(".verification-count").textContent = `${state.checked.size} / ${checks.length} 확인`;
      });
      item.append(input, label);
      listElement.appendChild(item);
    });
    section.appendChild(listElement.childNodes.length ? listElement : createElement("p", "empty-state", "확인 질문이 없습니다. 시퀀스 데이터를 확인하세요."));
    main.appendChild(section);
  }

  function localNextHref(sequence) {
    const current = Number(sequence.id);
    const next = Number(sequence.next && sequence.next.id);
    const repoName = sequence.repo && sequence.repo.name;
    const sameRepo =
      (repoName === "spring-boot-db-access-lab" && current >= 2 && current <= 5 && next >= 3 && next <= 6) ||
      (repoName === "spring-boot-deployment-runtime-lab" && current === 9 && next === 10);
    return sameRepo ? `../${String(next).padStart(2, "0")}/index.html` : "../../index.html";
  }

  function renderNext(main, sequence) {
    const nextData = sequence.next || {};
    const section = createElement("section", "next-question");
    section.id = "next";
    const copy = createElement("div", "next-question__copy");
    copy.append(
      createElement("p", "eyebrow", "Next question"),
      createElement("h2", "", nextData.id && nextData.title ? `${nextData.id} ${nextData.title}` : "다음 학습으로 연결"),
      createElement("p", "", nextData.reason || "이번 흐름의 확인 질문을 마치고 다음 시퀀스로 이동하세요.")
    );
    const sameRepoLink = localNextHref(sequence);
    const actionLabel = sameRepoLink === "../../index.html" ? "이 저장소 학습 경로로 돌아가기" : "다음 질문 열기";
    section.append(copy, makeLink(`${actionLabel} →`, sameRepoLink, "next-action"));
    main.appendChild(section);
  }

  function setupSectionObserver() {
    if (sectionObserver) {
      sectionObserver.disconnect();
    }
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const links = [...document.querySelectorAll("[data-section-link]")];
    const sections = links.map((link) => document.getElementById(link.dataset.sectionLink)).filter(Boolean);
    sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) {
          return;
        }
        links.forEach((link) => {
          if (link.dataset.sectionLink === visible.target.id) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      { rootMargin: "-20% 0px -65%", threshold: [0.1, 0.4, 0.7] }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  function renderSequence(root, sequence) {
    document.title = `${sequence.id} ${sequence.title} | ${(sequence.repo && sequence.repo.name) || "A&I Backend"} Visual Lab`;
    renderTopbar(root, sequence);
    const main = createElement("main", "sequence-shell");
    main.id = "main-content";
    renderHero(main, sequence);
    renderLearningNav(main);
    renderWorkbench(main, sequence);
    renderEvidence(main, sequence);
    renderVerification(main, sequence);
    renderNext(main, sequence);
    root.appendChild(main);
    window.requestAnimationFrame(setupSectionObserver);
  }

  function render(options) {
    clearPlaybackTimer();
    const focusKey = options && options.focusKey;
    app.replaceChildren();
    const skip = makeLink("본문으로 건너뛰기", "#main-content", "skip-link");
    app.appendChild(skip);

    if (data.kind === "hub") {
      renderHub(app);
      return;
    }

    const sequence = currentSequence();
    if (!sequence) {
      const error = createElement("main", "fatal-state");
      error.id = "main-content";
      error.append(
        createElement("h1", "", "Visual Lab 데이터를 읽지 못했습니다"),
        createElement("p", "", "visual-lab-data.js가 먼저 로드되고 kind 값이 올바른지 확인하세요.")
      );
      app.appendChild(error);
      return;
    }

    const workbench = normalizedWorkbench(sequence);
    const scenarios = list(workbench.scenarios);
    state.scenarioIndex = Math.min(state.scenarioIndex, Math.max(scenarios.length - 1, 0));
    const scenario = currentScenario(sequence);
    state.flowIndex = flowIndexById(sequence, scenario.flowId);
    const steps = currentSteps(sequence);
    state.stepIndex = Math.min(state.stepIndex, Math.max(steps.length - 1, 0));

    renderSequence(app, sequence);
    schedulePlayback(sequence);

    if (focusKey) {
      window.requestAnimationFrame(() => {
        const target = document.querySelector(`[data-focus-key="${focusKey}"]`);
        if (target && !target.disabled) {
          target.focus();
        }
      });
    }
  }

  motionQuery.addEventListener("change", () => {
    state.isPlaying = false;
    render();
  });
  window.addEventListener("beforeunload", clearPlaybackTimer);
  render();
})();
