import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import { SANDBOX360_SCENE_IMAGE_FALLBACK_SRC, SANDBOX360_SCENE_IMAGE_SRC } from './assets';
import './sandbox360Viewer.css';

export type Sandbox360ViewerState = {
  currentShot: 'left' | 'center' | 'right';
  targetShot: 'left' | 'center' | 'right';
  currentPosX: number;
  targetPosX: number;
  isTransitioning: boolean;
  posY: number;
  scale: number;
  lastCommand?: string;
};

type ShotType = 'left' | 'center' | 'right';
type RoomEventType = 'LIGHT_FLASH_LEFT' | 'TV_STATIC' | 'DOLL_REFLECT' | 'DOOR_SHADOW';
type TriggerSource = 'manual' | 'shot_flow';

type Props = {
  viewerState: Sandbox360ViewerState;
  curse: number;
  onDebugShotSelect: (shot: ShotType) => void;
  debugState: {
    aspect: number;
    mode: 'desktop' | 'mobile';
    leftPosX: number;
    centerPosX: number;
    rightPosX: number;
    posError: number;
    isSettled: boolean;
  };
};

type Sandbox360DebugApi = {
  triggerRoomEvent: (eventType: RoomEventType) => boolean;
  overlay: {
    triggerRoomEvent: (eventType: RoomEventType) => boolean;
  };
  viewer: {
    triggerShot: (shot: ShotType) => void;
    shot: Record<ShotType, () => void>;
  };
  debug: {
    triggerRoomEvent: (eventType: RoomEventType) => boolean;
    triggerShot: (shot: ShotType) => void;
  };
};

declare global {
  interface Window {
    __sandbox360?: Sandbox360DebugApi;
  }
}

const ROOM_EVENT_DURATION_MS: Record<RoomEventType, number> = {
  LIGHT_FLASH_LEFT: 180,
  TV_STATIC: 1200,
  DOLL_REFLECT: 520,
  DOOR_SHADOW: 900
};

const ROOM_EVENT_COOLDOWN_MS: Record<RoomEventType, number> = {
  LIGHT_FLASH_LEFT: 3000,
  TV_STATIC: 4000,
  DOLL_REFLECT: 5000,
  DOOR_SHADOW: 5000
};

export default function Sandbox360Viewer({ viewerState, curse, debugState, onDebugShotSelect }: Props) {
  const [roomLoadFailed, setRoomLoadFailed] = useState(false);
  const [sceneImageSrc, setSceneImageSrc] = useState(SANDBOX360_SCENE_IMAGE_SRC);
  const [activeEvents, setActiveEvents] = useState<Record<RoomEventType, number>>({
    LIGHT_FLASH_LEFT: 0,
    TV_STATIC: 0,
    DOLL_REFLECT: 0,
    DOOR_SHADOW: 0
  });
  const timeoutsRef = useRef<Record<RoomEventType, number | null>>({
    LIGHT_FLASH_LEFT: null,
    TV_STATIC: null,
    DOLL_REFLECT: null,
    DOOR_SHADOW: null
  });
  const delayedLightFlashTimerRef = useRef<number | null>(null);
  const rightStayTimerRef = useRef<number | null>(null);
  const lastShotRef = useRef<ShotType>(viewerState.currentShot);
  const shotEnterTimeRef = useRef<number>(Date.now());
  const eventCooldownMapRef = useRef<Record<RoomEventType, number>>({
    LIGHT_FLASH_LEFT: 0,
    TV_STATIC: 0,
    DOLL_REFLECT: 0,
    DOOR_SHADOW: 0
  });

  const sceneStyle = useMemo(() => ({
    ['--sandbox360-object-pos-x' as string]: `${viewerState.currentPosX.toFixed(3)}%`,
    ['--sandbox360-object-pos-y' as string]: `${viewerState.posY.toFixed(3)}%`,
    ['--sandbox360-scale' as string]: `${viewerState.scale.toFixed(5)}`
  }), [viewerState.currentPosX, viewerState.posY, viewerState.scale]);

  const clearDelayedLightFlashTimer = useCallback(() => {
    if (delayedLightFlashTimerRef.current !== null) {
      window.clearTimeout(delayedLightFlashTimerRef.current);
      delayedLightFlashTimerRef.current = null;
    }
  }, []);

  const clearRightStayTimer = useCallback(() => {
    if (rightStayTimerRef.current !== null) {
      window.clearTimeout(rightStayTimerRef.current);
      rightStayTimerRef.current = null;
    }
  }, []);

  const triggerRoomEvent = useCallback((eventType: RoomEventType, source: TriggerSource = 'manual') => {
    const now = Date.now();
    const cooldownUntil = eventCooldownMapRef.current[eventType] ?? 0;
    if (cooldownUntil > now) {
      return false;
    }

    setActiveEvents((prev) => ({
      ...prev,
      [eventType]: prev[eventType] + 1
    }));

    eventCooldownMapRef.current[eventType] = now + ROOM_EVENT_COOLDOWN_MS[eventType];

    const existingTimeout = timeoutsRef.current[eventType];
    if (existingTimeout !== null) {
      window.clearTimeout(existingTimeout);
    }
    const timeoutId = window.setTimeout(() => {
      setActiveEvents((prev) => ({
        ...prev,
        [eventType]: 0
      }));
      timeoutsRef.current[eventType] = null;
    }, ROOM_EVENT_DURATION_MS[eventType]);
    timeoutsRef.current[eventType] = timeoutId;

    if (source === 'shot_flow') {
      // no-op marker to keep shot-flow trigger path explicit in source/audits.
    }

    return true;
  }, []);

  const onShotChange = useCallback((prevShot: ShotType, nextShot: ShotType) => {
    if (prevShot === nextShot) return;

    const enteredAt = Date.now();
    shotEnterTimeRef.current = enteredAt;

    if (nextShot === 'right') {
      clearDelayedLightFlashTimer();
      delayedLightFlashTimerRef.current = window.setTimeout(() => {
        if (lastShotRef.current !== 'right') return;
        triggerRoomEvent('LIGHT_FLASH_LEFT', 'shot_flow');
      }, 500);

      clearRightStayTimer();
      rightStayTimerRef.current = window.setTimeout(() => {
        const stillOnRight = lastShotRef.current === 'right';
        const sameRightEntry = shotEnterTimeRef.current === enteredAt;
        if (!stillOnRight || !sameRightEntry) return;
        triggerRoomEvent('TV_STATIC', 'shot_flow');
      }, 3000);
    } else {
      clearDelayedLightFlashTimer();
      clearRightStayTimer();
    }

    if (prevShot === 'right' && nextShot === 'center') {
      triggerRoomEvent('DOOR_SHADOW', 'shot_flow');
    }

    if (prevShot === 'left' && nextShot === 'center') {
      triggerRoomEvent('DOLL_REFLECT', 'shot_flow');
    }
  }, [clearDelayedLightFlashTimer, clearRightStayTimer, triggerRoomEvent]);

  const triggerShot = useCallback((shot: ShotType) => {
    onDebugShotSelect(shot);
  }, [onDebugShotSelect]);

  useEffect(() => {
    const prevShot = lastShotRef.current;
    const nextShot = viewerState.currentShot;
    if (prevShot !== nextShot) {
      onShotChange(prevShot, nextShot);
      lastShotRef.current = nextShot;
    }
  }, [onShotChange, viewerState.currentShot]);

  useEffect(() => {
    const previousApi = window.__sandbox360;
    const debugApi: Sandbox360DebugApi = {
      triggerRoomEvent: (eventType) => triggerRoomEvent(eventType, 'manual'),
      overlay: {
        triggerRoomEvent: (eventType) => triggerRoomEvent(eventType, 'manual')
      },
      viewer: {
        triggerShot,
        shot: {
          left: () => triggerShot('left'),
          center: () => triggerShot('center'),
          right: () => triggerShot('right')
        }
      },
      debug: {
        triggerRoomEvent: (eventType) => triggerRoomEvent(eventType, 'manual'),
        triggerShot
      }
    };
    window.__sandbox360 = debugApi;

    return () => {
      window.__sandbox360 = previousApi;
      clearDelayedLightFlashTimer();
      clearRightStayTimer();
      (Object.keys(timeoutsRef.current) as RoomEventType[]).forEach((eventType) => {
        const timeoutId = timeoutsRef.current[eventType];
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutsRef.current[eventType] = null;
        }
      });
    };
  }, [clearDelayedLightFlashTimer, clearRightStayTimer, triggerRoomEvent, triggerShot]);

  return (
    <div
      className="sandbox360Root"
      data-shot-current={viewerState.currentShot}
      data-shot-target={viewerState.targetShot}
      style={sceneStyle}
    >
      <img
        className={`sandbox360Scene ${curseVisualClass(curse)}`.trim()}
        src={sceneImageSrc}
        alt=""
        onError={() => {
          if (sceneImageSrc !== SANDBOX360_SCENE_IMAGE_FALLBACK_SRC) {
            setSceneImageSrc(SANDBOX360_SCENE_IMAGE_FALLBACK_SRC);
            return;
          }

          setRoomLoadFailed(true);
          console.error('FAILED TO LOAD ROOM_360');
        }}
      />
      <div className="sandbox360OverlayRoomLight" aria-hidden="true" data-active={activeEvents.LIGHT_FLASH_LEFT > 0 ? 'true' : 'false'} />
      <div className="sandbox360OverlayTvNoise" aria-hidden="true" data-active={activeEvents.TV_STATIC > 0 ? 'true' : 'false'} />
      <div className="sandbox360OverlayDoll" aria-hidden="true" data-active={activeEvents.DOLL_REFLECT > 0 ? 'true' : 'false'} />
      <div className="sandbox360OverlayDoor" aria-hidden="true" data-active={activeEvents.DOOR_SHADOW > 0 ? 'true' : 'false'} />

      <div className="sandbox360UiLayer">
        {roomLoadFailed ? <div className="sandbox360RoomLoadError">FAILED TO LOAD ROOM_360</div> : null}
        <div className="sandbox360ShotState">shot: {viewerState.currentShot} → {viewerState.targetShot}</div>
        <div className="sandbox360ShotButtons">
          <button type="button" onClick={() => triggerShot('left')}>LEFT</button>
          <button type="button" onClick={() => triggerShot('center')}>CENTER</button>
          <button type="button" onClick={() => triggerShot('right')}>RIGHT</button>
        </div>
        <div className="sandbox360RoomEventButtons">
          <button type="button" onClick={() => triggerRoomEvent('LIGHT_FLASH_LEFT', 'manual')}>FLASH</button>
          <button type="button" onClick={() => triggerRoomEvent('TV_STATIC', 'manual')}>TV</button>
          <button type="button" onClick={() => triggerRoomEvent('DOLL_REFLECT', 'manual')}>DOLL</button>
          <button type="button" onClick={() => triggerRoomEvent('DOOR_SHADOW', 'manual')}>DOOR</button>
        </div>
        <div className="sandbox360Debug" aria-live="polite">
          <div>currentShot: {viewerState.currentShot}</div>
          <div>targetShot: {viewerState.targetShot}</div>
          <div>aspect: {debugState.aspect.toFixed(4)}</div>
          <div>mode: {debugState.mode}</div>
          <div>currentPosX: {viewerState.currentPosX.toFixed(2)}%</div>
          <div>targetPosX: {viewerState.targetPosX.toFixed(2)}%</div>
          <div>isTransitioning: {viewerState.isTransitioning ? 'true' : 'false'}</div>
          <div>left/center/right: {debugState.leftPosX.toFixed(2)} / {debugState.centerPosX.toFixed(2)} / {debugState.rightPosX.toFixed(2)}</div>
          <div>posError: {debugState.posError.toFixed(3)}%</div>
          <div>isSettled: {debugState.isSettled ? 'true' : 'false'}</div>
          <div>scale: {viewerState.scale.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
