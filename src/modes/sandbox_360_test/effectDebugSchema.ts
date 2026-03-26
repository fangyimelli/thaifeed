import type { TvScreenQuad } from './tvAnchorCalibration';

export type EffectType = 'tv' | 'flash' | 'doll' | 'door';
export type EffectGeometryKind = 'quad' | 'rect' | 'none';

export type EffectBoundsStyle = { left: string; top: string; width: string; height: string };

export type EffectResolvedGeometry = {
  kind: EffectGeometryKind;
  rect: EffectBoundsStyle;
  quad?: TvScreenQuad;
};

export type EffectDebugEntry = {
  effectType: EffectType;
  active: boolean;
  forced: boolean;
  geometryKind: EffectGeometryKind;
  geometrySource: string;
  baseGeometry: EffectResolvedGeometry | null;
  resolvedGeometry: EffectResolvedGeometry;
  renderedBounds: EffectBoundsStyle;
  visibleBounds: EffectBoundsStyle;
  currentShot: 'left' | 'center' | 'right';
  targetShot: 'left' | 'center' | 'right';
  transitionState: {
    isTransitioning: boolean;
    startedAt: number;
    durationMs: number;
    fromPosX: number;
    currentPosX: number;
    targetPosX: number;
  };
  usesResolvedGeometry: boolean;
  blockReason: string;
  fallbackReason: string;
  forceReason: string;
  sourceStatus: string;
  rendererUsesResolvedGeometry: boolean;
  effectContentUsesResolvedGeometry: boolean;
  effectContentInset?: string;
  effectInnerTransform?: string;
};

export type EffectsDebugMap = Record<EffectType, EffectDebugEntry>;
