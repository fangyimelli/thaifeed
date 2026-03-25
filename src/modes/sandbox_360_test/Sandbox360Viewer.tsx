import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import { SANDBOX360_SCENE_IMAGE_FALLBACK_SRC, SANDBOX360_SCENE_IMAGE_SRC } from './assets';
import { TV_ANCHOR_CALIBRATION, type TvScreenQuad, type TvScreenQuadPoint } from './tvAnchorCalibration';
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
type QuadStyle = { topLeft: string; topRight: string; bottomRight: string; bottomLeft: string };
type ScreenRectStyle = { left: string; top: string; width: string; height: string };
type NumericScreenRect = { x: number; y: number; w: number; h: number };
type TransformChainStep = { step: string; summary: string; data: Record<string, number | string | boolean | undefined> };
type TvGeometryKind = 'rect' | 'quad';
type RendererGeometryKind = 'authored_quad' | 'fallback_rect';
type ResolveTvEffectGeometryInput = {
  baseQuad: TvScreenQuad;
  camera: SceneCameraState;
  handheld: Pick<Sandbox360ViewerState, 'cameraOffsetX' | 'cameraOffsetY' | 'cameraRotationDeg' | 'cameraScaleOffset'>;
};
type ResolveTvEffectGeometryResult = {
  preTransformQuad: TvScreenQuad;
  finalResolvedQuad: TvScreenQuad;
  preTransformBoundingRect: NumericScreenRect;
  finalResolvedBoundingRect: NumericScreenRect;
};
type HandheldTransformState = { offsetX: number; offsetY: number; rotationDeg: number; scale: number };
type TransitionState = {
  isTransitioning: boolean;
  startedAt: number;
  durationMs: number;
  fromPosX: number;
  currentPosX: number;
  targetPosX: number;
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
type TvTargetRegionKind = 'tv_outer_frame' | 'tv_body' | 'tv_screen_inner';

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
    baseSceneWidth: number;
    baseSceneHeight: number;
    tvGeometryKind: TvGeometryKind;
    tvTargetRegionKind: TvTargetRegionKind;
    geometrySource: string;
    rendererGeometrySource: string;
    rendererGeometryKind: RendererGeometryKind;
    rendererFallbackReason: string;
    baseTvScreenQuad: TvScreenQuad;
    resolvedTvScreenQuad: TvScreenQuad;
    resolvedTvBoundingRect: ScreenRectStyle;
    renderedEffectBounds: ScreenRectStyle;
    renderedEffectRect: ScreenRectStyle;
    effectVisibleBounds: ScreenRectStyle;
    quadDiff: string;
    quadPolygon: QuadStyle;
    transformChain: TransformChainStep[];
    transitionState: TransitionState;
    currentShot: ShotType;
    targetShot: ShotType;
    rendererUsesResolvedQuad: boolean;
    effectContentUsesResolvedQuad: boolean;
    rendererUsesResolvedGeometry: boolean;
    effectContentUsesResolvedGeometry: boolean;
    tvAnchor: TvScreenQuad;
    tvAnchorVersion: string;
    tvAnchorCalibratedAt: string;
    tvAnchorSource: string;
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
const TV_GEOMETRY_KIND: TvGeometryKind = 'quad';
const TV_TARGET_REGION_KIND: TvTargetRegionKind = TV_ANCHOR_CALIBRATION.tvTargetRegionKind;
const TV_SCREEN_GEOMETRY_BY_SHOT = 'TV_SCREEN_GEOMETRY_BY_SHOT';

const resolveTvEffectGeometry = ({ baseQuad, camera, handheld }: ResolveTvEffectGeometryInput): ResolveTvEffectGeometryResult => {
  const toPreTransformPoint = (point: TvScreenQuadPoint): TvScreenQuadPoint => ({
    x: (point.x - camera.cameraX) * camera.cameraScale,
    y: (point.y - camera.cameraY) * camera.cameraScale
  });
  const preTransformQuad: TvScreenQuad = {
    topLeft: toPreTransformPoint(baseQuad.topLeft),
    topRight: toPreTransformPoint(baseQuad.topRight),
    bottomRight: toPreTransformPoint(baseQuad.bottomRight),
    bottomLeft: toPreTransformPoint(baseQuad.bottomLeft)
  };
  const handheldScale = 1 + handheld.cameraScaleOffset;
  const theta = (handheld.cameraRotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const originX = camera.viewportWidth / 2;
  const originY = camera.viewportHeight / 2;

  const applyHandheldTransform = (point: TvScreenQuadPoint): TvScreenQuadPoint => {
    const localX = point.x - originX;
    const localY = point.y - originY;
    const scaledX = localX * handheldScale;
    const scaledY = localY * handheldScale;
    const rotatedX = scaledX * cos - scaledY * sin;
    const rotatedY = scaledX * sin + scaledY * cos;
    return {
      x: rotatedX + originX + handheld.cameraOffsetX,
      y: rotatedY + originY + handheld.cameraOffsetY
    };
  };
  const finalResolvedQuad: TvScreenQuad = {
    topLeft: applyHandheldTransform(preTransformQuad.topLeft),
    topRight: applyHandheldTransform(preTransformQuad.topRight),
    bottomRight: applyHandheldTransform(preTransformQuad.bottomRight),
    bottomLeft: applyHandheldTransform(preTransformQuad.bottomLeft)
  };
  const toBoundingRect = (quad: TvScreenQuad): NumericScreenRect => {
    const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  };
  const preTransformBoundingRect = toBoundingRect(preTransformQuad);
  const finalResolvedBoundingRect = toBoundingRect(finalResolvedQuad);

  return { preTransformQuad, finalResolvedQuad, preTransformBoundingRect, finalResolvedBoundingRect };
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
  const interpolateQuad = useCallback((from: TvScreenQuad, to: TvScreenQuad, progress: number): TvScreenQuad => {
    const t = Math.min(1, Math.max(0, progress));
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return {
      topLeft: { x: lerp(from.topLeft.x, to.topLeft.x), y: lerp(from.topLeft.y, to.topLeft.y) },
      topRight: { x: lerp(from.topRight.x, to.topRight.x), y: lerp(from.topRight.y, to.topRight.y) },
      bottomRight: { x: lerp(from.bottomRight.x, to.bottomRight.x), y: lerp(from.bottomRight.y, to.bottomRight.y) },
      bottomLeft: { x: lerp(from.bottomLeft.x, to.bottomLeft.x), y: lerp(from.bottomLeft.y, to.bottomLeft.y) }
    };
  }, []);
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
  const [effectVisibleBounds, setEffectVisibleBounds] = useState<ScreenRectStyle>({ left: '-', top: '-', width: '-', height: '-' });
  const [quadDiff, setQuadDiff] = useState('-');

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

  const scaleQuad = useCallback((quad: TvScreenQuad): TvScreenQuad => {
    const scaleX = cameraState.sceneWidth / SCENE_REFERENCE_SIZE.width;
    const scaleY = cameraState.sceneHeight / SCENE_REFERENCE_SIZE.height;
    return {
      topLeft: { x: quad.topLeft.x * scaleX, y: quad.topLeft.y * scaleY },
      topRight: { x: quad.topRight.x * scaleX, y: quad.topRight.y * scaleY },
      bottomRight: { x: quad.bottomRight.x * scaleX, y: quad.bottomRight.y * scaleY },
      bottomLeft: { x: quad.bottomLeft.x * scaleX, y: quad.bottomLeft.y * scaleY }
    };
  }, [cameraState.sceneHeight, cameraState.sceneWidth]);

  const tvScreenGeometryByShot = useMemo(() => ({
    left: scaleQuad(TV_ANCHOR_CALIBRATION.quadByShot.left),
    center: scaleQuad(TV_ANCHOR_CALIBRATION.quadByShot.center),
    right: scaleQuad(TV_ANCHOR_CALIBRATION.quadByShot.right)
  }), [scaleQuad]);
  const transitionProgress = useMemo(() => {
    const from = viewerState.shotTransitionFromPosX;
    const to = viewerState.targetPosX;
    const current = viewerState.currentPosX;
    const delta = to - from;
    if (!viewerState.isTransitioning || Math.abs(delta) < 0.0001) return 1;
    return Math.min(1, Math.max(0, (current - from) / delta));
  }, [viewerState.currentPosX, viewerState.isTransitioning, viewerState.shotTransitionFromPosX, viewerState.targetPosX]);
  const baseTvScreenQuad = useMemo(() => {
    const currentQuad = tvScreenGeometryByShot[viewerState.currentShot];
    const targetQuad = tvScreenGeometryByShot[viewerState.targetShot];
    if (!viewerState.isTransitioning || viewerState.currentShot === viewerState.targetShot) return currentQuad;
    return interpolateQuad(currentQuad, targetQuad, transitionProgress);
  }, [interpolateQuad, transitionProgress, tvScreenGeometryByShot, viewerState.currentShot, viewerState.isTransitioning, viewerState.targetShot]);

  const overlaySceneRects = useMemo<Record<'doll' | 'door' | 'roomLight', OverlayRect>>(() => {
    const sceneWidth = cameraState.sceneWidth;
    const sceneHeight = cameraState.sceneHeight;
    return {
      roomLight: { x: 0, y: 0, w: sceneWidth * 0.4, h: sceneHeight * 0.6 },
      doll: { x: sceneWidth * 0.66, y: sceneHeight * 0.11, w: sceneWidth * 0.34, h: sceneHeight * 0.74 },
      door: { x: sceneWidth * 0.45, y: sceneHeight * 0.16, w: sceneWidth * 0.14, h: sceneHeight * 0.62 }
    };
  }, [cameraState.sceneHeight, cameraState.sceneWidth]);

  const handheldState = useMemo<HandheldTransformState>(() => ({
    offsetX: viewerState.cameraOffsetX,
    offsetY: viewerState.cameraOffsetY,
    rotationDeg: viewerState.cameraRotationDeg,
    scale: 1 + viewerState.cameraScaleOffset
  }), [viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);

  const toScreenRect = useCallback((rect: OverlayRect): NumericScreenRect => (
    resolveTvEffectGeometry({
      baseQuad: {
        topLeft: { x: rect.x, y: rect.y },
        topRight: { x: rect.x + rect.w, y: rect.y },
        bottomRight: { x: rect.x + rect.w, y: rect.y + rect.h },
        bottomLeft: { x: rect.x, y: rect.y + rect.h }
      },
      camera: cameraState,
      handheld: {
        cameraOffsetX: viewerState.cameraOffsetX,
        cameraOffsetY: viewerState.cameraOffsetY,
        cameraRotationDeg: viewerState.cameraRotationDeg,
        cameraScaleOffset: viewerState.cameraScaleOffset
      }
    }).finalResolvedBoundingRect
  ), [cameraState, viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);
  const toScreenRectStyle = useCallback((rect: NumericScreenRect): ScreenRectStyle => ({
    left: `${rect.x.toFixed(3)}px`,
    top: `${rect.y.toFixed(3)}px`,
    width: `${rect.w.toFixed(3)}px`,
    height: `${rect.h.toFixed(3)}px`
  }), []);
  const resolvedTvGeometry = useMemo(() => resolveTvEffectGeometry({
    baseQuad: baseTvScreenQuad,
    camera: cameraState,
    handheld: {
      cameraOffsetX: viewerState.cameraOffsetX,
      cameraOffsetY: viewerState.cameraOffsetY,
      cameraRotationDeg: viewerState.cameraRotationDeg,
      cameraScaleOffset: viewerState.cameraScaleOffset
    }
  }), [baseTvScreenQuad, cameraState, viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);
  const resolvedTvScreenQuad = resolvedTvGeometry.finalResolvedQuad;
  const resolvedTvBoundingRect = useMemo(() => toScreenRectStyle(resolvedTvGeometry.finalResolvedBoundingRect), [resolvedTvGeometry.finalResolvedBoundingRect, toScreenRectStyle]);
  const quadToPolygonStyle = useCallback((quad: TvScreenQuad): QuadStyle => {
    const minX = Math.min(quad.topLeft.x, quad.topRight.x, quad.bottomRight.x, quad.bottomLeft.x);
    const minY = Math.min(quad.topLeft.y, quad.topRight.y, quad.bottomRight.y, quad.bottomLeft.y);
    const normalize = (p: TvScreenQuadPoint) => `${(p.x - minX).toFixed(3)}px ${(p.y - minY).toFixed(3)}px`;
    return {
      topLeft: normalize(quad.topLeft),
      topRight: normalize(quad.topRight),
      bottomRight: normalize(quad.bottomRight),
      bottomLeft: normalize(quad.bottomLeft)
    };
  }, []);
  const resolvedQuadStyle = useMemo(() => quadToPolygonStyle(resolvedTvScreenQuad), [quadToPolygonStyle, resolvedTvScreenQuad]);
  const resolvedQuadCornerStyles = useMemo(() => ([
    { key: 'topLeft', left: `${resolvedTvScreenQuad.topLeft.x.toFixed(3)}px`, top: `${resolvedTvScreenQuad.topLeft.y.toFixed(3)}px` },
    { key: 'topRight', left: `${resolvedTvScreenQuad.topRight.x.toFixed(3)}px`, top: `${resolvedTvScreenQuad.topRight.y.toFixed(3)}px` },
    { key: 'bottomRight', left: `${resolvedTvScreenQuad.bottomRight.x.toFixed(3)}px`, top: `${resolvedTvScreenQuad.bottomRight.y.toFixed(3)}px` },
    { key: 'bottomLeft', left: `${resolvedTvScreenQuad.bottomLeft.x.toFixed(3)}px`, top: `${resolvedTvScreenQuad.bottomLeft.y.toFixed(3)}px` }
  ]), [resolvedTvScreenQuad.bottomLeft.x, resolvedTvScreenQuad.bottomLeft.y, resolvedTvScreenQuad.bottomRight.x, resolvedTvScreenQuad.bottomRight.y, resolvedTvScreenQuad.topLeft.x, resolvedTvScreenQuad.topLeft.y, resolvedTvScreenQuad.topRight.x, resolvedTvScreenQuad.topRight.y]);
  const rendererUsesResolvedQuad = true;
  const effectContentUsesResolvedQuad = true;
  const rendererUsesResolvedGeometry = true;
  const effectContentUsesResolvedGeometry = true;
  const rendererGeometryKind: RendererGeometryKind = 'authored_quad';
  const rendererGeometrySource = `${TV_SCREEN_GEOMETRY_BY_SHOT}.${viewerState.currentShot}${viewerState.isTransitioning ? `->${viewerState.targetShot}@${transitionProgress.toFixed(3)}` : ''} -> resolveTvEffectGeometry(base+camera+handheld)`;
  const rendererFallbackReason = 'none';
  const transitionState = useMemo<TransitionState>(() => ({
    isTransitioning: viewerState.isTransitioning,
    startedAt: viewerState.shotTransitionStartedAt,
    durationMs: viewerState.shotTransitionDurationMs,
    fromPosX: viewerState.shotTransitionFromPosX,
    currentPosX: viewerState.currentPosX,
    targetPosX: viewerState.targetPosX
  }), [viewerState.currentPosX, viewerState.isTransitioning, viewerState.shotTransitionDurationMs, viewerState.shotTransitionFromPosX, viewerState.shotTransitionStartedAt, viewerState.targetPosX]);
  const transformChain = useMemo<TransformChainStep[]>(() => [
    { step: 'geometry_source', summary: `${TV_SCREEN_GEOMETRY_BY_SHOT}.${viewerState.currentShot}${viewerState.isTransitioning ? `->${viewerState.targetShot}` : ''}`, data: { shot: viewerState.currentShot, targetShot: viewerState.targetShot, tvGeometryKind: TV_GEOMETRY_KIND, transitionProgress: transitionProgress.toFixed(3) } },
    { step: 'base_scene_quad', summary: `tl(${baseTvScreenQuad.topLeft.x.toFixed(2)},${baseTvScreenQuad.topLeft.y.toFixed(2)}) tr(${baseTvScreenQuad.topRight.x.toFixed(2)},${baseTvScreenQuad.topRight.y.toFixed(2)}) br(${baseTvScreenQuad.bottomRight.x.toFixed(2)},${baseTvScreenQuad.bottomRight.y.toFixed(2)}) bl(${baseTvScreenQuad.bottomLeft.x.toFixed(2)},${baseTvScreenQuad.bottomLeft.y.toFixed(2)})`, data: { x: baseTvScreenQuad.topLeft.x, y: baseTvScreenQuad.topLeft.y } },
    { step: 'camera_to_screen_pre_transform', summary: `cameraX=${cameraState.cameraX.toFixed(3)}, cameraY=${cameraState.cameraY.toFixed(3)}, cameraScale=${cameraState.cameraScale.toFixed(6)}`, data: { cameraX: cameraState.cameraX, cameraY: cameraState.cameraY, cameraScale: cameraState.cameraScale } },
    { step: 'handheld_transform', summary: `translate=(${viewerState.cameraOffsetX.toFixed(3)}, ${viewerState.cameraOffsetY.toFixed(3)}), rotate=${viewerState.cameraRotationDeg.toFixed(3)}, scale=${(1 + viewerState.cameraScaleOffset).toFixed(6)}`, data: { cameraOffsetX: viewerState.cameraOffsetX, cameraOffsetY: viewerState.cameraOffsetY, cameraRotationDeg: viewerState.cameraRotationDeg, cameraScale: 1 + viewerState.cameraScaleOffset } },
    { step: 'transition_state', summary: `from=${transitionState.fromPosX.toFixed(3)}, current=${transitionState.currentPosX.toFixed(3)}, target=${transitionState.targetPosX.toFixed(3)}, durationMs=${transitionState.durationMs}, transitioning=${String(transitionState.isTransitioning)}`, data: transitionState },
    { step: 'final_screen_quad', summary: `tl(${resolvedTvScreenQuad.topLeft.x.toFixed(2)},${resolvedTvScreenQuad.topLeft.y.toFixed(2)}) tr(${resolvedTvScreenQuad.topRight.x.toFixed(2)},${resolvedTvScreenQuad.topRight.y.toFixed(2)}) br(${resolvedTvScreenQuad.bottomRight.x.toFixed(2)},${resolvedTvScreenQuad.bottomRight.y.toFixed(2)}) bl(${resolvedTvScreenQuad.bottomLeft.x.toFixed(2)},${resolvedTvScreenQuad.bottomLeft.y.toFixed(2)})`, data: { x: resolvedTvScreenQuad.topLeft.x, y: resolvedTvScreenQuad.topLeft.y } }
  ], [baseTvScreenQuad.bottomLeft.x, baseTvScreenQuad.bottomLeft.y, baseTvScreenQuad.bottomRight.x, baseTvScreenQuad.bottomRight.y, baseTvScreenQuad.topLeft.x, baseTvScreenQuad.topLeft.y, baseTvScreenQuad.topRight.x, baseTvScreenQuad.topRight.y, cameraState.cameraScale, cameraState.cameraX, cameraState.cameraY, resolvedTvScreenQuad.bottomLeft.x, resolvedTvScreenQuad.bottomLeft.y, resolvedTvScreenQuad.bottomRight.x, resolvedTvScreenQuad.bottomRight.y, resolvedTvScreenQuad.topLeft.x, resolvedTvScreenQuad.topLeft.y, resolvedTvScreenQuad.topRight.x, resolvedTvScreenQuad.topRight.y, transitionProgress, transitionState, viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset, viewerState.currentShot, viewerState.isTransitioning, viewerState.targetShot]);

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
  }, [resolvedTvBoundingRect.height, resolvedTvBoundingRect.left, resolvedTvBoundingRect.top, resolvedTvBoundingRect.width]);

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
      setEffectVisibleBounds(measured);
      setQuadDiff(`Δx ${(content.left - root.left - resolvedTvGeometry.finalResolvedBoundingRect.x).toFixed(3)}px / Δy ${(content.top - root.top - resolvedTvGeometry.finalResolvedBoundingRect.y).toFixed(3)}px / Δw ${(content.width - resolvedTvGeometry.finalResolvedBoundingRect.w).toFixed(3)}px / Δh ${(content.height - resolvedTvGeometry.finalResolvedBoundingRect.h).toFixed(3)}px`);
    };
    updateRenderedEffectRect();
    const frame = window.requestAnimationFrame(updateRenderedEffectRect);
    window.addEventListener('resize', updateRenderedEffectRect);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateRenderedEffectRect);
    };
  }, [resolvedTvGeometry.finalResolvedBoundingRect.h, resolvedTvGeometry.finalResolvedBoundingRect.w, resolvedTvGeometry.finalResolvedBoundingRect.x, resolvedTvGeometry.finalResolvedBoundingRect.y, roomEventState.TV_STATIC.active, roomEventState.TV_STATIC.triggerSeq, viewerState.cameraOffsetX, viewerState.cameraOffsetY, viewerState.cameraRotationDeg, viewerState.cameraScaleOffset]);

  useEffect(() => {
    onViewerDebugStateChange?.({
      baseSceneWidth: cameraState.sceneWidth,
      baseSceneHeight: cameraState.sceneHeight,
      tvGeometryKind: TV_GEOMETRY_KIND,
      tvTargetRegionKind: TV_TARGET_REGION_KIND,
      geometrySource: rendererGeometrySource,
      rendererGeometrySource,
      rendererGeometryKind,
      rendererFallbackReason,
      baseTvScreenQuad,
      resolvedTvScreenQuad,
      resolvedTvBoundingRect,
      renderedEffectBounds: renderedEffectRect,
      renderedEffectRect,
      effectVisibleBounds,
      quadDiff,
      quadPolygon: resolvedQuadStyle,
      transformChain,
      transitionState,
      currentShot: viewerState.currentShot,
      targetShot: viewerState.targetShot,
      rendererUsesResolvedQuad,
      effectContentUsesResolvedQuad,
      rendererUsesResolvedGeometry,
      effectContentUsesResolvedGeometry,
      tvAnchor: TV_ANCHOR_CALIBRATION.quadByShot.center,
      tvAnchorVersion: TV_ANCHOR_CALIBRATION.version,
      tvAnchorCalibratedAt: TV_ANCHOR_CALIBRATION.calibratedAt,
      tvAnchorSource: TV_ANCHOR_CALIBRATION.source,
      tvSharesTransformContainer,
      questionVisible,
      questionConsonant,
      roomEventLast: roomEventObservability.eventType
    });
  }, [baseTvScreenQuad, cameraState.sceneHeight, cameraState.sceneWidth, effectContentUsesResolvedGeometry, effectContentUsesResolvedQuad, effectVisibleBounds, onViewerDebugStateChange, quadDiff, questionConsonant, questionVisible, renderedEffectRect, rendererFallbackReason, rendererGeometryKind, rendererGeometrySource, rendererUsesResolvedGeometry, rendererUsesResolvedQuad, resolvedQuadStyle, resolvedTvBoundingRect, resolvedTvScreenQuad, roomEventObservability.eventType, transformChain, transitionState, tvSharesTransformContainer, viewerState.currentShot, viewerState.targetShot]);

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
          <div key={`TV_STATIC_DEBUG-${roomEventState.TV_STATIC.triggerSeq}`} ref={tvDebugRef} className="sandbox360OverlayTvDebug" style={resolvedTvBoundingRect} data-active={roomEventState.TV_STATIC.active ? 'true' : 'false'} data-quad={JSON.stringify(resolvedQuadStyle)} />
          <div key={`TV_STATIC_OVERLAY-${roomEventState.TV_STATIC.triggerSeq}`} ref={tvOverlayRef} className="sandbox360OverlayTvNoise" style={resolvedTvBoundingRect} data-active={roomEventState.TV_STATIC.active ? 'true' : 'false'} data-viz={tvBoundsVisualizationEnabled ? 'true' : 'false'}>
            <div
              ref={tvOverlayContentRef}
              className="sandbox360OverlayTvNoiseContent"
              data-active={roomEventState.TV_STATIC.active ? 'true' : 'false'}
              style={{ clipPath: `polygon(${resolvedQuadStyle.topLeft}, ${resolvedQuadStyle.topRight}, ${resolvedQuadStyle.bottomRight}, ${resolvedQuadStyle.bottomLeft})` }}
            />
          </div>
          {tvBoundsVisualizationEnabled ? (
            <div className="sandbox360OverlayTvBoundsViz" aria-hidden="true">
              <div className="sandbox360OverlayTvBoundsVizRendererRect" style={resolvedTvBoundingRect} />
              <div className="sandbox360OverlayTvBoundsVizVisibleRect" style={effectVisibleBounds} />
              <div className="sandbox360OverlayTvBoundsVizQuad" style={{ ...resolvedTvBoundingRect, clipPath: `polygon(${resolvedQuadStyle.topLeft}, ${resolvedQuadStyle.topRight}, ${resolvedQuadStyle.bottomRight}, ${resolvedQuadStyle.bottomLeft})` }} />
              {resolvedQuadCornerStyles.map((corner) => (
                <div key={corner.key} className="sandbox360OverlayTvBoundsVizCorner" style={{ left: corner.left, top: corner.top }} />
              ))}
              <div className="sandbox360OverlayTvBoundsVizDelta">
                {quadDiff}
              </div>
            </div>
          ) : null}
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
