import test from "node:test";
import assert from "node:assert/strict";
import {
  renderLocalCodeMapFragments,
} from "../src/services/htmlLocalCodeMap";
import type { LocalCodeMapData } from "../src/services/localCodeMapData";

const data: LocalCodeMapData = {
  projectName: "Example",
  summary: {
    files: 2,
    lines: 92,
    describedFiles: 2,
    undocumentedFiles: 0,
    symbols: 5,
    exports: 2,
    internalDependencies: 1,
    externalDependencies: 1,
    todos: 1,
    languages: [
      { name: "typescript", files: 2, lines: 92 },
    ],
    entryPoints: ["src/extension.ts"],
    externalDependencyNames: ["vscode"],
  },
  files: [
    {
      path: "src/extension.ts",
      module: "src",
      language: "typescript",
      lines: 12,
      description: "Extension entry point",
      descriptionSource: "readme",
      exports: [{ name: "activate", kind: "function", line: 3 }],
      internalSymbols: [
        { name: "normalizeActivation", kind: "function", line: 7 },
      ],
      todos: [{ line: 9, text: "TODO: add smoke coverage" }],
      environmentVariables: [],
      uses: ["src/services/run.ts"],
      usedBy: [],
      entryPoint: true,
    },
    {
      path: "src/services/run.ts",
      module: "src/services",
      language: "typescript",
      lines: 80,
      description: "Runs the Local pipeline",
      descriptionSource: "declaration-comment",
      exports: [{ name: "run", kind: "function", line: 10 }],
      internalSymbols: [],
      todos: [],
      environmentVariables: ["API_TOKEN"],
      uses: [],
      usedBy: ["src/extension.ts"],
      entryPoint: false,
    },
  ],
  modules: [
    {
      name: "src",
      primaryFilePaths: ["src/extension.ts"],
      files: 1,
      lines: 12,
    },
    {
      name: "src/services",
      description: "Documentation services",
      descriptionSource: "readme",
      primaryFilePaths: ["src/services/run.ts"],
      files: 1,
      lines: 80,
    },
  ],
  edges: [{ from: "src", to: "src/services", count: 1 }],
  readingPath: [
    { path: "src/extension.ts", reason: "Detected project entry point." },
    {
      path: "src/services/run.ts",
      reason: "Imported by src/extension.ts.",
    },
  ],
  referencedEnvironmentVariables: ["API_TOKEN", "LOG_LEVEL"],
  gettingStarted: {
    packageJsonPath: "package.json",
    packageManager: "npm",
    extensionEntry: "./dist/extension.js",
    scripts: [
      {
        name: "compile",
        run: "npm run compile",
        command: "tsc --noEmit",
      },
      {
        name: "test",
        run: "npm run test",
        command: "node --test",
      },
    ],
    vscodeCommands: [
      { id: "documint.generate", title: "Generate Documentation" },
    ],
    vscodeSettings: [
      { key: "documint.generationMode", defaultValue: "local" },
    ],
    makefile: {
      path: "Makefile",
      targets: [{ name: "verify" }],
    },
    dockerfile: {
      path: "Dockerfile",
      baseImages: ["node:22-alpine"],
      stages: ["runtime"],
      exposedPorts: ["3000"],
      command: '["node","dist/server.js"]',
    },
  },
};

test("Local code map exposes question-first interactive surfaces without external assets", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /At a glance/);
  assert.match(fragments.markup, /What is this project made of\?/);
  assert.match(fragments.markup, /Big picture/);
  assert.match(fragments.markup, /How do the parts fit together\?/);
  assert.match(fragments.markup, /How to run/);
  assert.match(fragments.markup, /How do I build, test, or start this project\?/);
  assert.match(fragments.markup, /What's inside/);
  assert.match(fragments.markup, /Start here/);
  assert.match(fragments.markup, /Dependency reach/);
  assert.match(fragments.markup, /Look up a file/);
  assert.match(fragments.styles, /local-map-treemap/);
  assert.match(fragments.script, /src\\u002fextension|src\/extension\.ts/);
  const executableMarkup = fragments.markup + fragments.script;
  assert.doesNotMatch(
    executableMarkup,
    /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i,
  );
  assert.doesNotMatch(
    fragments.script,
    /\b(?:fetch|XMLHttpRequest)\b[\s\S]{0,120}https?:\/\//i,
  );
});

test("Local project map exposes accessible in-map section navigation and current-location state", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /id="localMapNav"/);
  assert.match(fragments.markup, /aria-label="Project map sections"/);
  assert.match(fragments.markup, /href="#localMapOverviewSection"/);
  assert.match(fragments.markup, /href="#localMapBigSection"/);
  assert.match(fragments.markup, /href="#localMapRuntimeSection"/);
  assert.match(fragments.markup, /href="#localMapRunSection"/);
  assert.match(fragments.markup, /href="#localMapInterfacesSection"/);
  assert.match(fragments.markup, /href="#localMapSizeSection"/);
  assert.match(fragments.markup, /href="#localMapReadSection"/);
  assert.match(fragments.markup, /href="#localMapReachSection"/);
  assert.match(fragments.markup, /href="#localMapVerificationSection"/);
  assert.match(fragments.markup, /href="#localMapLookupSection"/);
  assert.match(fragments.script, /function initSectionNav/);
  assert.match(fragments.script, /aria-current/);
  assert.match(fragments.script, /IntersectionObserver/);
  assert.match(fragments.script, /runNav\.hidden = cards === 0/);
  assert.match(fragments.styles, /\.local-map-nav/);
  assert.match(fragments.styles, /overflow-x: auto/);
  assert.match(fragments.styles, /scroll-margin-top: 78px/);
});


test("Local project map restores valid deep links and ignores stale section hashes safely", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /function resolveHashSection/);
  assert.match(fragments.script, /function restoreHashSection/);
  assert.match(fragments.script, /window\.location\.hash/);
  assert.match(fragments.script, /decodeURIComponent/);
  assert.match(fragments.script, /requestAnimationFrame/);
  assert.match(fragments.script, /behavior: 'auto'/);
  assert.match(fragments.script, /window\.addEventListener\('hashchange'/);
  assert.match(fragments.script, /hashNavigationPending/);
  assert.match(fragments.script, /if \(hashNavigationPending\) return/);
  assert.match(fragments.script, /if \(!link \|\| link\.hidden \|\| !target \|\| target\.hidden\) return null/);
});


test("Local At a glance renders canonical project totals, languages, entry points and external dependencies", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /function renderOverview/);
  assert.match(fragments.script, /summary\.describedFiles/);
  assert.match(fragments.script, /summary\.undocumentedFiles/);
  assert.match(fragments.script, /summary\.internalDependencies/);
  assert.match(fragments.script, /summary\.externalDependencyNames/);
  assert.match(fragments.script, /typescript/);
  assert.match(fragments.script, /src\/extension\.ts/);
  assert.match(fragments.script, /vscode/);
  assert.match(fragments.script, /openFileAndReveal\(path\)/);
});


test("Local At a glance makes undocumented files actionable and expandable", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /Documentation coverage/);
  assert.match(
    fragments.script,
    /without a trusted module-level description/,
  );
  assert.match(fragments.script, /undocumentedFiles\.slice\(0, 8\)/);
  assert.match(fragments.script, /undocumentedFiles\.slice\(8\)/);
  assert.match(fragments.script, /openFileAndReveal\(file\.path\)/);
  assert.match(fragments.styles, /\.local-map-overview-more/);
});


test("Local code map browser script compiles as standalone JavaScript", () => {
  const fragments = renderLocalCodeMapFragments(data);
  const source = fragments.script
    .replace(/^\s*<script>\s*/, "")
    .replace(/\s*<\/script>\s*$/, "");

  assert.doesNotThrow(() => new Function(source));
});

test("Local code map stays absent when no Local model is supplied", () => {
  assert.deepEqual(renderLocalCodeMapFragments(undefined), {
    styles: "",
    markup: "",
    script: "",
  });
});


test("Local code map data stays source-factual and relation-driven", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /file\.usedBy\.length/);
  assert.match(fragments.script, /file\.description/);
  assert.match(fragments.script, /file\.exports/);
  assert.match(fragments.script, /setModuleFilter/);
  assert.match(fragments.script, /renderTreemap/);
  assert.match(fragments.script, /renderScatter/);
  assert.doesNotMatch(fragments.script, /good to split|will break|only place that calls/i);
});


test("Local code map connects module focus and file-card navigation", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.styles, /local-map-module-canvas\.focused/);
  assert.match(fragments.script, /focusModule/);
  assert.match(fragments.script, /data-from/);
  assert.match(fragments.script, /data-to/);
  assert.match(fragments.script, /openFileAndReveal/);
  assert.match(fragments.script, /revealFullDocumentation/);
  assert.match(fragments.script, /Open full file documentation/);
  assert.match(fragments.script, /data-documint-file-path/);
});


test("Local code map adds source-grounded runtime, interfaces and verification surfaces", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /id="localMapRuntimeSection"/);
  assert.match(fragments.markup, /id="localMapInterfacesSection"/);
  assert.match(fragments.markup, /id="localMapVerificationSection"/);
  assert.match(fragments.markup, /From an entry point, what project code comes next\?/);
  assert.match(fragments.markup, /Where can people or external systems interact with this project\?/);
  assert.match(fragments.markup, /What checks does this project already provide\?/);

  assert.match(fragments.script, /function renderRuntimeFlow/);
  assert.match(fragments.script, /Direct project imports/);
  assert.match(fragments.script, /Next project imports/);
  assert.match(fragments.script, /execution orientation, not a claim about exact runtime call order/i);

  assert.match(fragments.script, /function renderProjectInterfaces/);
  assert.match(fragments.script, /Entry-point exports/);
  assert.match(fragments.script, /VS Code commands/);
  assert.match(fragments.script, /VS Code settings/);
  assert.match(fragments.script, /Exposed ports/);
  assert.match(fragments.script, /API_TOKEN/);

  assert.match(fragments.script, /function verificationKind/);
  assert.match(fragments.script, /function renderVerification/);
  assert.match(fragments.script, /npm run compile/);
  assert.match(fragments.script, /npm run test/);
  assert.match(fragments.script, /make verify/);
  assert.match(fragments.script, /No check is invented or claimed to be mandatory/);
  assert.match(fragments.styles, /\.local-map-runtime-flow/);
  assert.match(fragments.styles, /\.local-map-interface-grid/);
  assert.match(fragments.styles, /\.local-map-verification-row/);
});


test("Local code map owns deterministic onboarding facts and Ctrl/Cmd+K file search", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /localMapRunSection/);
  assert.match(fragments.markup, /localMapOnboarding/);
  assert.match(fragments.markup, /Ctrl\/⌘ K/);
  assert.match(fragments.script, /renderOnboarding/);
  assert.match(fragments.script, /npm run compile/);
  assert.match(fragments.script, /npm run test/);
  assert.match(fragments.script, /documint\.generate/);
  assert.match(fragments.script, /documint\.generationMode/);
  assert.match(fragments.script, /facts\.makefile/);
  assert.match(fragments.script, /'make ' \+ target\.name/);
  assert.match(fragments.script, /verify/);
  assert.match(fragments.script, /node:22-alpine/);
  assert.match(fragments.script, /API_TOKEN/);
  assert.match(fragments.script, /LOG_LEVEL/);
  assert.match(fragments.script, /Referenced in source; static analysis does not claim these are required in every run/);
  assert.match(fragments.script, /event\.stopImmediatePropagation\(\)/);
  assert.match(fragments.script, /event\.key\.toLowerCase\(\) === 'k'/);
  assert.match(fragments.script, /input\.focus\(\)/);
});


test("Local ranked file search keeps top results compact while allowing every match to expand", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /var searchExpanded = false/);
  assert.match(fragments.script, /rankedHits\.slice\(0, 9\)/);
  assert.match(fragments.script, /Show all /);
  assert.match(fragments.script, /searchExpanded = true/);
  assert.match(
    fragments.script,
    /querySelectorAll\('button\[role="option"\]'\)/,
  );
  assert.match(fragments.styles, /\.local-map-result-more/);
});


test("Local file search supports multi-token factual queries without semantic inference", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /var tokens = query\.split/);
  assert.match(fragments.script, /function containsAllTokens/);
  assert.match(fragments.script, /tokens\.every/);
  assert.match(fragments.script, /containsAllTokens\(pathText\)/);
  assert.match(fragments.script, /Matched across file facts/);
  assert.doesNotMatch(
    fragments.script,
    /semantic similarity|embedding|fuzzy model|AI search/i,
  );
});


test("Local file search indexes internal symbols and TODO evidence with match context", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /exported\/internal symbols/);
  assert.match(fragments.markup, /TODO\/FIXME\/HACK source notes/);
  assert.match(fragments.script, /file\.internalSymbols/);
  assert.match(fragments.script, /file\.todos/);
  assert.match(fragments.script, /Internal symbol: /);
  assert.match(fragments.script, /Source note: /);
  assert.match(fragments.script, /normalizeActivation/);
  assert.match(fragments.script, /TODO: add smoke coverage/);
  assert.match(fragments.script, /var detailText = hit\.match/);
});


test("Local Big Picture layout starts from entry modules and clips edges at module boxes", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /function layoutModules/);
  assert.match(fragments.script, /file\.entryPoint/);
  assert.match(fragments.script, /incomingCount/);
  assert.match(fragments.script, /function clipModuleEdge/);
  assert.match(fragments.script, /var start = clipModuleEdge\(a, b\)/);
  assert.match(fragments.script, /var end = clipModuleEdge\(b, a\)/);
  assert.doesNotMatch(fragments.script, /Math\.ceil\(Math\.sqrt\(modules\.length\)\)/);
});


test("Local Big Picture organizes modules into readable dependency layers", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /function barycenter/);
  assert.match(fragments.script, /function reorderLevel/);
  assert.match(fragments.script, /for \(var sweep = 0; sweep < 3; sweep\+\+\)/);
  assert.match(fragments.script, /var columnSpacing = 224/);
  assert.match(fragments.script, /var rowSpacing = 96/);
  assert.match(fragments.script, /columns\.sort/);
  assert.match(fragments.script, /entry layer/);
  assert.match(fragments.script, /dependency layer /);
  assert.match(fragments.script, /other modules/);
  assert.match(fragments.styles, /\.local-map-layer-guide/);
  assert.match(fragments.styles, /\.local-map-layer-label/);
  assert.match(fragments.script, /if \(levelSpan === 0\)/);
});


test("Local code map source navigation stays relative and repository-agnostic", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /relativeSourceHref/);
  assert.match(fragments.script, /Open source file/);
  assert.match(fragments.script, /symbolLink\.href = relativeSourceHref\(file\.path, item\.line\)/);
  assert.doesNotMatch(fragments.script, /vscode:\/\/file/i);
  assert.doesNotMatch(fragments.script, /github\.com\/Wonderer-Tech\/documint/i);
});


test("only the conceptual module map gets an offline sketch treatment", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.styles, /Segoe Print/);
  assert.match(fragments.script, /feTurbulence/);
  assert.match(fragments.script, /feDisplacementMap/);
  assert.match(fragments.script, /localMapSketch/);
  assert.match(fragments.script, /filter: 'url\(#localMapSketch\)'/);
  assert.doesNotMatch(fragments.script, /rough\.svg|rough\.canvas/);
  assert.doesNotMatch(fragments.styles, /local-map-scatter[^}]*filter:/);
});

test("Local HTML adopts the redesign prototype paper-grid visual system", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.styles, /body\.documint-local-report/);
  assert.match(fragments.styles, /--map-paper: #F6F8F7/);
  assert.match(fragments.styles, /--map-grid: #E2EAE6/);
  assert.match(fragments.styles, /--map-mint: #1E8C6E/);
  assert.match(fragments.styles, /Atkinson Hyperlegible/);
  assert.match(fragments.styles, /JetBrains Mono/);
  assert.match(fragments.styles, /Kalam/);
  assert.match(
    fragments.styles,
    /linear-gradient\(var\(--map-grid\) 1px, transparent 1px\)/,
  );
  assert.match(fragments.styles, /\.local-map-module-legend/);
  assert.match(fragments.markup, /id="localMapModuleLegend"/);
  assert.match(fragments.markup, /id="localMapProjectTitle"/);
  assert.match(fragments.script, /function applyModulePalette/);
  assert.match(fragments.script, /function renderModuleLegend/);
  assert.match(fragments.script, /projectTitle\.textContent = data\.projectName/);
});


test("Local cards wrap long text inside their visual bounds", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.styles, /overflow-wrap: anywhere/);
  assert.match(fragments.styles, /word-break: break-word/);
  assert.match(fragments.styles, /\.local-map-module-card-title/);
  assert.match(fragments.styles, /-webkit-line-clamp: 2/);
  assert.match(fragments.script, /makeSvg\('foreignObject'/);
  assert.match(fragments.script, /local-map-module-card-content/);
  assert.match(fragments.script, /local-map-module-card-title/);
});


test("Local Big Picture uses prototype-style open arrows and uncluttered edge counts", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /Arrows point from the importing module to the module it imports/);
  assert.match(fragments.script, /function buildOpenArrowPath/);
  assert.match(fragments.script, /var reciprocalOffset = reciprocal/);
  assert.match(fragments.script, /var horizontalDirection = end\.x >= start\.x \? 1 : -1/);
  assert.match(fragments.script, /quadraticMidpoint/);
  assert.match(fragments.script, /cubicMidpoint/);
  assert.match(fragments.script, /buildCubicOpenArrowPath/);
  assert.match(fragments.styles, /stroke-dasharray: 5 6/);
  assert.match(fragments.styles, /\.local-map-module-edge\.mid/);
  assert.match(fragments.styles, /\.local-map-module-edge\.strong/);
  assert.match(fragments.styles, /\.local-map-edge-badge/);
  assert.match(fragments.styles, /\.local-map-edge-count/);
  assert.match(fragments.script, /if \(edge\.count >= 2\)/);
  assert.match(fragments.script, /var laneOffset = \(\(edgeIndex % 7\) - 3\) \* 5/);
  assert.doesNotMatch(fragments.script, /marker-end|localMapArrow/);
});


test("Local code map exposes keyboard-accessible search and live filter state", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /localMapFilterState" role="status" aria-live="polite"/);
  assert.match(fragments.markup, /aria-autocomplete="list"/);
  assert.match(fragments.markup, /aria-label="Project file search results"/);
  assert.match(fragments.script, /aria-activedescendant/);
  assert.match(fragments.script, /scrollIntoView\(\{ block: 'nearest' \}\)/);
  assert.match(fragments.styles, /\.local-code-map \.sr-only/);
});


test("Local code map search and file card include verified environment references", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /environmentVariables/);
  assert.match(fragments.script, /containsAllTokens\(environmentName\)/);
  assert.match(fragments.script, /Environment references:/);
  assert.match(fragments.script, /API_TOKEN/);
});




test("Local file cards retain canonical internal symbols and source-note evidence", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /internalSymbols/);
  assert.match(fragments.script, /Internal symbols/);
  assert.match(fragments.script, /normalizeActivation/);
  assert.match(fragments.script, /file\.todos/);
  assert.match(fragments.script, /Source notes/);
  assert.match(fragments.script, /TODO: add smoke coverage/);
  assert.match(fragments.script, /relativeSourceHref\(file\.path, todo\.line\)/);
});


test("Local module-map insight chips stay metric-backed and conservative", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /id="localMapGraphInsights"/);
  assert.match(fragments.styles, /\.local-map-graph-insight/);
  assert.match(fragments.script, /entry: /);
  assert.match(fragments.script, /cross-module links: /);
  assert.match(fragments.script, /largest: /);
  assert.doesNotMatch(
    fragments.script,
    /everything passes through|only place that calls|will break|good to split/i,
  );
});


test("Local module map retains trusted provenance and suggested start files", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /module\.descriptionSource/);
  assert.match(fragments.script, /primaryFilePaths/);
  assert.match(fragments.script, /Suggested start:/);
  assert.match(fragments.script, /Description source: /);
  assert.match(fragments.script, /start: /);
  assert.match(fragments.script, /src\/services\/run\.ts/);
  assert.match(
    fragments.script,
    /source\.textContent = 'Description source: ' \+ module\.descriptionSource/,
  );
});


test("Local relation cards keep every dependency accessible beyond the compact first twelve", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /function relationButton/);
  assert.match(fragments.script, /local-map-relation-more/);
  assert.match(fragments.script, /paths\.slice\(12\)/);
  assert.match(fragments.script, /details\.appendChild\(relationButton\(path\)\)/);
});


test("Local module map exposes only trusted module descriptions in bounded custom tooltips", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /id="localMapModuleTooltip"/);
  assert.match(fragments.styles, /\.local-map-module-tooltip/);
  assert.match(fragments.script, /function showModuleTooltip/);
  assert.match(fragments.script, /function positionModuleTooltip/);
  assert.match(fragments.script, /module\.description/);
  assert.match(fragments.script, /Documentation services/);
  assert.match(fragments.script, /module\.descriptionSource/);
  assert.match(fragments.script, /Description source: /);
  assert.doesNotMatch(
    fragments.script,
    /makeSvg\('title', \{\}, g\)[\s\S]{0,400}module\.description/,
  );
});


test("Local Big Picture supports fit, zoom, pan and compact connection mode", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.markup, /id="localMapZoomOut"/);
  assert.match(fragments.markup, /id="localMapZoomIn"/);
  assert.match(fragments.markup, /id="localMapZoomFit"/);
  assert.match(fragments.markup, /id="localMapMajorLinks"/);
  assert.match(fragments.markup, /id="localMapAllLinks"/);
  assert.match(fragments.script, /function setModuleViewport/);
  assert.match(fragments.script, /function zoomModuleGraph/);
  assert.match(fragments.script, /function initModuleGraphControls/);
  assert.match(fragments.script, /svg\.onwheel/);
  assert.match(fragments.script, /svg\.onpointerdown/);
  assert.match(fragments.script, /svg\.onpointermove/);
  assert.match(fragments.script, /setModuleLinkMode\(edgeCount > 14 \? 'major' : 'all'\)/);
  assert.match(fragments.styles, /compact-links/);
});


test("Local code map hero reports canonical trusted-description coverage with a source fallback", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /summary\.describedFiles/);
  assert.match(fragments.script, /data\.files\.filter/);
  assert.match(fragments.script, /' described'/);
});


test("Local onboarding shows the detected package manager and exact package scripts", () => {
  const fragments = renderLocalCodeMapFragments(data);

  assert.match(fragments.script, /Package manager/);
  assert.match(fragments.script, /facts\.packageManager/);
  assert.match(fragments.script, /npm run compile/);
});

test("Local code map can nonce both executable and JSON script elements", () => {
  const fragments = renderLocalCodeMapFragments(
    data,
    'nonce"<unsafe>',
  );

  assert.match(
    fragments.markup,
    /<script nonce="nonce&quot;&lt;unsafe&gt;" type="application\/json"/,
  );
  assert.match(
    fragments.script,
    /^\s*<script nonce="nonce&quot;&lt;unsafe&gt;">/,
  );
});
