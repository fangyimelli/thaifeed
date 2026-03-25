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
  shotTransitionStartedAt: number;
  shotTransitionDurationMs: number;
  shotTransitionFromPosX: number;
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
  lastBlockedReason?: string;
  forceAllowed?: boolean;
  forceReason?: string;
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
  questionConsonant: string;
  questionVisible: boolean;
  pinnedReplyText?: string;
  onDebugShotSelect: (shot: ShotType) => void;
  onTriggerRoomEvent: (eventType: RoomEventType, options?: TriggerRoomEventOptions) => boolean;
  roomEventCounts: Record<RoomEventType, number>;
  roomEventObservability: RoomEventObservabilityState;
  onViewerDebugStateChange?: (payload: {
    tvDebugRect: { left: string; top: string; width: string; height: string };
    tvOverlayRect: { left: string; top: string; width: string; height: string };
    tvAnchor: OverlayRect;
    tvSharesTransformContainer: boolean;
    questionVisible: boolean;
    questionConsonant: string;
    roomEventLast: RoomEventType | null;
  }) => void;
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

const SCENE_DEFAULT_WIDTH = 4096;
const SCENE_DEFAULT_HEIGHT = 2048;
const SCENE_REFERENCE_SIZE = { width: 4096, height: 2048 } as const;
const TV_ANCHOR = { x: 2256, y: 1054, w: 220, h: 118 } as const;

export default function Sandbox360Viewer({
  viewerState,
  curse,
  questionConsonant,
  questionVisible,
  pinnedReplyText = '',
  onDebugShotSelect,
  onTriggerRoomEvent,
  roomEventCounts,
  roomEventObservability,
  onViewerDebugStateChange
}: Props) {
  const [roomLoadFailed, setRoomLoadFailed] = useState(false);
  const [sceneImageSrc, setSceneImageSrc] = useState(SANDBOX360_SCENE_IMAGE_SRC);
  const [sceneDimensions, setSceneDimensions] = useState({ width: SCENE_DEFAULT_WIDTH, height: SCENE_DEFAULT_HEIGHT });
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const transformLayerRef = useRef<HTMLDivElement | null>(null);
  const tvDebugRef = useRef<HTMLDivElement | null>(null);
  const tvOverlayRef = useRef<HTMLDivElement | null>(null);
  const [tvSharesTransformContainer, setTvSharesTransformContainer] = useState(false);

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
    const scaleX = sceneWidth / SCENE_REFERENCE_SIZE.width;
    const scaleY = sceneHeight / SCENE_REFERENCE_SIZE.height;
    const tvAnchorRect: OverlayRect = {
      x: TV_ANCHOR.x * scaleX,
      y: TV_ANCHOR.y * scaleY,
      w: TV_ANCHOR.w * scaleX,
      h: TV_ANCHOR.h * scaleY
    };
    return {
      roomLight: { x: 0, y: 0, w: sceneWidth * 0.4, h: sceneHeight * 0.6 },
      tv: tvAnchorRect,
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
  const tvDebugRect = useMemo(() => toScreenRect(overlaySceneRects.tv), [overlaySceneRects.tv, toScreenRect]);
  const tvOverlayRect = useMemo(() => toScreenRect(overlaySceneRects.tv), [overlaySceneRects.tv, toScreenRect]);

  const sceneImageStyle = useMemo(() => ({
    left: `${(-cameraState.cameraX * cameraState.cameraScale).toFixed(3)}px`,
    top: `${(-cameraState.cameraY * cameraState.cameraScale).toFixed(3)}px`,
    width: `${(cameraState.sceneWidth * cameraState.cameraScale).toFixed(3)}px`,
    height: `${(cameraState.sceneHeight * cameraState.cameraScale).toFixed(3)}px`
  }), [cameraState.cameraScale, cameraState.cameraX, cameraState.cameraY, cameraState.sceneHeight, cameraState.sceneWidth]);
  const handheldTransformStyle = useMemo(() => ({
    transform: `translate3d(${viewerState.cameraOffsetX.toFixed(3)}px, ${viewerState.cameraOffsetY.toFixed(3)}px, 0) rotate(${viewerState.cameraRotationDeg.toFixed(3)}deg) scale(${(1 + viewerState.cameraScaleOffset).toFixed(5)})`
  }), [viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);

  const triggerRoomEvent = useCallback((eventType: RoomEventType, options?: TriggerRoomEventOptions) => (
    onTriggerRoomEvent(eventType, options)
  ), [onTriggerRoomEvent]);

  const triggerShot = useCallback((shot: ShotType) => {
    onDebugShotSelect(shot);
  }, [onDebugShotSelect]);

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
      forceRoomEvent: (eventType) => onTriggerRoomEvent(eventType, { force: true, source: 'manual' }),
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
        triggerRoomEvent: (eventType) => onTriggerRoomEvent(eventType, { force: true, source: 'manual' }),
        forceRoomEvent: (eventType) => onTriggerRoomEvent(eventType, { force: true, source: 'manual' }),
        triggerShot
      }
    };
    window.__sandbox360 = debugApi;

    return () => {
      window.__sandbox360 = previousApi;
    };
  }, [onTriggerRoomEvent, triggerRoomEvent, triggerShot]);

  useEffect(() => {
    const transformLayer = transformLayerRef.current;
    const tvDebugEl = tvDebugRef.current;
    const tvOverlayEl = tvOverlayRef.current;
    const debugContainer = tvDebugEl?.closest('.sandbox360TransformLayer');
    const overlayContainer = tvOverlayEl?.closest('.sandbox360TransformLayer');
    setTvSharesTransformContainer(Boolean(
      transformLayer &&
      debugContainer &&
      overlayContainer &&
      debugContainer === overlayContainer &&
      debugContainer === transformLayer
    ));
  }, [tvDebugRect, tvOverlayRect]);

  useEffect(() => {
    onViewerDebugStateChange?.({
      tvDebugRect,
      tvOverlayRect,
      tvAnchor: TV_ANCHOR,
      tvSharesTransformContainer,
      questionVisible,
      questionConsonant,
      roomEventLast: roomEventObservability.eventType
    });
  }, [onViewerDebugStateChange, questionConsonant, questionVisible, roomEventObservability.eventType, tvDebugRect, tvOverlayRect, tvSharesTransformContainer]);

  return (
    <div
      ref={rootRef}
      className="sandbox360Root"
      data-shot-current={viewerState.currentShot}
      data-shot-target={viewerState.targetShot}
    >
      <div ref={transformLayerRef} className="sandbox360TransformLayer" style={handheldTransformStyle}>
        <div className="sandbox360SceneLayer">
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
        </div>
        <div className="sandbox360OverlayLayer" aria-hidden="true">
          <div className="sandbox360OverlayRoomLight" style={toScreenRect(overlaySceneRects.roomLight)} data-active={roomEventCounts.LIGHT_FLASH_LEFT > 0 ? 'true' : 'false'} />
          <div ref={tvDebugRef} className="sandbox360OverlayTvDebug" style={tvDebugRect} data-active={roomEventCounts.TV_STATIC > 0 ? 'true' : 'false'} />
          <div ref={tvOverlayRef} className="sandbox360OverlayTvNoise" style={tvOverlayRect} data-active={roomEventCounts.TV_STATIC > 0 ? 'true' : 'false'} />
          <div className="sandbox360OverlayDoll" style={toScreenRect(overlaySceneRects.doll)} data-active={roomEventCounts.DOLL_REFLECT > 0 ? 'true' : 'false'} />
          <div className="sandbox360OverlayDoor" style={toScreenRect(overlaySceneRects.door)} data-active={roomEventCounts.DOOR_SHADOW > 0 ? 'true' : 'false'} />
        </div>
      </div>

      <div className="sandbox360UiLayer">
        <div className="sandbox360QuestionPanel" data-visible={questionVisible ? 'true' : 'false'}>
          {questionVisible ? <span className="glyph-blink sandbox-story-prompt-glyph">{questionConsonant || '·'}</span> : null}
        </div>
        <div className="sandbox360PinnedReply" data-visible={pinnedReplyText ? 'true' : 'false'}>
          {pinnedReplyText ? <span>{pinnedReplyText}</span> : null}
        </div>
        <div className="sandbox360ChatLayer">
          {roomLoadFailed ? <div className="sandbox360RoomLoadError">FAILED TO LOAD ROOM_360</div> : null}
          <div className="sandbox360ShotState">shot: {viewerState.currentShot} → {viewerState.targetShot}</div>
        </div>
      </div>
    </div>
  );
}
