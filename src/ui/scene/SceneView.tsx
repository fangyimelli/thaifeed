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

type OldhouseLoopKey = 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3' | 'oldhouse_room_loop4';

const MAIN_LOOP: OldhouseLoopKey = 'oldhouse_room_loop3';
const JUMP_LOOPS: OldhouseLoopKey[] = ['oldhouse_room_loop', 'oldhouse_room_loop2', 'oldhouse_room_loop4'];

const VIDEO_PATH_BY_KEY: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: '/assets/scenes/oldhouse_room_loop.mp4',
  oldhouse_room_loop2: '/assets/scenes/oldhouse_room_loop2.mp4',
  oldhouse_room_loop3: '/assets/scenes/oldhouse_room_loop.mp4',
  oldhouse_room_loop4: '/assets/scenes/oldhouse_room_loop2.mp4'
};

const AMBIENT_PATH_BY_KEY: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: '/assets/sfx/oldhouse_room_loop.wav',
  oldhouse_room_loop2: '/assets/sfx/oldhouse_room_loop2.wav',
  oldhouse_room_loop3: '/assets/sfx/oldhouse_room_loop.wav',
  oldhouse_room_loop4: '/assets/sfx/oldhouse_room_loop2.wav'
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

const CROSSFADE_MS = 260;

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

const randomMs = (min: number, max: number) => {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (high - low + 1)) + low;
};

const randomPick = <T,>(items: T[]): T => {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

export default function SceneView({ targetConsonant, curse, anchor }: Props) {
  const [assets, setAssets] = useState<SceneAssetState>(initialAssets);
  const [currentLoopKey, setCurrentLoopKey] = useState<OldhouseLoopKey>(MAIN_LOOP);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [hasConfirmedPlayback, setHasConfirmedPlayback] = useState(false);
  const [hasDeclinedPlayback, setHasDeclinedPlayback] = useState(false);
  const videoLayerRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const currentVideoRef = useRef<'A' | 'B'>('A');
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ambientBufferRef = useRef<HTMLAudioElement | null>(null);
  const currentLoopKeyRef = useRef<OldhouseLoopKey>(MAIN_LOOP);
  const isInJumpRef = useRef(false);
  const jumpTimerRef = useRef<number | null>(null);
  const curseRef = useRef(curse);
  const autoNextEnabledRef = useRef(true);
  const isSwitchingRef = useRef(false);
  const needsUserGestureToPlayRef = useRef(false);

  const getCurrentVideoEl = useCallback(() => {
    return currentVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
  }, []);

  const getBufferVideoEl = useCallback(() => {
    return currentVideoRef.current === 'A' ? videoBRef.current : videoARef.current;
  }, []);

  const markActiveVideo = useCallback(() => {
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (!videoA || !videoB) return;

    const active = currentVideoRef.current === 'A' ? videoA : videoB;
    const inactive = currentVideoRef.current === 'A' ? videoB : videoA;
    active.classList.add('is-active');
    inactive.classList.remove('is-active');
  }, []);

  const applyAudibleDefaults = useCallback(() => {
    const currentVideo = getCurrentVideoEl();
    const bufferVideo = getBufferVideoEl();
    [currentVideo, bufferVideo].forEach((video) => {
      if (!video) return;
      video.defaultMuted = false;
      video.muted = false;
      video.volume = 1;
      video.controls = false;
      video.loop = false;
    });

    [ambientRef.current, ambientBufferRef.current].forEach((ambient) => {
      if (!ambient) return;
      ambient.muted = false;
      ambient.volume = Math.max(ambient.volume, 0);
    });
  }, [getBufferVideoEl, getCurrentVideoEl]);

  const tryPlayMedia = useCallback(async () => {
    const video = getCurrentVideoEl();
    const ambient = ambientRef.current;
    if (!video || !hasConfirmedPlayback) return false;

    applyAudibleDefaults();

    try {
      await video.play();
      if (ambient) await ambient.play();
      needsUserGestureToPlayRef.current = false;
      return true;
    } catch {
      needsUserGestureToPlayRef.current = true;
      return false;
    }
  }, [applyAudibleDefaults, getCurrentVideoEl, hasConfirmedPlayback]);

  const stopAmbient = useCallback(() => {
    [ambientRef.current, ambientBufferRef.current].forEach((ambient) => {
      if (!ambient) return;
      ambient.pause();
      ambient.currentTime = 0;
    });
    ambientRef.current = null;
    ambientBufferRef.current = null;
  }, []);

  const createAmbient = useCallback((key: OldhouseLoopKey) => {
    const ambientSrc = AMBIENT_PATH_BY_KEY[key];
    const cachedAmbient = getCachedAsset(ambientSrc);
    const ambient = cachedAmbient instanceof HTMLAudioElement ? cachedAmbient : new Audio(ambientSrc);
    ambient.preload = 'auto';
    ambient.loop = true;
    ambient.currentTime = 0;
    ambient.muted = false;
    return ambient;
  }, []);

  const crossfadeAmbient = useCallback(async (nextKey: OldhouseLoopKey) => {
    const nextAmbient = createAmbient(nextKey);
    const prevAmbient = ambientRef.current;

    nextAmbient.volume = 0;
    ambientBufferRef.current = nextAmbient;

    try {
      if (hasConfirmedPlayback) {
        await nextAmbient.play();
      }
    } catch {
      needsUserGestureToPlayRef.current = true;
      ambientBufferRef.current = null;
      return;
    }

    const steps = 8;
    const stepDelay = Math.max(16, Math.floor(CROSSFADE_MS / steps));
    for (let index = 1; index <= steps; index += 1) {
      const ratio = index / steps;
      nextAmbient.volume = ratio;
      if (prevAmbient) prevAmbient.volume = 1 - ratio;
      await wait(stepDelay);
    }

    if (prevAmbient) {
      prevAmbient.pause();
      prevAmbient.currentTime = 0;
    }

    nextAmbient.volume = 1;
    ambientRef.current = nextAmbient;
    ambientBufferRef.current = null;
  }, [createAmbient, hasConfirmedPlayback]);

  const computeJumpIntervalMs = useCallback((curseValue: number) => {
    const c = Math.min(Math.max(curseValue, 0), 100);

    const minBase = 120000;
    const maxBase = 300000;
    const minFast = 10000;
    const maxFast = 25000;

    const factor = c / 100;

    const min = minBase - (minBase - minFast) * factor;
    const max = maxBase - (maxBase - maxFast) * factor;

    return randomMs(min, max);
  }, []);

  const preloadIntoBuffer = useCallback((nextKey: OldhouseLoopKey) => {
    const bufferEl = getBufferVideoEl();
    if (!bufferEl) return Promise.reject(new Error('Buffer video missing'));

    return new Promise<void>((resolve, reject) => {
      const nextVideoPath = VIDEO_PATH_BY_KEY[nextKey];
      const cachedVideo = getCachedAsset(nextVideoPath);
      const resolvedVideoSrc = cachedVideo instanceof HTMLVideoElement ? cachedVideo.src : nextVideoPath;

      const onCanPlay = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        setAssets((prev) => ({ ...prev, videoOk: false }));
        reject(new Error(`Failed to preload ${nextKey}`));
      };
      const cleanup = () => {
        bufferEl.removeEventListener('canplay', onCanPlay);
        bufferEl.removeEventListener('error', onError);
      };

      bufferEl.preload = 'auto';
      bufferEl.playsInline = true;
      bufferEl.controls = false;
      bufferEl.defaultMuted = false;
      bufferEl.muted = false;
      bufferEl.volume = 1;
      bufferEl.loop = false;
      bufferEl.currentTime = 0;

      if (bufferEl.src !== resolvedVideoSrc) {
        bufferEl.src = resolvedVideoSrc;
      }

      bufferEl.addEventListener('canplay', onCanPlay, { once: true });
      bufferEl.addEventListener('error', onError, { once: true });
      bufferEl.load();
    });
  }, [getBufferVideoEl]);

  const switchTo = useCallback(async (nextKey: OldhouseLoopKey) => {
    if (!hasConfirmedPlayback || isSwitchingRef.current) return;
    isSwitchingRef.current = true;

    const currentEl = getCurrentVideoEl();
    const bufferEl = getBufferVideoEl();
    if (!currentEl || !bufferEl) {
      isSwitchingRef.current = false;
      return;
    }

    try {
      await preloadIntoBuffer(nextKey);
      currentLoopKeyRef.current = nextKey;
      setCurrentLoopKey(nextKey);

      bufferEl.defaultMuted = false;
      bufferEl.muted = false;
      bufferEl.volume = 1;
      bufferEl.controls = false;

      try {
        await bufferEl.play();
      } catch {
        needsUserGestureToPlayRef.current = true;
        isSwitchingRef.current = false;
        return;
      }

      needsUserGestureToPlayRef.current = false;
      void crossfadeAmbient(nextKey);

      bufferEl.classList.add('is-active');
      currentEl.classList.remove('is-active');
      await wait(CROSSFADE_MS);

      currentEl.pause();
      currentEl.removeAttribute('src');
      currentEl.load();

      currentVideoRef.current = currentVideoRef.current === 'A' ? 'B' : 'A';
      markActiveVideo();
    } catch {
      setAssets((prev) => ({ ...prev, videoOk: false }));
    } finally {
      isSwitchingRef.current = false;
    }
  }, [crossfadeAmbient, getBufferVideoEl, getCurrentVideoEl, hasConfirmedPlayback, markActiveVideo, preloadIntoBuffer]);

  const scheduleNextJump = useCallback(() => {
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
    }

    const interval = computeJumpIntervalMs(curseRef.current);
    jumpTimerRef.current = window.setTimeout(() => {
      void triggerJumpOnce();
    }, interval);
  }, [computeJumpIntervalMs]);

  const triggerJumpOnce = useCallback(async () => {
    if (isSwitchingRef.current || isInJumpRef.current) return;

    isInJumpRef.current = true;
    const nextKey = randomPick(JUMP_LOOPS);

    await switchTo(nextKey);

    if (currentLoopKeyRef.current !== nextKey) {
      isInJumpRef.current = false;
      scheduleNextJump();
      return;
    }

    currentLoopKeyRef.current = nextKey;
  }, [scheduleNextJump, switchTo]);

  const handleEnded = useCallback(() => {
    if (!autoNextEnabledRef.current || !hasConfirmedPlayback) return;

    if (isInJumpRef.current) {
      isInJumpRef.current = false;
      void switchTo(MAIN_LOOP).then(() => {
        currentLoopKeyRef.current = MAIN_LOOP;
        scheduleNextJump();
      });
      return;
    }

    void switchTo(MAIN_LOOP).then(() => {
      currentLoopKeyRef.current = MAIN_LOOP;
    });
  }, [hasConfirmedPlayback, scheduleNextJump, switchTo]);

  const playOldhouseLoop = useCallback(async (key: OldhouseLoopKey) => {
    if (!hasConfirmedPlayback) return;
    await switchTo(key);
  }, [hasConfirmedPlayback, switchTo]);

  const startOldhouseCalmMode = useCallback(() => {
    setAutoNextEnabled(true);
    autoNextEnabledRef.current = true;
    isInJumpRef.current = false;
    currentLoopKeyRef.current = MAIN_LOOP;

    void switchTo(MAIN_LOOP).then(() => {
      scheduleNextJump();
    });
  }, [scheduleNextJump, switchTo]);

  const stopOldhouseCalmMode = useCallback(() => {
    setAutoNextEnabled(false);
    autoNextEnabledRef.current = false;
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    currentLoopKeyRef.current = currentLoopKey;
  }, [currentLoopKey]);

  useEffect(() => {
    autoNextEnabledRef.current = autoNextEnabled;
  }, [autoNextEnabled]);

  useEffect(() => {
    curseRef.current = curse;
  }, [curse]);

  useEffect(() => {
    if (!hasConfirmedPlayback) return;
    void startOldhouseCalmMode();
  }, [hasConfirmedPlayback, startOldhouseCalmMode]);

  useEffect(() => {
    if (!hasConfirmedPlayback || !autoNextEnabledRef.current || isInJumpRef.current) return;
    scheduleNextJump();
  }, [curse, hasConfirmedPlayback, scheduleNextJump]);

  const bindEnded = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    el.loop = false;
    el.onended = handleEnded;
  }, [handleEnded]);

  useEffect(() => {
    bindEnded(videoARef.current);
    bindEnded(videoBRef.current);
  }, [bindEnded]);

  useEffect(() => {
    return () => {
      stopAmbient();
      stopOldhouseCalmMode();
    };
  }, [stopAmbient, stopOldhouseCalmMode]);

  useEffect(() => {
    const onStartRandom = () => startOldhouseCalmMode();
    const onStopRandom = () => stopOldhouseCalmMode();
    const onPlayLoop = (event: Event) => {
      const customEvent = event as CustomEvent<OldhouseLoopKey>;
      const key = customEvent.detail;
      if (VIDEO_PATH_BY_KEY[key]) {
        stopOldhouseCalmMode();
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
  }, [playOldhouseLoop, startOldhouseCalmMode, stopOldhouseCalmMode]);

  useEffect(() => {
    return () => {
      if (jumpTimerRef.current) {
        window.clearTimeout(jumpTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    markActiveVideo();
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (videoA) {
      videoA.controls = false;
      videoA.loop = false;
    }
    if (videoB) {
      videoB.controls = false;
      videoB.loop = false;
    }
  }, [markActiveVideo]);

  useEffect(() => {
    const layer = videoLayerRef.current;
    if (!layer) return;

    const unlockPlayback = () => {
      if (!needsUserGestureToPlayRef.current) return;
      void tryPlayMedia();
    };

    layer.addEventListener('click', unlockPlayback, { passive: true });
    return () => {
      layer.removeEventListener('click', unlockPlayback);
    };
  }, [tryPlayMedia]);

  const anchorPos = ANCHOR_POSITIONS[anchor];
  const pulseStrength = Math.min(1.4, 0.7 + curse / 80);
  const pulseOpacity = Math.min(1, 0.35 + curse / 120);

  return (
    <section className="scene-view">
      <div className="video-layer-wrapper">
        <div
          ref={videoLayerRef}
          className={`scene-video-layer filter-layer ${curseVisualClass(curse)}`}
        >
          <video
            id="videoA"
            className="scene-video"
            ref={videoARef}
            preload="auto"
            playsInline
            autoPlay
            onError={() => setAssets((prev) => ({ ...prev, videoOk: false }))}
          />

          <video
            id="videoB"
            className="scene-video"
            ref={videoBRef}
            preload="auto"
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

        {!hasConfirmedPlayback && (
          <div className="content-warning-overlay" role="dialog" aria-modal="true" aria-label="內容警告">
            <div className="content-warning-card">
              <p>本影片含有驚悚內容，是否確認觀賞？</p>
              <div className="content-warning-actions">
                <button
                  type="button"
                  onClick={() => {
                    setHasDeclinedPlayback(false);
                    setHasConfirmedPlayback(true);
                  }}
                >
                  是
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasDeclinedPlayback(true);
                    setHasConfirmedPlayback(false);
                    const videoA = videoARef.current;
                    const videoB = videoBRef.current;
                    if (videoA) videoA.pause();
                    if (videoB) videoB.pause();
                    stopAmbient();
                  }}
                >
                  否
                </button>
              </div>
              {hasDeclinedPlayback && <small>你可以稍後按「是」開始播放。</small>}
            </div>
          </div>
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
