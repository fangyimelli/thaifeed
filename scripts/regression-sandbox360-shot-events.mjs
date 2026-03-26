import fs from 'node:fs';

const viewerFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/Sandbox360Viewer.tsx', import.meta.url), 'utf8');
const appFile = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const modeFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/sandbox360Mode.ts', import.meta.url), 'utf8');
const dollSystemFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/dollCabinetSystem.ts', import.meta.url), 'utf8');

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
assertHas(appFile, 'current360Region:', 'debug panel should expose current 360 region');

assertHas(viewerFile, 'dollCabinetState: DollCabinetState;', 'viewer should consume doll cabinet ssot');
assertHas(viewerFile, 'dollCabinetTargets: DollCabinetTarget[];', 'viewer should consume authored doll targets table');
assertHas(viewerFile, "const requestedVariant = dollCabinetState.dollCabinetActiveVariantMap[target.id] ?? 'neutral';", 'viewer should render from activeVariantMap ssot');
assertHas(viewerFile, 'resolveDollVariantRenderPath', 'viewer should resolve per-slot render path by variant');
assertHas(viewerFile, '${requestedVariant}->${resolved.resolvedVariant}', 'viewer debug should expose fallback variant mapping');
assertHas(viewerFile, "variantRenderSource: 'slot_variant_render_library_v1'", 'viewer should expose variant source id');
assertHas(viewerFile, 'className="sandbox360OverlayDollCabinet"', 'viewer should render cabinet container');
assertHas(viewerFile, 'className="sandbox360OverlayDollSlot"', 'viewer should render per-doll slot path');
assertHas(viewerFile, 'className="sandbox360OverlayDollReflectCue"', 'legacy doll reflect should stay as cue only');
assertHas(viewerFile, 'missingVariantAssets', 'viewer should expose missing variant assets');
assertHas(viewerFile, 'renderedVariantAssets', 'viewer should expose rendered variant assets');
assertHas(viewerFile, 'fallbackVariantMap', 'viewer should expose fallback variant map');

if (viewerFile.includes('className="sandbox360OverlayDoll"')) {
  throw new Error('legacy single doll overlay path should be removed');
}

if (viewerFile.includes('sandbox360OverlayDollHead"')) {
  throw new Error('legacy css primitive doll head path must not remain primary renderer');
}

console.log('regression-sandbox360-shot-events: ok');
