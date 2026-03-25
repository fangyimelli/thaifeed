import fs from 'node:fs';

const viewerFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/Sandbox360Viewer.tsx', import.meta.url), 'utf8');

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
assertHas("triggerRoomEvent('DOOR_SHADOW', 'shot_flow')", 'DOOR_SHADOW shot trigger missing');
assertHas("triggerRoomEvent('DOLL_REFLECT', 'shot_flow')", 'DOLL_REFLECT shot trigger missing');
assertHas("delayedLightFlashTimerRef.current = window.setTimeout", 'CENTER -> RIGHT delayed timer missing');
assertHas("triggerRoomEvent('LIGHT_FLASH_LEFT', 'shot_flow')", 'LIGHT_FLASH_LEFT shot trigger missing');
assertHas("rightStayTimerRef.current = window.setTimeout", 'RIGHT stay timer missing');
assertHas("triggerRoomEvent('TV_STATIC', 'shot_flow')", 'TV_STATIC stay trigger missing');

assertHas('const eventCooldownMapRef = useRef<Record<RoomEventType, number>>({', 'eventCooldownMap state missing');
assertHas('const shotEnterTimeRef = useRef<number>(Date.now())', 'shotEnterTime state missing');
assertHas('const lastShotRef = useRef<ShotType>(viewerState.currentShot)', 'lastShot state missing');

console.log('regression-sandbox360-shot-events: ok');
