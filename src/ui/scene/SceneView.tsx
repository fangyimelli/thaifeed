import { useEffect, useState } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import CurseMeter from '../hud/CurseMeter';

type Props = {
  roomName: string;
  targetConsonant: string;
  curse: number;
};

type SceneAssetState = {
  videoOk: boolean;
  smokeOk: boolean;
  crackOk: boolean;
  noiseOk: boolean;
  vignetteOk: boolean;
};

type GlyphPosition = {
  top: number;
  left: number;
};

const initialAssets: SceneAssetState = {
  videoOk: true,
  smokeOk: true,
  crackOk: true,
  noiseOk: true,
  vignetteOk: true
};

function randomGlyphPosition(): GlyphPosition {
  return {
    top: Math.floor(Math.random() * 58) + 14,
    left: Math.floor(Math.random() * 62) + 10
  };
}

export default function SceneView({ roomName, targetConsonant, curse }: Props) {
  const [assets, setAssets] = useState<SceneAssetState>(initialAssets);
  const [glyphPos, setGlyphPos] = useState<GlyphPosition>(randomGlyphPosition());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGlyphPos(randomGlyphPosition());
    }, 2100);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={`scene-view ${curseVisualClass(curse)}`}>
      <video
        className="scene-video"
        src="/assets/scenes/oldhouse_room_loop.mp4"
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

      <span className="glyph-blink" style={{ top: `${glyphPos.top}%`, left: `${glyphPos.left}%` }}>
        {targetConsonant}
      </span>

      <div className="scene-hud">
        <h1>{roomName}</h1>
        <CurseMeter curse={curse} />
      </div>

      {!assets.videoOk && (
        <div className="asset-warning">
          找不到影片：<code>/public/assets/scenes/oldhouse_room_loop.mp4</code>
        </div>
      )}
    </section>
  );
}
