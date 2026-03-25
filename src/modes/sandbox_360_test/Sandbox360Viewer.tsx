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
  cameraOffsetX: number;
  cameraOffsetY: number;
  cameraRotationDeg: number;
  cameraScaleOffset: number;
  cameraVelocityX: number;
  cameraVelocityY: number;
  posY: number;
  scale: number;
  lastCommand?: string;
};

type ShotType = 'left' | 'center' | 'right';
type RoomEventType = 'LIGHT_FLASH_LEFT' | 'TV_STATIC' | 'DOLL_REFLECT' | 'DOOR_SHADOW';
type TriggerSource = 'manual' | 'shot_flow' | 'auto' | 'scripted';
type TriggerRoomEventOptions = {
  source: TriggerSource;
  force?: boolean;
  ignoreCooldown?: boolean;
};
type RoomEventTriggerMode = 'normal' | 'force';
type RoomEventObservabilityState = {
  eventType: RoomEventType | null;
  triggerMode: RoomEventTriggerMode;
  cooldownBypassed: boolean;
  lastTriggeredAt: number | null;
};
type OverlayRect = { x: number; y: number; w: number; h: number };
type SceneCameraState = {
  sceneWidth: number;
  sceneHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY: number;
  cameraScale: number;
};

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
  triggerRoomEvent: (eventType: RoomEventType, options?: TriggerRoomEventOptions) => boolean;
  forceRoomEvent: (eventType: RoomEventType) => boolean;
  overlay: {
    triggerRoomEvent: (eventType: RoomEventType, options?: TriggerRoomEventOptions) => boolean;
  };
  viewer: {
    triggerShot: (shot: ShotType) => void;
    shot: Record<ShotType, () => void>;
  };
  debug: {
    triggerRoomEvent: (eventType: RoomEventType, options?: TriggerRoomEventOptions) => boolean;
    forceRoomEvent: (eventType: RoomEventType) => boolean;
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

const SCENE_DEFAULT_WIDTH = 4096;
const SCENE_DEFAULT_HEIGHT = 2048;

export default function Sandbox360Viewer({ viewerState, curse, debugState, onDebugShotSelect }: Props) {
  const [roomLoadFailed, setRoomLoadFailed] = useState(false);
  const [sceneImageSrc, setSceneImageSrc] = useState(SANDBOX360_SCENE_IMAGE_SRC);
  const [sceneDimensions, setSceneDimensions] = useState({ width: SCENE_DEFAULT_WIDTH, height: SCENE_DEFAULT_HEIGHT });
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const [activeEvents, setActiveEvents] = useState<Record<RoomEventType, number>>({
    LIGHT_FLASH_LEFT: 0,
    TV_STATIC: 0,
    DOLL_REFLECT: 0,
    DOOR_SHADOW: 0
  });
  const [roomEventObservability, setRoomEventObservability] = useState<RoomEventObservabilityState>({
    eventType: null,
    triggerMode: 'normal',
    cooldownBypassed: false,
    lastTriggeredAt: null
  });
  const timeoutsRef = useRef<Record<RoomEventType, number | null>>({
    LIGHT_FLASH_LEFT: null,
    TV_STATIC: null,
    DOLL_REFLECT: null,
    DOOR_SHADOW: null
  });
  const delayedLightFlashTimerRef = useRef<number | null>(null);
  const rightStayTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastShotRef = useRef<ShotType>(viewerState.currentShot);
  const shotEnterTimeRef = useRef<number>(Date.now());
  const eventCooldownMapRef = useRef<Record<RoomEventType, number>>({
    LIGHT_FLASH_LEFT: 0,
    TV_STATIC: 0,
    DOLL_REFLECT: 0,
    DOOR_SHADOW: 0
  });
  const roomEventObservabilityRef = useRef<RoomEventObservabilityState>({
    eventType: null,
    triggerMode: 'normal',
    cooldownBypassed: false,
    lastTriggeredAt: null
  });

  const cameraState = useMemo<SceneCameraState>(() => {
    const sceneWidth = Math.max(1, sceneDimensions.width);
    const sceneHeight = Math.max(1, sceneDimensions.height);
    const viewportWidth = Math.max(1, viewportSize.width);
    const viewportHeight = Math.max(1, viewportSize.height);
    const coverScale = Math.max(viewportWidth / sceneWidth, viewportHeight / sceneHeight);
    const cameraScale = coverScale * viewerState.scale;
    const focusX = (viewerState.currentPosX / 100) * sceneWidth;
    const focusY = (viewerState.posY / 100) * sceneHeight;

    return {
      sceneWidth,
      sceneHeight,
      viewportWidth,
      viewportHeight,
      cameraX: focusX - viewportWidth / (2 * cameraScale),
      cameraY: focusY - viewportHeight / (2 * cameraScale),
      cameraScale
    };
  }, [sceneDimensions.height, sceneDimensions.width, viewerState.currentPosX, viewerState.posY, viewerState.scale, viewportSize.height, viewportSize.width]);

  const overlaySceneRects = useMemo<Record<'tv' | 'doll' | 'door' | 'roomLight', OverlayRect>>(() => {
    const sceneWidth = cameraState.sceneWidth;
    const sceneHeight = cameraState.sceneHeight;
    return {
      roomLight: { x: 0, y: 0, w: sceneWidth * 0.4, h: sceneHeight * 0.6 },
      tv: { x: sceneWidth * 0.67, y: sceneHeight * 0.65, w: sceneWidth * 0.13, h: sceneHeight * 0.12 },
      doll: { x: sceneWidth * 0.66, y: sceneHeight * 0.11, w: sceneWidth * 0.34, h: sceneHeight * 0.74 },
      door: { x: sceneWidth * 0.45, y: sceneHeight * 0.16, w: sceneWidth * 0.14, h: sceneHeight * 0.62 }
    };
  }, [cameraState.sceneHeight, cameraState.sceneWidth]);

  const toScreenRect = useCallback((rect: OverlayRect) => ({
    left: `${(rect.x - cameraState.cameraX) * cameraState.cameraScale}px`,
    top: `${(rect.y - cameraState.cameraY) * cameraState.cameraScale}px`,
    width: `${rect.w * cameraState.cameraScale}px`,
    height: `${rect.h * cameraState.cameraScale}px`
  }), [cameraState.cameraScale, cameraState.cameraX, cameraState.cameraY]);

  const sceneImageStyle = useMemo(() => ({
    left: `${(-cameraState.cameraX * cameraState.cameraScale).toFixed(3)}px`,
    top: `${(-cameraState.cameraY * cameraState.cameraScale).toFixed(3)}px`,
    width: `${(cameraState.sceneWidth * cameraState.cameraScale).toFixed(3)}px`,
    height: `${(cameraState.sceneHeight * cameraState.cameraScale).toFixed(3)}px`
  }), [cameraState.cameraScale, cameraState.cameraX, cameraState.cameraY, cameraState.sceneHeight, cameraState.sceneWidth]);
  const handheldTransformStyle = useMemo(() => ({
    transform: `translate3d(${viewerState.cameraOffsetX.toFixed(3)}px, ${viewerState.cameraOffsetY.toFixed(3)}px, 0) rotate(${viewerState.cameraRotationDeg.toFixed(3)}deg) scale(${(1 + viewerState.cameraScaleOffset).toFixed(5)})`
  }), [viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);

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

  const triggerRoomEvent = useCallback((eventType: RoomEventType, options?: TriggerRoomEventOptions) => {
    const source = options?.source ?? 'manual';
    const triggerMode: RoomEventTriggerMode = options?.force === true ? 'force' : 'normal';
    const shouldBypassCooldown = Boolean(options?.force || options?.ignoreCooldown);
    const now = Date.now();
    const cooldownUntil = eventCooldownMapRef.current[eventType] ?? 0;
    if (!shouldBypassCooldown && cooldownUntil > now) {
      return false;
    }

    const nextObservabilityState: RoomEventObservabilityState = {
      eventType,
      triggerMode,
      cooldownBypassed: shouldBypassCooldown,
      lastTriggeredAt: now
    };
    roomEventObservabilityRef.current = nextObservabilityState;
    setRoomEventObservability(nextObservabilityState);

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

  const forceRoomEvent = useCallback((eventType: RoomEventType) => (
    triggerRoomEvent(eventType, { force: true, source: 'manual' })
  ), [triggerRoomEvent]);

  const onShotChange = useCallback((prevShot: ShotType, nextShot: ShotType) => {
    if (prevShot === nextShot) return;

    const enteredAt = Date.now();
    shotEnterTimeRef.current = enteredAt;

    if (nextShot === 'right') {
      clearDelayedLightFlashTimer();
      delayedLightFlashTimerRef.current = window.setTimeout(() => {
        if (lastShotRef.current !== 'right') return;
        triggerRoomEvent('LIGHT_FLASH_LEFT', { source: 'shot_flow' });
      }, 500);

      clearRightStayTimer();
      rightStayTimerRef.current = window.setTimeout(() => {
        const stillOnRight = lastShotRef.current === 'right';
        const sameRightEntry = shotEnterTimeRef.current === enteredAt;
        if (!stillOnRight || !sameRightEntry) return;
        triggerRoomEvent('TV_STATIC', { source: 'shot_flow' });
      }, 3000);
    } else {
      clearDelayedLightFlashTimer();
      clearRightStayTimer();
    }

    if (prevShot === 'right' && nextShot === 'center') {
      triggerRoomEvent('DOOR_SHADOW', { source: 'shot_flow' });
    }

    if (prevShot === 'left' && nextShot === 'center') {
      triggerRoomEvent('DOLL_REFLECT', { source: 'shot_flow' });
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
    const updateViewportSize = () => {
      const root = rootRef.current;
      if (!root) return;
      setViewportSize({ width: root.clientWidth || 1, height: root.clientHeight || 1 });
    };
    updateViewportSize();
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previousApi = window.__sandbox360;
    const debugApi: Sandbox360DebugApi = {
      triggerRoomEvent: (eventType, options) => triggerRoomEvent(eventType, options),
      forceRoomEvent,
      overlay: {
        triggerRoomEvent: (eventType, options) => triggerRoomEvent(eventType, options)
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
        triggerRoomEvent: (eventType) => forceRoomEvent(eventType),
        forceRoomEvent,
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
  }, [clearDelayedLightFlashTimer, clearRightStayTimer, forceRoomEvent, triggerRoomEvent, triggerShot]);

  return (
    <div
      ref={rootRef}
      className="sandbox360Root"
      data-shot-current={viewerState.currentShot}
      data-shot-target={viewerState.targetShot}
    >
      <div className="sandbox360TransformLayer" style={handheldTransformStyle}>
        <img
          className={`sandbox360Scene ${curseVisualClass(curse)}`.trim()}
          src={sceneImageSrc}
          alt=""
          style={sceneImageStyle}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setSceneDimensions({ width: image.naturalWidth, height: image.naturalHeight });
            }
          }}
          onError={() => {
            if (sceneImageSrc !== SANDBOX360_SCENE_IMAGE_FALLBACK_SRC) {
              setSceneImageSrc(SANDBOX360_SCENE_IMAGE_FALLBACK_SRC);
              return;
            }

            setRoomLoadFailed(true);
            console.error('FAILED TO LOAD ROOM_360');
          }}
        />
        <div className="sandbox360OverlayRoomLight" style={toScreenRect(overlaySceneRects.roomLight)} aria-hidden="true" data-active={activeEvents.LIGHT_FLASH_LEFT > 0 ? 'true' : 'false'} />
        <div className="sandbox360OverlayTvNoise" style={toScreenRect(overlaySceneRects.tv)} aria-hidden="true" data-active={activeEvents.TV_STATIC > 0 ? 'true' : 'false'} />
        <div className="sandbox360OverlayDoll" style={toScreenRect(overlaySceneRects.doll)} aria-hidden="true" data-active={activeEvents.DOLL_REFLECT > 0 ? 'true' : 'false'} />
        <div className="sandbox360OverlayDoor" style={toScreenRect(overlaySceneRects.door)} aria-hidden="true" data-active={activeEvents.DOOR_SHADOW > 0 ? 'true' : 'false'} />
      </div>

      <div className="sandbox360UiLayer">
        {roomLoadFailed ? <div className="sandbox360RoomLoadError">FAILED TO LOAD ROOM_360</div> : null}
        <div className="sandbox360ShotState">shot: {viewerState.currentShot} → {viewerState.targetShot}</div>
        <div className="sandbox360ShotButtons">
          <button type="button" onClick={() => triggerShot('left')}>LEFT</button>
          <button type="button" onClick={() => triggerShot('center')}>CENTER</button>
          <button type="button" onClick={() => triggerShot('right')}>RIGHT</button>
        </div>
        <div className="sandbox360RoomEventButtons">
          <button type="button" onClick={() => forceRoomEvent('LIGHT_FLASH_LEFT')}>FLASH</button>
          <button type="button" onClick={() => forceRoomEvent('TV_STATIC')}>TV</button>
          <button type="button" onClick={() => forceRoomEvent('DOLL_REFLECT')}>DOLL</button>
          <button type="button" onClick={() => forceRoomEvent('DOOR_SHADOW')}>DOOR</button>
        </div>
        <div className="sandbox360Debug" aria-live="polite">
          <div>currentShot: {viewerState.currentShot}</div>
          <div>targetShot: {viewerState.targetShot}</div>
          <div>aspect: {debugState.aspect.toFixed(4)}</div>
          <div>mode: {debugState.mode}</div>
          <div>currentPosX: {viewerState.currentPosX.toFixed(2)}%</div>
          <div>targetPosX: {viewerState.targetPosX.toFixed(2)}%</div>
          <div>isTransitioning: {viewerState.isTransitioning ? 'true' : 'false'}</div>
          <div>cameraOffsetX: {viewerState.cameraOffsetX.toFixed(3)}px</div>
          <div>cameraOffsetY: {viewerState.cameraOffsetY.toFixed(3)}px</div>
          <div>cameraRotationDeg: {viewerState.cameraRotationDeg.toFixed(4)}°</div>
          <div>cameraScaleOffset: {viewerState.cameraScaleOffset.toFixed(5)}</div>
          <div>eventType: {roomEventObservability.eventType ?? 'null'}</div>
          <div>triggerMode: {roomEventObservability.triggerMode}</div>
          <div>cooldownBypassed: {roomEventObservability.cooldownBypassed ? 'true' : 'false'}</div>
          <div>lastTriggeredAt: {roomEventObservability.lastTriggeredAt ?? 'null'}</div>
        </div>
      </div>
    </div>
  );
}
