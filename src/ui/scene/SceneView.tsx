import { useCallback, useEffect, useRef, useState } from 'react';
import { curseVisualClass } from '../../core/systems/curseSystem';
import type { AnchorType } from '../../core/state/types';
import { getCachedAsset } from '../../utils/preload';

type Props = {
  targetConsonant: string;
  curse: number;
  anchor: AnchorType;
};

type SceneAssetState = {
  videoOk: boolean;
  smokeOk: boolean;
  crackOk: boolean;
  noiseOk: boolean;
  vignetteOk: boolean;
};

type OldhouseLoopKey = 'oldhouse_room_loop' | 'oldhouse_room_loop2';

const OLDHOUSE_LOOP_KEYS: OldhouseLoopKey[] = ['oldhouse_room_loop', 'oldhouse_room_loop2'];
const AMBIENT_DURATION_FALLBACK_MS = 15_000;

const VIDEO_PATH_BY_KEY: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: '/assets/scenes/oldhouse_room_loop.mp4',
  oldhouse_room_loop2: '/assets/scenes/oldhouse_room_loop2.mp4'
};

const AMBIENT_PATH_BY_KEY: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: '/assets/sfx/oldhouse_room_loop.wav',
  oldhouse_room_loop2: '/assets/sfx/oldhouse_room_loop2.wav'
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

function getRandomOldhouseLoopKey() {
  const index = Math.floor(Math.random() * OLDHOUSE_LOOP_KEYS.length);
  return OLDHOUSE_LOOP_KEYS[index];
}

export default function SceneView({ targetConsonant, curse, anchor }: Props) {
  const [assets, setAssets] = useState<SceneAssetState>(initialAssets);
  const [currentLoopKey, setCurrentLoopKey] = useState<OldhouseLoopKey>('oldhouse_room_loop');
  const [randomMode, setRandomMode] = useState(false);
  const [volume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const randomTimerRef = useRef(0);

  const applyAudioState = useCallback((nextVolume: number, muted: boolean) => {
    const video = videoRef.current;
    if (video) {
      video.defaultMuted = false;
      video.muted = muted;
      video.volume = muted ? 0 : Math.max(0.01, nextVolume);
    }
    const ambient = ambientRef.current;
    if (ambient) {
      ambient.muted = muted;
      ambient.volume = muted ? 0 : Math.max(0.01, nextVolume);
    }
  }, []);

  const tryPlayMedia = useCallback(async () => {
    const video = videoRef.current;
    const ambient = ambientRef.current;
    if (!video) return;

    try {
      await video.play();
      if (ambient) await ambient.play();
    } catch {
    }
  }, []);

  const stopRandomTimer = useCallback(() => {
    if (randomTimerRef.current !== 0) {
      window.clearTimeout(randomTimerRef.current);
      randomTimerRef.current = 0;
    }
  }, []);

  const stopAmbient = useCallback(() => {
    if (!ambientRef.current) return;
    ambientRef.current.pause();
    ambientRef.current.currentTime = 0;
  }, []);

  const playAmbient = useCallback((key: OldhouseLoopKey) => {
    stopAmbient();
    const ambientSrc = AMBIENT_PATH_BY_KEY[key];
    const cachedAmbient = getCachedAsset(ambientSrc);
    const ambient = cachedAmbient instanceof HTMLAudioElement ? cachedAmbient : new Audio(ambientSrc);
    ambient.preload = 'auto';
    ambient.loop = true;
    ambient.currentTime = 0;
    ambient.muted = isMuted;
    ambient.volume = isMuted ? 0 : Math.max(0.01, volume);
    ambientRef.current = ambient;
  }, [isMuted, stopAmbient, volume]);

  const scheduleNextRandomLoop = useCallback(() => {
    stopRandomTimer();
    const video = videoRef.current;
    const durationMs = video && Number.isFinite(video.duration) && video.duration > 0
      ? video.duration * 1000
      : AMBIENT_DURATION_FALLBACK_MS;

    randomTimerRef.current = window.setTimeout(() => {
      setCurrentLoopKey(getRandomOldhouseLoopKey());
    }, durationMs);
  }, [stopRandomTimer]);

  const playOldhouseLoop = useCallback((key: OldhouseLoopKey) => {
    setCurrentLoopKey(key);
  }, []);

  const startOldhouseRandomLoop = useCallback(() => {
    setRandomMode(true);
    playOldhouseLoop(getRandomOldhouseLoopKey());
  }, [playOldhouseLoop]);

  const stopOldhouseRandomLoop = useCallback(() => {
    setRandomMode(false);
    stopRandomTimer();
  }, [stopRandomTimer]);

  const currentVideoPath = VIDEO_PATH_BY_KEY[currentLoopKey];
  const videoAsset = getCachedAsset(currentVideoPath);
  const videoSrc = videoAsset instanceof HTMLVideoElement ? videoAsset.src : currentVideoPath;

  useEffect(() => {
    playAmbient(currentLoopKey);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.defaultMuted = false;
      video.muted = isMuted;
      video.volume = isMuted ? 0 : Math.max(0.01, volume);
    }
    void tryPlayMedia();

    if (randomMode) {
      scheduleNextRandomLoop();
    } else {
      stopRandomTimer();
    }
  }, [currentLoopKey, isMuted, playAmbient, randomMode, scheduleNextRandomLoop, stopRandomTimer, tryPlayMedia, volume]);

  useEffect(() => {
    applyAudioState(volume, isMuted);
  }, [applyAudioState, isMuted, volume]);

  useEffect(() => {
    return () => {
      stopRandomTimer();
      stopAmbient();
    };
  }, [stopAmbient, stopRandomTimer]);

  useEffect(() => {
    const onStartRandom = () => startOldhouseRandomLoop();
    const onStopRandom = () => stopOldhouseRandomLoop();
    const onPlayLoop = (event: Event) => {
      const customEvent = event as CustomEvent<OldhouseLoopKey>;
      const key = customEvent.detail;
      if (key === 'oldhouse_room_loop' || key === 'oldhouse_room_loop2') {
        stopOldhouseRandomLoop();
        playOldhouseLoop(key);
      }
    };

    window.addEventListener('oldhouse:random:start', onStartRandom);
    window.addEventListener('oldhouse:random:stop', onStopRandom);
    window.addEventListener('oldhouse:play', onPlayLoop as EventListener);

    return () => {
      window.removeEventListener('oldhouse:random:start', onStartRandom);
      window.removeEventListener('oldhouse:random:stop', onStopRandom);
      window.removeEventListener('oldhouse:play', onPlayLoop as EventListener);
    };
  }, [playOldhouseLoop, startOldhouseRandomLoop, stopOldhouseRandomLoop]);

  const anchorPos = ANCHOR_POSITIONS[anchor];
  const pulseStrength = Math.min(1.4, 0.7 + curse / 80);
  const pulseOpacity = Math.min(1, 0.35 + curse / 120);

  return (
    <section className="scene-view">
      <div className="video-layer-wrapper">
        <div className={`scene-video-layer filter-layer ${curseVisualClass(curse)}`}>
          <video
            className="scene-video"
            ref={videoRef}
            src={videoSrc}
            preload="auto"
            loop
            playsInline
            autoPlay
            onError={() => setAssets((prev) => ({ ...prev, videoOk: false }))}
            onLoadedMetadata={() => {
              applyAudioState(volume, isMuted);
              if (randomMode) scheduleNextRandomLoop();
              void tryPlayMedia();
            }}
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
        </div>

        <div className="video-audio-controls" role="group" aria-label="聲音控制">
          <button
            type="button"
            className="audio-toggle"
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              void tryPlayMedia();
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>

        {assets.noiseOk && (
          <img
            className={`overlay noise distortion-overlay ${curseVisualClass(curse)}`}
            src="/assets/overlays/overlay_noise_film.png"
            alt="noise"
            onError={() => setAssets((prev) => ({ ...prev, noiseOk: false }))}
          />
        )}
      </div>

      {!assets.videoOk && (
        <div className="asset-warning">
          找不到影片：<code>/public/assets/scenes/{currentLoopKey}.mp4</code>
        </div>
      )}
    </section>
  );
}
