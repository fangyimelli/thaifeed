import fs from 'node:fs';

const viewerFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/Sandbox360Viewer.tsx', import.meta.url), 'utf8');
const modeFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/sandbox360Mode.ts', import.meta.url), 'utf8');
const appFile = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');

const assertHas = (token, message) => {
  if (!viewerFile.includes(token)) {
    throw new Error(message);
  }
};

assertHas('const ROOM_EVENT_COOLDOWN_MS: Record<RoomEventType, number> = {', 'missing room event cooldown map');
assertHas('LIGHT_FLASH_LEFT: 3000', 'LIGHT_FLASH_LEFT cooldown must be 3000ms');
assertHas('TV_STATIC: 4000', 'TV_STATIC cooldown must be 4000ms');
assertHas('DOLL_REFLECT: 5000', 'DOLL_REFLECT cooldown must be 5000ms');
assertHas('DOOR_SHADOW: 5000', 'DOOR_SHADOW cooldown must be 5000ms');

assertHas('const onShotChange = useCallback((prevShot: ShotType, nextShot: ShotType) => {', 'onShotChange hook missing');
assertHas("if (prevShot === 'right' && nextShot === 'center')", 'RIGHT -> CENTER trigger missing');
assertHas("if (prevShot === 'left' && nextShot === 'center')", 'LEFT -> CENTER trigger missing');
assertHas("triggerRoomEvent('DOOR_SHADOW', { source: 'shot_flow' })", 'DOOR_SHADOW shot trigger missing');
assertHas("triggerRoomEvent('DOLL_REFLECT', { source: 'shot_flow' })", 'DOLL_REFLECT shot trigger missing');
assertHas("delayedLightFlashTimerRef.current = window.setTimeout", 'CENTER -> RIGHT delayed timer missing');
assertHas("triggerRoomEvent('LIGHT_FLASH_LEFT', { source: 'shot_flow' })", 'LIGHT_FLASH_LEFT shot trigger missing');
assertHas("rightStayTimerRef.current = window.setTimeout", 'RIGHT stay timer missing');
assertHas("triggerRoomEvent('TV_STATIC', { source: 'shot_flow' })", 'TV_STATIC stay trigger missing');

assertHas('window.__sandbox360 = debugApi', 'sandbox360 namespace API mount missing');
assertHas('const shouldBypassCooldown = Boolean(options?.force || options?.ignoreCooldown);', 'triggerRoomEvent should derive bypass cooldown from options');
assertHas('if (!shouldBypassCooldown && cooldownUntil > now)', 'cooldown gate should only block when bypass=false');
assertHas("const triggerMode: RoomEventTriggerMode = options?.force === true ? 'force' : 'normal';", 'trigger mode should encode force/non-force branch');
assertHas('cooldownBypassed: shouldBypassCooldown,', 'observability should record cooldown bypass state');
assertHas("triggerRoomEvent: (eventType, options) => triggerRoomEvent(eventType, options)", 'sandbox360 room event API should delegate to local trigger');
assertHas("const forceRoomEvent = useCallback((eventType: RoomEventType) => (", 'forceRoomEvent helper should exist');
assertHas("triggerRoomEvent(eventType, { force: true, source: 'manual' })", 'forceRoomEvent should trigger with force flag to bypass cooldown');
assertHas("triggerRoomEvent('LIGHT_FLASH_LEFT', { source: 'shot_flow' });", 'shot-flow triggers should remain non-force');
assertHas("triggerRoomEvent('TV_STATIC', { source: 'shot_flow' });", 'shot-flow right-stay trigger should remain non-force');
assertHas("triggerRoomEvent('DOOR_SHADOW', { source: 'shot_flow' });", 'shot-flow transition trigger should remain non-force');
assertHas("triggerRoomEvent('DOLL_REFLECT', { source: 'shot_flow' });", 'shot-flow transition trigger should remain non-force');
assertHas("<button type=\"button\" onClick={() => forceRoomEvent('LIGHT_FLASH_LEFT')}>FLASH</button>", 'debug FLASH button should map to forceRoomEvent');
assertHas("<button type=\"button\" onClick={() => forceRoomEvent('TV_STATIC')}>TV</button>", 'debug TV button should map to forceRoomEvent');
assertHas("<button type=\"button\" onClick={() => forceRoomEvent('DOLL_REFLECT')}>DOLL</button>", 'debug DOLL button should map to forceRoomEvent');
assertHas("<button type=\"button\" onClick={() => forceRoomEvent('DOOR_SHADOW')}>DOOR</button>", 'debug DOOR button should map to forceRoomEvent');
assertHas("forceRoomEvent: (eventType: RoomEventType) => boolean;", 'debug API contract should expose forceRoomEvent');
assertHas('forceRoomEvent,', 'debug namespace export should include forceRoomEvent token');
if (viewerFile.includes('window.triggerRoomEvent')) {
  throw new Error('legacy global window.triggerRoomEvent must not be mounted');
}

assertHas('const eventCooldownMapRef = useRef<Record<RoomEventType, number>>({', 'eventCooldownMap state missing');
assertHas('const shotEnterTimeRef = useRef<number>(Date.now())', 'shotEnterTime state missing');
assertHas('const lastShotRef = useRef<ShotType>(viewerState.currentShot)', 'lastShot state missing');
assertHas('isTransitioning: {viewerState.isTransitioning ? \'true\' : \'false\'}', 'viewer debug must expose isTransitioning');
assertHas('<div>currentShot: {viewerState.currentShot}</div>', 'viewer debug must expose currentShot');
assertHas('<div>targetShot: {viewerState.targetShot}</div>', 'viewer debug must expose targetShot');

if (!modeFile.includes('export const SANDBOX360_SCALE = 1.75;')) {
  throw new Error('SANDBOX360_SCALE must default to 1.75 for zoom-crop framing baseline');
}
if (!modeFile.includes('const SANDBOX360_LEFT_POS = 36;') || !modeFile.includes('const SANDBOX360_CENTER_POS = 52;') || !modeFile.includes('const SANDBOX360_RIGHT_POS = 66;')) {
  throw new Error('left/center/right framing constants drifted');
}
if (!modeFile.includes('isTransitioning: false')) {
  throw new Error('viewer state must define authoritative isTransitioning');
}

if (!appFile.includes('const transitionDuration = 0.28;')) {
  throw new Error('sandbox360 transition duration guard missing');
}
if (!appFile.includes('const easeOutStep = 1 - ((1 - step) * (1 - step));')) {
  throw new Error('sandbox360 short ease-out transition guard missing');
}
if (!appFile.includes('const isTransitioning = !isSettled;')) {
  throw new Error('sandbox360 authoritative transition state guard missing');
}

console.log('regression-sandbox360-shot-events: ok');
