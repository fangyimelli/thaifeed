import fs from 'node:fs';

const viewerFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/Sandbox360Viewer.tsx', import.meta.url), 'utf8');
const appFile = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');

const assertHas = (file, token, message) => {
  if (!file.includes(token)) throw new Error(message);
};

assertHas(viewerFile, 'type RoomEventRuntimeState = Record<RoomEventType, { active: boolean; triggerCount: number; triggerSeq: number }>;', 'viewer must consume room event runtime SSOT from parent');
assertHas(viewerFile, 'roomEventState: RoomEventRuntimeState;', 'viewer must read room event runtime SSOT from parent');
assertHas(viewerFile, 'roomEventObservability: RoomEventObservabilityState;', 'viewer must read room event observability from parent SSOT');
assertHas(viewerFile, 'onTriggerRoomEvent: (eventType: RoomEventType, options?: TriggerRoomEventOptions) => boolean;', 'viewer must trigger room events via parent gate callback');
assertHas(viewerFile, 'onViewerDebugStateChange?: (payload:', 'viewer must emit debug projection snapshot to debug container');
assertHas(viewerFile, 'window.__sandbox360 = debugApi;', 'sandbox360 debug API should stay mounted');
assertHas(viewerFile, 'forceRoomEvent: (eventType) => onTriggerRoomEvent(eventType, { force: true, source: \'manual\' })', 'force room event must delegate to force gate callback');
assertHas(viewerFile, 'key={`TV_STATIC_OVERLAY-${roomEventState.TV_STATIC.triggerSeq}`}', 'renderer overlay must re-mount on each trigger sequence to force effect replay');
assertHas(viewerFile, 'data-active={roomEventState.TV_STATIC.active ? \'true\' : \'false\'}', 'renderer overlay must consume shared room event active state');
assertHas(viewerFile, 'tvDebugRect', 'viewer should keep authoritative rect projection');
assertHas(viewerFile, 'tvOverlayRect', 'viewer should keep authoritative overlay rect projection');
if (viewerFile.includes('sandbox360ShotState')) {
  throw new Error('main view should not retain standalone shot state overlay');
}

if (viewerFile.includes('className="sandbox360Debug"')) {
  throw new Error('main view overlay debug panel must be removed (moved to debug page/container)');
}
if (viewerFile.includes('className="sandbox360RoomEventButtons"')) {
  throw new Error('main view room event debug buttons must be removed');
}
if (viewerFile.includes('className="sandbox360ShotButtons"')) {
  throw new Error('main view shot debug buttons must be removed');
}

assertHas(appFile, 'type Sandbox360RoomEventState = Record<Sandbox360RoomEventType, Sandbox360RoomEventRuntime>;', 'app should keep a typed room event SSOT');
assertHas(appFile, 'const [sandbox360RoomEvents, setSandbox360RoomEvents] = useState<Sandbox360RoomEventState>({', 'app must own sandbox360 room event SSOT');
assertHas(appFile, 'const [sandbox360RoomEventDebug, setSandbox360RoomEventDebug] = useState({', 'app must own sandbox360 room event debug SSOT');
assertHas(appFile, 'const triggerSandbox360RoomEvent = useCallback((eventType: Sandbox360RoomEventType', 'app must own room event gate + force pipeline');
assertHas(appFile, 'triggerSeq: prev[eventType].triggerSeq + 1', 'force/event triggers must increment sequence to replay visual effect');
assertHas(appFile, 'renderedActive: true,', 'debug state should explicitly reflect active render status');
assertHas(appFile, 'const clearSandbox360ShotFlowTimers = useCallback(() => {', 'shot flow timers must be managed centrally');
assertHas(appFile, "triggerSandbox360RoomEvent('LIGHT_FLASH_LEFT', { source: 'shot_flow' });", 'shot flow -> effect mapping must remain authoritative');
assertHas(appFile, "triggerSandbox360RoomEvent('TV_STATIC', { source: 'shot_flow' });", 'right stay -> tv static mapping must remain authoritative');
assertHas(appFile, "triggerSandbox360RoomEvent('DOOR_SHADOW', { source: 'shot_flow' });", 'right->center mapping must remain authoritative');
assertHas(appFile, "triggerSandbox360RoomEvent('DOLL_REFLECT', { source: 'shot_flow' });", 'left->center mapping must remain authoritative');
assertHas(appFile, '{mode === \'sandbox_360_test\' && (', 'debug panel must include sandbox_360_test section');
assertHas(appFile, 'Sandbox360 Viewer / Effect SSOT', 'debug panel must show consolidated sandbox360 fields');
assertHas(appFile, 'live controls location: main_view_top_left', 'debug panel must indicate control ownership split');
assertHas(appFile, 'className="sandbox360-live-controls"', 'main view should retain sandbox direct control buttons');
assertHas(appFile, 'FORCE TV', 'main view must expose force effect trigger control');
assertHas(appFile, 'onViewerDebugStateChange={(payload) => {', 'viewer debug snapshot must be projected into app debug state');

console.log('regression-sandbox360-shot-events: ok');
