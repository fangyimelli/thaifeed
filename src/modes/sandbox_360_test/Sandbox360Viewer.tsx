import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import { SANDBOX360_SCENE_IMAGE_SRC } from './assets';
import './sandbox360Viewer.css';

export type Sandbox360ViewerState = {
  currentShot: 'left' | 'center' | 'right';
  targetShot: 'left' | 'center' | 'right';
  currentPosX: number;
  targetPosX: number;
  posY: number;
  scale: number;
  lastCommand?: string;
};

type RoomEventType = 'LIGHT_FLASH_LEFT' | 'TV_STATIC' | 'DOLL_REFLECT' | 'DOOR_SHADOW';

type Props = {
  viewerState: Sandbox360ViewerState;
  curse: number;
  onDebugShotSelect: (shot: 'left' | 'center' | 'right') => void;
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

declare global {
  interface Window {
    triggerRoomEvent?: (eventType: RoomEventType) => void;
  }
}

const ROOM_EVENT_DURATION_MS: Record<RoomEventType, number> = {
  LIGHT_FLASH_LEFT: 180,
  TV_STATIC: 1200,
  DOLL_REFLECT: 520,
  DOOR_SHADOW: 900
};

export default function Sandbox360Viewer({ viewerState, curse, debugState, onDebugShotSelect }: Props) {
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

  const sceneStyle = useMemo(() => ({
    ['--sandbox360-object-pos-x' as string]: `${viewerState.currentPosX.toFixed(3)}%`,
    ['--sandbox360-object-pos-y' as string]: `${viewerState.posY.toFixed(3)}%`,
    ['--sandbox360-scale' as string]: `${viewerState.scale.toFixed(5)}`
  }), [viewerState.currentPosX, viewerState.posY, viewerState.scale]);

  const triggerRoomEvent = useCallback((eventType: RoomEventType) => {
    setActiveEvents((prev) => ({
      ...prev,
      [eventType]: prev[eventType] + 1
    }));

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
  }, []);

  useEffect(() => {
    const previousApi = window.triggerRoomEvent;
    window.triggerRoomEvent = (eventType: RoomEventType) => {
      triggerRoomEvent(eventType);
    };
    return () => {
      window.triggerRoomEvent = previousApi;
      (Object.keys(timeoutsRef.current) as RoomEventType[]).forEach((eventType) => {
        const timeoutId = timeoutsRef.current[eventType];
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutsRef.current[eventType] = null;
        }
      });
    };
  }, [triggerRoomEvent]);

  return (
    <div
      className="sandbox360Root"
      data-shot-current={viewerState.currentShot}
      data-shot-target={viewerState.targetShot}
      style={sceneStyle}
    >
      <img className={`sandbox360Scene ${curseVisualClass(curse)}`.trim()} src={SANDBOX360_SCENE_IMAGE_SRC} alt="" />
      <div className="sandbox360OverlayRoomLight" aria-hidden="true" data-active={activeEvents.LIGHT_FLASH_LEFT > 0 ? 'true' : 'false'} />
      <div className="sandbox360OverlayTvNoise" aria-hidden="true" data-active={activeEvents.TV_STATIC > 0 ? 'true' : 'false'} />
      <div className="sandbox360OverlayDoll" aria-hidden="true" data-active={activeEvents.DOLL_REFLECT > 0 ? 'true' : 'false'} />
      <div className="sandbox360OverlayDoor" aria-hidden="true" data-active={activeEvents.DOOR_SHADOW > 0 ? 'true' : 'false'} />

      <div className="sandbox360UiLayer">
        <div className="sandbox360ShotState">shot: {viewerState.currentShot} → {viewerState.targetShot}</div>
        <div className="sandbox360ShotButtons">
          <button type="button" onClick={() => onDebugShotSelect('left')}>LEFT</button>
          <button type="button" onClick={() => onDebugShotSelect('center')}>CENTER</button>
          <button type="button" onClick={() => onDebugShotSelect('right')}>RIGHT</button>
        </div>
        <div className="sandbox360RoomEventButtons">
          <button type="button" onClick={() => triggerRoomEvent('LIGHT_FLASH_LEFT')}>FLASH</button>
          <button type="button" onClick={() => triggerRoomEvent('TV_STATIC')}>TV</button>
          <button type="button" onClick={() => triggerRoomEvent('DOLL_REFLECT')}>DOLL</button>
          <button type="button" onClick={() => triggerRoomEvent('DOOR_SHADOW')}>DOOR</button>
        </div>
        <div className="sandbox360Debug" aria-live="polite">
          <div>aspect: {debugState.aspect.toFixed(4)}</div>
          <div>mode: {debugState.mode}</div>
          <div>currentPosX: {viewerState.currentPosX.toFixed(2)}%</div>
          <div>targetPosX: {viewerState.targetPosX.toFixed(2)}%</div>
          <div>left/center/right: {debugState.leftPosX.toFixed(2)} / {debugState.centerPosX.toFixed(2)} / {debugState.rightPosX.toFixed(2)}</div>
          <div>posError: {debugState.posError.toFixed(3)}%</div>
          <div>isSettled: {debugState.isSettled ? 'true' : 'false'}</div>
          <div>scale: {viewerState.scale.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
