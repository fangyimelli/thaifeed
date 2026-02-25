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

const OLDHOUSE_PLAYLIST: OldhouseLoopKey[] = ['oldhouse_room_loop', 'oldhouse_room_loop2'];

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

export default function SceneView({ targetConsonant, curse, anchor }: Props) {
  const [assets, setAssets] = useState<SceneAssetState>(initialAssets);
  const [currentLoopKey, setCurrentLoopKey] = useState<OldhouseLoopKey>('oldhouse_room_loop');
  const [shuffleMode, setShuffleMode] = useState(true);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const currentLoopKeyRef = useRef<OldhouseLoopKey>('oldhouse_room_loop');
  const playlistIndexRef = useRef(0);
  const shuffleModeRef = useRef(true);
  const autoNextEnabledRef = useRef(true);

  const applyAudibleDefaults = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;
    }

    const ambient = ambientRef.current;
    if (ambient) {
      ambient.muted = false;
      ambient.volume = 1;
    }
  }, []);

  const tryPlayMedia = useCallback(async () => {
    const video = videoRef.current;
    const ambient = ambientRef.current;
    if (!video) return false;

    applyAudibleDefaults();

    try {
      await video.play();
      if (ambient) await ambient.play();
      return true;
    } catch {
      return false;
    }
  }, [applyAudibleDefaults]);

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
    ambient.muted = false;
    ambient.volume = 1;
    ambientRef.current = ambient;
  }, [stopAmbient]);

  const getNextOldhouseKey = useCallback((): OldhouseLoopKey => {
    if (shuffleModeRef.current) {
      const index = Math.floor(Math.random() * OLDHOUSE_PLAYLIST.length);
      return OLDHOUSE_PLAYLIST[index];
    }

    const currentIndex = OLDHOUSE_PLAYLIST.indexOf(currentLoopKeyRef.current);
    const baseIndex = currentIndex >= 0 ? currentIndex : playlistIndexRef.current;
    const nextIndex = (baseIndex + 1) % OLDHOUSE_PLAYLIST.length;
    playlistIndexRef.current = nextIndex;
    return OLDHOUSE_PLAYLIST[nextIndex];
  }, []);

  const playOldhouseLoop = useCallback(async (key: OldhouseLoopKey) => {
    currentLoopKeyRef.current = key;
    playlistIndexRef.current = OLDHOUSE_PLAYLIST.indexOf(key);
    setCurrentLoopKey(key);
    playAmbient(key);

    const video = videoRef.current;
    if (!video) return;

    const nextVideoPath = VIDEO_PATH_BY_KEY[key];
    const cachedVideo = getCachedAsset(nextVideoPath);
    const resolvedVideoSrc = cachedVideo instanceof HTMLVideoElement ? cachedVideo.src : nextVideoPath;

    if (video.src !== resolvedVideoSrc) {
      video.src = resolvedVideoSrc;
      video.load();
    }

    video.loop = false;
    video.currentTime = 0;
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    applyAudibleDefaults();
    await tryPlayMedia();
  }, [applyAudibleDefaults, playAmbient, tryPlayMedia]);

  const startOldhouseAutoShuffle = useCallback(() => {
    setAutoNextEnabled(true);
    setShuffleMode(true);
    autoNextEnabledRef.current = true;
    shuffleModeRef.current = true;
    void playOldhouseLoop(getNextOldhouseKey());
  }, [getNextOldhouseKey, playOldhouseLoop]);

  const stopOldhouseAutoShuffle = useCallback(() => {
    setAutoNextEnabled(false);
    autoNextEnabledRef.current = false;
  }, []);

  useEffect(() => {
    currentLoopKeyRef.current = currentLoopKey;
  }, [currentLoopKey]);

  useEffect(() => {
    shuffleModeRef.current = shuffleMode;
  }, [shuffleMode]);

  useEffect(() => {
    autoNextEnabledRef.current = autoNextEnabled;
  }, [autoNextEnabled]);

  useEffect(() => {
    void playOldhouseLoop(currentLoopKeyRef.current);
  }, [playOldhouseLoop]);

  useEffect(() => {
    return () => {
      stopAmbient();
    };
  }, [stopAmbient]);

  useEffect(() => {
    const onStartRandom = () => startOldhouseAutoShuffle();
    const onStopRandom = () => stopOldhouseAutoShuffle();
    const onPlayLoop = (event: Event) => {
      const customEvent = event as CustomEvent<OldhouseLoopKey>;
      const key = customEvent.detail;
      if (key === 'oldhouse_room_loop' || key === 'oldhouse_room_loop2') {
        stopOldhouseAutoShuffle();
        void playOldhouseLoop(key);
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
  }, [playOldhouseLoop, startOldhouseAutoShuffle, stopOldhouseAutoShuffle]);

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
            preload="auto"
            playsInline
            autoPlay
            onEnded={() => {
              if (!autoNextEnabledRef.current) return;
              void playOldhouseLoop(getNextOldhouseKey());
            }}
            onError={() => setAssets((prev) => ({ ...prev, videoOk: false }))}
            onLoadedMetadata={() => {
              applyAudibleDefaults();
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
