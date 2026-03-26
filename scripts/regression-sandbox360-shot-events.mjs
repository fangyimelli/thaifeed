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
assertHas(dollSystemFile, 'dollCabinetActiveVariantMap', 'doll cabinet ssot map must exist');
assertHas(dollSystemFile, 'reduceDollCabinetForEscalation', 'doll cabinet escalation reducer must exist');
assertHas(dollSystemFile, 'settleDollCabinet', 'doll cabinet settle reducer must exist');

assertHas(modeFile, 'dollCabinet: createInitialDollCabinetState()', 'sandbox360 mode state must include doll cabinet ssot');
assertHas(modeFile, 'next.dollCabinet = { ...base.dollCabinet, ...(raw?.dollCabinet ?? {}) };', 'sandbox360 hydration must preserve doll cabinet ssot');

assertHas(appFile, 'const [sandbox360DollCabinetState, setSandbox360DollCabinetState] = useState<DollCabinetState>(createInitialDollCabinetState());', 'app should own doll cabinet ssot state');
assertHas(appFile, 'dollCabinet: sandbox360DollCabinetRef.current', 'app should project doll cabinet ssot into mode state');
assertHas(appFile, "setSandbox360DollCabinetState((prev) => reduceDollCabinetForEscalation(prev, { now, source: 'right_stay'", 'right stay must escalate doll stage');
assertHas(appFile, "setSandbox360DollCabinetState((prev) => markDollCabinetReturnTrigger(prev, 'story_tag'))", 'story tag return trigger should be wired');
assertHas(appFile, 'dollCabinet.activeVariantMap:', 'debug panel should print active variant map');
assertHas(appFile, 'dollCabinet.overlay/audio/variant source:', 'debug panel should expose stage effect source');
assertHas(appFile, 'current360Region:', 'debug panel should expose current 360 region');

assertHas(viewerFile, 'dollCabinetState: DollCabinetState;', 'viewer should consume doll cabinet ssot');
assertHas(viewerFile, 'dollCabinetTargets: DollCabinetTarget[];', 'viewer should consume authored doll targets table');
assertHas(viewerFile, 'const variant = dollCabinetState.dollCabinetActiveVariantMap[target.id] ?? \'neutral\';', 'viewer should render from activeVariantMap ssot');
assertHas(viewerFile, 'className="sandbox360OverlayDollCabinet"', 'viewer should render cabinet container');
assertHas(viewerFile, 'className="sandbox360OverlayDollSlot"', 'viewer should render per-doll slot path');
assertHas(viewerFile, 'className="sandbox360OverlayDollReflectCue"', 'legacy doll reflect should stay as cue only');

if (viewerFile.includes('className="sandbox360OverlayDoll"')) {
  throw new Error('legacy single doll overlay path should be removed');
}

console.log('regression-sandbox360-shot-events: ok');
