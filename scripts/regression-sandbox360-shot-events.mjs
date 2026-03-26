import fs from 'node:fs';

const viewerFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/Sandbox360Viewer.tsx', import.meta.url), 'utf8');
const appFile = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const modeFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/sandbox360Mode.ts', import.meta.url), 'utf8');
const dollSystemFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/dollCabinetSystem.ts', import.meta.url), 'utf8');
const viewerCssFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/sandbox360Viewer.css', import.meta.url), 'utf8');

const assertHas = (file, token, message) => {
  if (!file.includes(token)) throw new Error(message);
};

assertHas(dollSystemFile, "export type DollVariant = 'neutral' | 'glance_to_player' | 'stare_player' | 'hard_stare';", 'doll system must expose authored variants');
assertHas(dollSystemFile, 'export const DOLL_CABINET_TARGETS', 'doll cabinet must expose authored per-doll target table');
assertHas(dollSystemFile, "{ id: 'doll_02', cabinetSlot: 'top_center'", 'key doll target top_center should exist');
assertHas(dollSystemFile, "{ id: 'doll_03', cabinetSlot: 'top_right'", 'key doll target top_right should exist');
assertHas(dollSystemFile, "{ id: 'doll_05', cabinetSlot: 'bottom_center'", 'key doll target bottom_center should exist');
assertHas(dollSystemFile, "{ id: 'doll_06', cabinetSlot: 'bottom_right'", 'key doll target bottom_right should exist');
assertHas(dollSystemFile, 'dollCabinetActiveVariantMap', 'doll cabinet ssot map must exist');
assertHas(dollSystemFile, 'reduceDollCabinetForEscalation', 'doll cabinet escalation reducer must exist');
assertHas(dollSystemFile, 'settleDollCabinet', 'doll cabinet settle reducer must exist');
assertHas(dollSystemFile, "variantMap[id] = 'hard_stare';", 'stage scare path should set hard_stare variant');
assertHas(dollSystemFile, 'cooldownUntil = scare ? input.now + 12_000 : 0;', 'scare must set cooldown');

assertHas(modeFile, 'dollCabinet: createInitialDollCabinetState()', 'sandbox360 mode state must include doll cabinet ssot');
assertHas(modeFile, 'next.dollCabinet = { ...base.dollCabinet, ...(raw?.dollCabinet ?? {}) };', 'sandbox360 hydration must preserve doll cabinet ssot');

assertHas(appFile, 'const [sandbox360DollCabinetState, setSandbox360DollCabinetState] = useState<DollCabinetState>(createInitialDollCabinetState());', 'app should own doll cabinet ssot state');
assertHas(appFile, 'dollCabinet: sandbox360DollCabinetRef.current', 'app should project doll cabinet ssot into mode state');
assertHas(appFile, "setSandbox360DollCabinetState((prev) => reduceDollCabinetForEscalation(prev, { now, source: 'right_stay'", 'right stay must escalate doll stage');
assertHas(appFile, "setSandbox360DollCabinetState((prev) => markDollCabinetReturnTrigger(prev, 'story_tag'))", 'story tag return trigger should be wired');
assertHas(appFile, 'dollCabinet.activeVariantMap:', 'debug panel should print active variant map');
assertHas(appFile, 'dollCabinet.overlay/audio/variant source:', 'debug panel should expose stage effect source');
assertHas(appFile, 'dollCabinet.renderedVariantAssets:', 'debug panel should expose rendered variant assets');
assertHas(appFile, 'dollCabinet.missingVariantAssets:', 'debug panel should expose missing variant assets');
assertHas(appFile, 'dollCabinet.fallbackVariantMap:', 'debug panel should expose fallback map');
assertHas(appFile, 'dollGazeSsot.mode:', 'debug panel should expose 360 gaze mode');
assertHas(appFile, 'dollGazeSsot.activeCabinetRegion:', 'debug panel should expose active doll cabinet region');
assertHas(appFile, 'dollGazeSsot.overlayFloatingFaceRemoved:', 'debug panel should expose floating-face removal status');
assertHas(appFile, 'dollBinding[', 'debug panel should expose per-doll anchor/apply status');
assertHas(appFile, 'current360Region:', 'debug panel should expose current 360 region');

assertHas(viewerFile, 'dollCabinetState: DollCabinetState;', 'viewer should consume doll cabinet ssot');
assertHas(viewerFile, 'dollCabinetTargets: DollCabinetTarget[];', 'viewer should consume authored doll targets table');
assertHas(viewerFile, "const requestedVariant = dollCabinetState.dollCabinetActiveVariantMap[target.id] ?? 'neutral';", 'viewer should render from activeVariantMap ssot');
assertHas(viewerFile, 'DOLL_MOTION_BY_VARIANT', 'viewer should own cabinet doll motion profiles');
assertHas(viewerFile, '${binding.requestedVariant}->${binding.resolvedVariant}@${binding.motionPreset}', 'viewer debug should expose motion preset mapping');
assertHas(viewerFile, "variantRenderSource: 'cabinet_scene_clone_motion_v2'", 'viewer should expose scene clone render source id');
assertHas(viewerFile, 'const dollSlotAnchors = useMemo<DollSlotAnchorMap>', 'viewer should author scene-space doll slot anchors');
assertHas(viewerFile, 'const dollSceneBindings = useMemo<DollSceneBindingDebug[]>', 'viewer should project per-doll scene binding ssot');
assertHas(viewerFile, "activeCabinetRegion: 'dollCabinet'", 'viewer should expose active cabinet region in gaze ssot');
assertHas(viewerFile, "overlayFloatingFaceRemoved: true", 'viewer should explicitly expose floating-face path removal');
assertHas(viewerFile, 'const inViewport = visibleRatio >= 0.45 && centerInViewport;', 'viewer should block partial edge-floating dolls');
assertHas(viewerFile, ": 'applied_to_scene_anchor';", 'viewer should report successful scene-anchor application reason');
assertHas(viewerFile, 'className="sandbox360OverlayDollWorldLayer"', 'viewer should render doll world layer in 360 scene');
assertHas(viewerFile, 'className="sandbox360OverlayDollAnchor"', 'viewer should render anchored per-doll nodes');
assertHas(viewerFile, 'className="sandbox360OverlayDollBodyClone"', 'viewer should render cabinet doll body clone layer');
assertHas(viewerFile, "if (binding.applyStatus !== 'applied') return null;", 'viewer should cull non-applicable doll anchors');
assertHas(viewerFile, "geometrySource: 'dollSlotAnchors(scene_space) -> resolveTvScreenInnerGeometryFromBaseCalibration(base_scene+viewer_camera+handheld)'", 'doll debug geometry must report scene-space anchor path');
assertHas(viewerFile, 'className="sandbox360OverlayDollReflectCue"', 'legacy doll reflect should stay as cue only');
assertHas(viewerFile, 'missingVariantAssets', 'viewer should expose missing variant assets');
assertHas(viewerFile, 'renderedVariantAssets', 'viewer should expose rendered variant assets');
assertHas(viewerFile, 'fallbackVariantMap', 'viewer should expose fallback variant map');

if (viewerFile.includes('className="sandbox360OverlayDoll"')) {
  throw new Error('legacy single doll overlay path should be removed');
}
if (viewerCssFile.includes('.sandbox360OverlayDoll {')) {
  throw new Error('legacy single doll overlay css path should be removed');
}

if (viewerFile.includes('sandbox360OverlayDollHeadAsset')) {
  throw new Error('legacy viewport floating doll head asset path must be removed');
}

if (viewerFile.includes('className="sandbox360OverlayDollCabinet"')) {
  throw new Error('legacy cabinet screen-space container path should be removed');
}

if (viewerFile.includes('className="sandbox360OverlayDollSlot"')) {
  throw new Error('legacy slot percent-grid container path should be removed');
}

console.log('regression-sandbox360-shot-events: ok');
