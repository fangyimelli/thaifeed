import { useMemo } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import { SANDBOX360_OVERLAY_ASSETS, SANDBOX360_SCENE_IMAGE_SRC } from './assets';
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

export default function Sandbox360Viewer({ viewerState, curse, debugState, onDebugShotSelect }: Props) {
  const sceneStyle = useMemo(() => ({
    ['--sandbox360-object-pos-x' as string]: `${viewerState.currentPosX.toFixed(3)}%`,
    ['--sandbox360-object-pos-y' as string]: `${viewerState.posY.toFixed(3)}%`,
    ['--sandbox360-scale' as string]: `${viewerState.scale.toFixed(5)}`
  }), [viewerState.currentPosX, viewerState.posY, viewerState.scale]);

  return (
    <div
      className="sandbox360Root"
      data-shot-current={viewerState.currentShot}
      data-shot-target={viewerState.targetShot}
      style={sceneStyle}
    >
      <img className={`sandbox360Scene ${curseVisualClass(curse)}`.trim()} src={SANDBOX360_SCENE_IMAGE_SRC} alt="" />
      <div className="sandbox360OverlayLayer" aria-hidden="true">
        <img className="sandbox360OverlayRoomLight" src={SANDBOX360_OVERLAY_ASSETS.roomLight} alt="" />
        <img className="sandbox360OverlayTvNoise" src={SANDBOX360_OVERLAY_ASSETS.tvNoise} alt="" />
        <img className="sandbox360OverlayMask" src={SANDBOX360_OVERLAY_ASSETS.maskCrack} alt="" />
      </div>
      <div className="sandbox360ShotState">shot: {viewerState.currentShot} → {viewerState.targetShot}</div>
      <div className="sandbox360ShotButtons">
        <button type="button" onClick={() => onDebugShotSelect('left')}>LEFT</button>
        <button type="button" onClick={() => onDebugShotSelect('center')}>CENTER</button>
        <button type="button" onClick={() => onDebugShotSelect('right')}>RIGHT</button>
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
  );
}
