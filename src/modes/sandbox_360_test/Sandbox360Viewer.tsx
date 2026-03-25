import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import { SANDBOX360_SCENE_IMAGE_FALLBACK_SRC, SANDBOX360_SCENE_IMAGE_SRC } from './assets';
import { TV_ANCHOR_CALIBRATION } from './tvAnchorCalibration';
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
type RoomEventRuntimeState = Record<RoomEventType, { active: boolean; triggerCount: number; triggerSeq: number }>;
type OverlayRect = { x: number; y: number; w: number; h: number };
type ScreenRectStyle = { left: string; top: string; width: string; height: string };
type NumericScreenRect = { x: number; y: number; w: number; h: number };
type TransformChainStep = { step: string; summary: string };
type HandheldTransformState = {
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  scale: number;
};
type ResolveTvEffectRectInput = {
  rect: OverlayRect;
  camera: SceneCameraState;
  handheld: HandheldTransformState;
  viewerSize: { width: number; height: number };
};
type ResolveTvEffectRectResult = {
  preHandheldRect: NumericScreenRect;
  finalRendererRect: NumericScreenRect;
};
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
  roomEventState: RoomEventRuntimeState;
  roomEventObservability: RoomEventObservabilityState;
  onViewerDebugStateChange?: (payload: {
    baseTvSceneRect: OverlayRect;
    preHandheldRect: NumericScreenRect;
    finalRendererRect: NumericScreenRect;
    tvScreenRect: OverlayRect;
    resolvedTvScreenRect: ScreenRectStyle;
    tvDebugRect: ScreenRectStyle;
    tvOverlayRect: ScreenRectStyle;
    tvRendererRect: ScreenRectStyle;
    renderedEffectRect: ScreenRectStyle;
    effectContentInset: string;
    effectInnerTransform: string;
    rectDiffX: string;
    rectDiffY: string;
    rectDiffW: string;
    rectDiffH: string;
    tvRectSource: string;
    transformChain: TransformChainStep[];
    tvAnchor: OverlayRect;
    tvAnchorVersion: string;
    tvAnchorCalibratedAt: string;
    tvAnchorSource: string;
    tvUsesResolvedRect: boolean;
    tvSharesTransformContainer: boolean;
    questionVisible: boolean;
    questionConsonant: string;
    roomEventLast: RoomEventType | null;
  }) => void;
  tvBoundsVisualizationEnabled?: boolean;
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
const SCENE_REFERENCE_SIZE = TV_ANCHOR_CALIBRATION.referenceScene;
const TV_ANCHOR = TV_ANCHOR_CALIBRATION.anchor;

const resolveTvEffectRect = ({ rect, camera, handheld, viewerSize }: ResolveTvEffectRectInput): ResolveTvEffectRectResult => {
  const preHandheldRect: NumericScreenRect = {
    x: (rect.x - camera.cameraX) * camera.cameraScale,
    y: (rect.y - camera.cameraY) * camera.cameraScale,
    w: rect.w * camera.cameraScale,
    h: rect.h * camera.cameraScale
  };

  const originX = viewerSize.width / 2;
  const originY = viewerSize.height / 2;
  const theta = handheld.rotationDeg * (Math.PI / 180);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const transformPoint = (x: number, y: number) => {
    const localX = x - originX;
    const localY = y - originY;
    const scaledX = localX * handheld.scale;
    const scaledY = localY * handheld.scale;
    const rotatedX = scaledX * cosTheta - scaledY * sinTheta;
    const rotatedY = scaledX * sinTheta + scaledY * cosTheta;
    return {
      x: rotatedX + originX + handheld.offsetX,
      y: rotatedY + originY + handheld.offsetY
    };
  };

  const corners = [
    transformPoint(preHandheldRect.x, preHandheldRect.y),
    transformPoint(preHandheldRect.x + preHandheldRect.w, preHandheldRect.y),
    transformPoint(preHandheldRect.x, preHandheldRect.y + preHandheldRect.h),
    transformPoint(preHandheldRect.x + preHandheldRect.w, preHandheldRect.y + preHandheldRect.h)
  ];
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    preHandheldRect,
    finalRendererRect: {
      x: minX,
      y: minY,
      w: Math.max(0, maxX - minX),
      h: Math.max(0, maxY - minY)
    }
  };
};

export default function Sandbox360Viewer({
  viewerState,
  curse,
  questionConsonant,
  questionVisible,
  pinnedReplyText = '',
  onDebugShotSelect,
  onTriggerRoomEvent,
  roomEventState,
  roomEventObservability,
  onViewerDebugStateChange,
  tvBoundsVisualizationEnabled = false
}: Props) {
  const [roomLoadFailed, setRoomLoadFailed] = useState(false);
  const [sceneImageSrc, setSceneImageSrc] = useState(SANDBOX360_SCENE_IMAGE_SRC);
  const [sceneDimensions, setSceneDimensions] = useState({ width: SCENE_DEFAULT_WIDTH, height: SCENE_DEFAULT_HEIGHT });
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const transformLayerRef = useRef<HTMLDivElement | null>(null);
  const tvDebugRef = useRef<HTMLDivElement | null>(null);
  const tvOverlayRef = useRef<HTMLDivElement | null>(null);
  const tvOverlayContentRef = useRef<HTMLDivElement | null>(null);
  const [tvSharesTransformContainer, setTvSharesTransformContainer] = useState(false);
  const [renderedEffectRect, setRenderedEffectRect] = useState<ScreenRectStyle>({ left: '-', top: '-', width: '-', height: '-' });
  const [rectDiff, setRectDiff] = useState({ x: '-', y: '-', w: '-', h: '-' });

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

  const tvScreenRect = useMemo<OverlayRect>(() => {
    const sceneWidth = cameraState.sceneWidth;
    const sceneHeight = cameraState.sceneHeight;
    const scaleX = sceneWidth / SCENE_REFERENCE_SIZE.width;
    const scaleY = sceneHeight / SCENE_REFERENCE_SIZE.height;
    return {
      x: TV_ANCHOR.x * scaleX,
      y: TV_ANCHOR.y * scaleY,
      w: TV_ANCHOR.w * scaleX,
      h: TV_ANCHOR.h * scaleY
    };
  }, [cameraState.sceneHeight, cameraState.sceneWidth]);

  const overlaySceneRects = useMemo<Record<'tv' | 'doll' | 'door' | 'roomLight', OverlayRect>>(() => {
    const sceneWidth = cameraState.sceneWidth;
    const sceneHeight = cameraState.sceneHeight;
    return {
      roomLight: { x: 0, y: 0, w: sceneWidth * 0.4, h: sceneHeight * 0.6 },
      tv: tvScreenRect,
      doll: { x: sceneWidth * 0.66, y: sceneHeight * 0.11, w: sceneWidth * 0.34, h: sceneHeight * 0.74 },
      door: { x: sceneWidth * 0.45, y: sceneHeight * 0.16, w: sceneWidth * 0.14, h: sceneHeight * 0.62 }
    };
  }, [cameraState.sceneHeight, cameraState.sceneWidth, tvScreenRect]);

  const handheldState = useMemo<HandheldTransformState>(() => ({
    offsetX: viewerState.cameraOffsetX,
    offsetY: viewerState.cameraOffsetY,
    rotationDeg: viewerState.cameraRotationDeg,
    scale: 1 + viewerState.cameraScaleOffset
  }), [viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);

  const toScreenRect = useCallback((rect: OverlayRect): NumericScreenRect => (
    resolveTvEffectRect({ rect, camera: cameraState, handheld: handheldState, viewerSize: viewportSize }).finalRendererRect
  ), [cameraState, handheldState, viewportSize]);
  const toScreenRectStyle = useCallback((rect: NumericScreenRect): ScreenRectStyle => ({
    left: `${rect.x.toFixed(3)}px`,
    top: `${rect.y.toFixed(3)}px`,
    width: `${rect.w.toFixed(3)}px`,
    height: `${rect.h.toFixed(3)}px`
  }), []);
  const baseTvSceneRect = tvScreenRect;
  const resolvedTvRect = useMemo(
    () => resolveTvEffectRect({ rect: baseTvSceneRect, camera: cameraState, handheld: handheldState, viewerSize: viewportSize }),
    [baseTvSceneRect, cameraState, handheldState, viewportSize]
  );
  const preHandheldRectNumeric = resolvedTvRect.preHandheldRect;
  const finalRendererRectNumeric = resolvedTvRect.finalRendererRect;
  const resolvedTvScreenRectNumeric = finalRendererRectNumeric;
  const resolvedTvScreenRect = useMemo(() => toScreenRectStyle(resolvedTvScreenRectNumeric), [resolvedTvScreenRectNumeric, toScreenRectStyle]);
  const tvDebugRect = resolvedTvScreenRect;
  const tvOverlayRect = resolvedTvScreenRect;
  const tvRendererRect = resolvedTvScreenRect;
  const tvUsesResolvedRect = true;
  const transformChain = useMemo<TransformChainStep[]>(() => [
    { step: 'base scene rect', summary: `x=${baseTvSceneRect.x.toFixed(3)}, y=${baseTvSceneRect.y.toFixed(3)}, w=${baseTvSceneRect.w.toFixed(3)}, h=${baseTvSceneRect.h.toFixed(3)}` },
    { step: 'camera transform', summary: `cameraX=${cameraState.cameraX.toFixed(3)}, cameraY=${cameraState.cameraY.toFixed(3)}, cameraScale=${cameraState.cameraScale.toFixed(6)} -> preHandheld x=${preHandheldRectNumeric.x.toFixed(3)}, y=${preHandheldRectNumeric.y.toFixed(3)}, w=${preHandheldRectNumeric.w.toFixed(3)}, h=${preHandheldRectNumeric.h.toFixed(3)}` },
    { step: 'aspect correction', summary: `coverScale=${(cameraState.cameraScale / viewerState.scale).toFixed(6)} (applied once in cameraScale)` },
    { step: 'handheld transform', summary: `origin=(${(viewportSize.width / 2).toFixed(3)}, ${(viewportSize.height / 2).toFixed(3)}), translate=(${handheldState.offsetX.toFixed(3)}, ${handheldState.offsetY.toFixed(3)}), rotate=${handheldState.rotationDeg.toFixed(3)}, scale=${handheldState.scale.toFixed(6)}` },
    { step: 'transition interpolation', summary: `from=${viewerState.shotTransitionFromPosX.toFixed(3)}, current=${viewerState.currentPosX.toFixed(3)}, target=${viewerState.targetPosX.toFixed(3)}, durationMs=${viewerState.shotTransitionDurationMs}, transitioning=${String(viewerState.isTransitioning)}` },
    { step: 'final renderer rect', summary: `x=${finalRendererRectNumeric.x.toFixed(3)}, y=${finalRendererRectNumeric.y.toFixed(3)}, w=${finalRendererRectNumeric.w.toFixed(3)}, h=${finalRendererRectNumeric.h.toFixed(3)} (left=${tvRendererRect.left}, top=${tvRendererRect.top}, width=${tvRendererRect.width}, height=${tvRendererRect.height})` }
  ], [baseTvSceneRect.h, baseTvSceneRect.w, baseTvSceneRect.x, baseTvSceneRect.y, cameraState.cameraScale, cameraState.cameraX, cameraState.cameraY, finalRendererRectNumeric.h, finalRendererRectNumeric.w, finalRendererRectNumeric.x, finalRendererRectNumeric.y, handheldState.offsetX, handheldState.offsetY, handheldState.rotationDeg, handheldState.scale, preHandheldRectNumeric.h, preHandheldRectNumeric.w, preHandheldRectNumeric.x, preHandheldRectNumeric.y, tvRendererRect.height, tvRendererRect.left, tvRendererRect.top, tvRendererRect.width, viewerState.currentPosX, viewerState.isTransitioning, viewerState.scale, viewerState.shotTransitionDurationMs, viewerState.shotTransitionFromPosX, viewerState.targetPosX, viewportSize.height, viewportSize.width]);

  const sceneImageStyle = useMemo(() => ({
    left: `${(-cameraState.cameraX * cameraState.cameraScale).toFixed(3)}px`,
    top: `${(-cameraState.cameraY * cameraState.cameraScale).toFixed(3)}px`,
    width: `${(cameraState.sceneWidth * cameraState.cameraScale).toFixed(3)}px`,
    height: `${(cameraState.sceneHeight * cameraState.cameraScale).toFixed(3)}px`
  }), [cameraState.cameraScale, cameraState.cameraX, cameraState.cameraY, cameraState.sceneHeight, cameraState.sceneWidth]);
  const handheldTransformStyle = useMemo(() => ({
    transform: `translate3d(${handheldState.offsetX.toFixed(3)}px, ${handheldState.offsetY.toFixed(3)}px, 0) rotate(${handheldState.rotationDeg.toFixed(3)}deg) scale(${handheldState.scale.toFixed(5)})`
  }), [handheldState.offsetX, handheldState.offsetY, handheldState.rotationDeg, handheldState.scale]);

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
    const updateRenderedEffectRect = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const content = tvOverlayContentRef.current?.getBoundingClientRect();
      if (!root || !content) return;
      const measured: ScreenRectStyle = {
        left: `${(content.left - root.left).toFixed(3)}px`,
        top: `${(content.top - root.top).toFixed(3)}px`,
        width: `${content.width.toFixed(3)}px`,
        height: `${content.height.toFixed(3)}px`
      };
      setRenderedEffectRect(measured);
      setRectDiff({
        x: `${(content.left - root.left - finalRendererRectNumeric.x).toFixed(3)}px`,
        y: `${(content.top - root.top - finalRendererRectNumeric.y).toFixed(3)}px`,
        w: `${(content.width - finalRendererRectNumeric.w).toFixed(3)}px`,
        h: `${(content.height - finalRendererRectNumeric.h).toFixed(3)}px`
      });
    };
    updateRenderedEffectRect();
    const frame = window.requestAnimationFrame(updateRenderedEffectRect);
    window.addEventListener('resize', updateRenderedEffectRect);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateRenderedEffectRect);
    };
  }, [finalRendererRectNumeric.h, finalRendererRectNumeric.w, finalRendererRectNumeric.x, finalRendererRectNumeric.y, roomEventState.TV_STATIC.active, roomEventState.TV_STATIC.triggerSeq, viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);

  useEffect(() => {
    onViewerDebugStateChange?.({
      baseTvSceneRect,
      preHandheldRect: preHandheldRectNumeric,
      finalRendererRect: finalRendererRectNumeric,
      tvScreenRect,
      resolvedTvScreenRect,
      tvDebugRect,
      tvOverlayRect,
      tvRendererRect,
      renderedEffectRect,
      effectContentInset: 'inset:0 (sandbox360OverlayTvNoiseContent)',
      effectInnerTransform: 'none (no translate/scale/origin offset)',
      rectDiffX: rectDiff.x,
      rectDiffY: rectDiff.y,
      rectDiffW: rectDiff.w,
      rectDiffH: rectDiff.h,
      tvRectSource: 'TV_ANCHOR(scene-space)->resolveTvEffectRect(single path)',
      transformChain,
      tvAnchor: TV_ANCHOR,
      tvAnchorVersion: TV_ANCHOR_CALIBRATION.version,
      tvAnchorCalibratedAt: TV_ANCHOR_CALIBRATION.calibratedAt,
      tvAnchorSource: TV_ANCHOR_CALIBRATION.source,
      tvUsesResolvedRect,
      tvSharesTransformContainer,
      questionVisible,
      questionConsonant,
      roomEventLast: roomEventObservability.eventType
    });
  }, [baseTvSceneRect, finalRendererRectNumeric, onViewerDebugStateChange, preHandheldRectNumeric, questionConsonant, questionVisible, rectDiff.h, rectDiff.w, rectDiff.x, rectDiff.y, renderedEffectRect, resolvedTvScreenRect, roomEventObservability.eventType, transformChain, tvDebugRect, tvOverlayRect, tvRendererRect, tvScreenRect, tvSharesTransformContainer, tvUsesResolvedRect]);

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
          <div key={`LIGHT_FLASH_LEFT-${roomEventState.LIGHT_FLASH_LEFT.triggerSeq}`} className="sandbox360OverlayRoomLight" style={toScreenRectStyle(toScreenRect(overlaySceneRects.roomLight))} data-active={roomEventState.LIGHT_FLASH_LEFT.active ? 'true' : 'false'} />
          <div key={`TV_STATIC_DEBUG-${roomEventState.TV_STATIC.triggerSeq}`} ref={tvDebugRef} className="sandbox360OverlayTvDebug" style={tvDebugRect} data-active={roomEventState.TV_STATIC.active ? 'true' : 'false'} />
          <div key={`TV_STATIC_OVERLAY-${roomEventState.TV_STATIC.triggerSeq}`} ref={tvOverlayRef} className="sandbox360OverlayTvNoise" style={tvRendererRect} data-active={roomEventState.TV_STATIC.active ? 'true' : 'false'} data-viz={tvBoundsVisualizationEnabled ? 'true' : 'false'}>
            <div ref={tvOverlayContentRef} className="sandbox360OverlayTvNoiseContent" data-active={roomEventState.TV_STATIC.active ? 'true' : 'false'} />
          </div>
          <div key={`DOLL_REFLECT-${roomEventState.DOLL_REFLECT.triggerSeq}`} className="sandbox360OverlayDoll" style={toScreenRectStyle(toScreenRect(overlaySceneRects.doll))} data-active={roomEventState.DOLL_REFLECT.active ? 'true' : 'false'} />
          <div key={`DOOR_SHADOW-${roomEventState.DOOR_SHADOW.triggerSeq}`} className="sandbox360OverlayDoor" style={toScreenRectStyle(toScreenRect(overlaySceneRects.door))} data-active={roomEventState.DOOR_SHADOW.active ? 'true' : 'false'} />
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
        </div>
      </div>
    </div>
  );
}
