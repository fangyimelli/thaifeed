import { useEffect, useRef, useState } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import type { AnchorType } from '../../core/state/types';
import { getCachedAsset } from '../../utils/preload';

type Props = {
  targetConsonant: string;
  curse: number;
  anchor: AnchorType;
  viewerCountLabel: string;
};

type SceneAssetState = {
  videoOk: boolean;
  smokeOk: boolean;
  crackOk: boolean;
  noiseOk: boolean;
  vignetteOk: boolean;
};

const initialAssets: SceneAssetState = {
  videoOk: true,
  smokeOk: true,
  crackOk: true,
  noiseOk: true,
  vignetteOk: true
};

const ANCHOR_POSITIONS: Record<AnchorType, { top: number; left: number }> = {
  under_table: { top: 74, left: 46 },
  door: { top: 52, left: 84 },
  window: { top: 31, left: 66 },
  corner: { top: 20, left: 16 }
};

export default function SceneView({ targetConsonant, curse, anchor, viewerCountLabel }: Props) {
  const [assets, setAssets] = useState<SceneAssetState>(initialAssets);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoAsset = getCachedAsset('/assets/scenes/oldhouse_room_loop.mp4');
  const videoSrc = videoAsset instanceof HTMLVideoElement ? videoAsset.src : '/assets/scenes/oldhouse_room_loop.mp4';

  useEffect(() => {
    void videoRef.current?.play().catch(() => undefined);
  }, []);

  const anchorPos = ANCHOR_POSITIONS[anchor];
  const pulseStrength = Math.min(1.4, 0.7 + curse / 80);
  const pulseOpacity = Math.min(1, 0.35 + curse / 120);

  return (
    <section className={`scene-view ${curseVisualClass(curse)}`}>
      <video
        className="scene-video"
        ref={videoRef}
        src={videoSrc}
        preload="auto"
        muted
        loop
        playsInline
        autoPlay
        onError={() => setAssets((prev) => ({ ...prev, videoOk: false }))}
      />

      {assets.smokeOk && (
        <img
          className="overlay smoke"
          src="/assets/overlays/overlay_smoke_room.png"
          alt="smoke"
          onError={() => setAssets((prev) => ({ ...prev, smokeOk: false }))}
        />
      )}
      {assets.crackOk && (
        <img
          className="overlay crack"
          src="/assets/overlays/overlay_crack_glass.png"
          alt="crack"
          onError={() => setAssets((prev) => ({ ...prev, crackOk: false }))}
        />
      )}
      {assets.noiseOk && (
        <img
          className="overlay noise"
          src="/assets/overlays/overlay_noise_film.png"
          alt="noise"
          onError={() => setAssets((prev) => ({ ...prev, noiseOk: false }))}
        />
      )}
      {assets.vignetteOk && (
        <img
          className="overlay vignette"
          src="/assets/overlays/overlay_vignette.png"
          alt="vignette"
          onError={() => setAssets((prev) => ({ ...prev, vignetteOk: false }))}
        />
      )}

      <span
        className="glyph-blink"
        style={{
          top: `${anchorPos.top}%`,
          left: `${anchorPos.left}%`,
          filter: `contrast(${1 + curse / 180})`,
          opacity: pulseOpacity,
          textShadow: `0 0 ${18 + curse / 3}px rgba(134, 217, 255, ${0.7 + curse / 300}), 0 0 ${40 + curse / 2}px rgba(88, 162, 255, ${0.45 + curse / 250})`,
          animationDuration: `${Math.max(0.45, 1.1 - curse / 200)}s`,
          transform: `translate(-50%, -50%) scale(${pulseStrength})`
        }}
      >
        {targetConsonant}
      </span>

      <div className="scene-hud">
        <div className="live-tag">🔴 LIVE</div>
        <h1>Old House Live</h1>
        <div className="viewer-count">👁 {viewerCountLabel}</div>
      </div>

      {!assets.videoOk && (
        <div className="asset-warning">
          找不到影片：<code>/public/assets/scenes/oldhouse_room_loop.mp4</code>
        </div>
      )}
    </section>
  );
}
