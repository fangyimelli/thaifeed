import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AMBIENT_BY_KEY,
  FAN_LOOP_PATH,
  FOOTSTEPS_PATH,
  GHOST_FEMALE_PATH,
  JUMP_LOOPS,
  MAIN_LOOP,
  REQUIRED_AUDIO_ASSETS,
  type OldhouseLoopKey,
  type RequiredAudioAsset,
  VIDEO_PATH_BY_KEY
} from '../../config/oldhousePlayback';
import { curseVisualClass } from '../../core/systems/curseSystem';
import type { AnchorType } from '../../core/state/types';
import { getCachedAsset } from '../../utils/preload';

export type SceneMissingAsset = {
  name: string;
  url: string;
  reason: string;
};

export type SceneInitError = {
  summary: string;
  missingAssets: SceneMissingAsset[];
};

type Props = {
  targetConsonant: string;
  curse: number;
  anchor: AnchorType;
  onNeedUserGestureChange?: (value: boolean) => void;
  onSceneRunning?: () => void;
  onSceneError?: (error: SceneInitError) => void;
};

type SceneAssetState = {
  videoOk: boolean;
  smokeOk: boolean;
  crackOk: boolean;
  noiseOk: boolean;
  vignetteOk: boolean;
};

const AUDIO_VERIFY_TIMEOUT_MS = 12_000;

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

const CROSSFADE_MS = 420;
const PRELOAD_READY_FALLBACK_TIMEOUT_MS = 3200;
const PAUSE_OLD_VIDEO_AT_RATIO = 0.6;

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

const waitFirstFrame = async (videoEl: HTMLVideoElement) => {
  return new Promise<void>((resolve) => {
    if (typeof videoEl.requestVideoFrameCallback === 'function') {
      videoEl.requestVideoFrameCallback(() => resolve());
      return;
    }

    const t0 = performance.now();
    const tick = () => {
      if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolve();
        return;
      }
      if (performance.now() - t0 > 300) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
};

const randomMs = (min: number, max: number) => {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (high - low + 1)) + low;
};

const clampCurse = (c: number) => Math.min(Math.max(c, 0), 100);

const randomPick = <T,>(items: T[]): T => {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

const verifyAudioAsset = (asset: RequiredAudioAsset) => {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(asset.src);
    audio.preload = 'auto';
    audio.muted = false;
    audio.volume = 1;

    let done = false;
    const onLoaded = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };
    const onError = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error(`Failed to load required audio asset ${asset.name}: ${asset.src}`));
    };

    const timeoutId = window.setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error(`Timed out while loading required audio asset ${asset.name}: ${asset.src}`));
    }, AUDIO_VERIFY_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      audio.removeEventListener('loadeddata', onLoaded);
      audio.removeEventListener('canplaythrough', onLoaded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };

    audio.addEventListener('loadeddata', onLoaded, { once: true });
    audio.addEventListener('canplaythrough', onLoaded, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
};

const verifyRequiredAudioAssets = async (): Promise<SceneMissingAsset[]> => {
  const missing: SceneMissingAsset[] = [];

  await Promise.all(REQUIRED_AUDIO_ASSETS.map(async (asset) => {
    try {
      await verifyAudioAsset(asset);
    } catch (error) {
      missing.push({
        name: asset.name,
        url: asset.src,
        reason: error instanceof Error ? error.message : 'Unknown audio verification failure'
      });
      console.error('[audio-required] 缺失或載入失敗', {
        asset: asset.name,
        url: asset.src,
        error
      });
    }
  }));

  return missing;
};

type AudioDebugState = {
  started: boolean;
  lastFanAt: number;
  lastFootstepsAt: number;
  lastGhostAt: number;
  activeVideoKey: OldhouseLoopKey | null;
  activeAmbientKey: OldhouseLoopKey | null;
  activeVideoEl: 'A' | 'B';
  switchId: number;
  phase: string;
};

type VideoDebugState = {
  currentKey: OldhouseLoopKey | null;
  bufferKey: OldhouseLoopKey | null;
  isSwitching: boolean;
  isInJump: boolean;
  nextJumpAt: number | null;
  lastSwitchAt: number;
  lastSwitchFrom: OldhouseLoopKey | null;
  lastSwitchTo: OldhouseLoopKey | null;
  lastError: string | null;
  lastEndedKey: OldhouseLoopKey | null;
  activeVideoId: 'videoA' | 'videoB' | null;
  activeVideoSrc: string | null;
  bufferVideoId: 'videoA' | 'videoB' | null;
  bufferVideoSrc: string | null;
  currentActive: boolean;
  bufferActive: boolean;
  currentReadyState: number | null;
  currentPaused: boolean | null;
  timers: { jumpTimer: number | null };
};

declare global {
  interface Window {
    __AUDIO_DEBUG__?: AudioDebugState;
    __VIDEO_DEBUG__?: VideoDebugState;
  }
}

export default function SceneView({
  targetConsonant,
  curse,
  anchor,
  onNeedUserGestureChange,
  onSceneRunning,
  onSceneError
}: Props) {
  const [assets, setAssets] = useState<SceneAssetState>(initialAssets);
  const [currentLoopKey, setCurrentLoopKey] = useState<OldhouseLoopKey>(MAIN_LOOP);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [hasConfirmedPlayback, setHasConfirmedPlayback] = useState(false);
  const [hasDeclinedPlayback, setHasDeclinedPlayback] = useState(false);
  const [requiredAudioError, setRequiredAudioError] = useState<string | null>(null);
  const [videoErrorDetail, setVideoErrorDetail] = useState<string | null>(null);
  const videoLayerRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const currentVideoRef = useRef<'A' | 'B'>('A');
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ambientBufferRef = useRef<HTMLAudioElement | null>(null);
  const fanAudioRef = useRef<HTMLAudioElement | null>(null);
  const footstepsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ghostAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentLoopKeyRef = useRef<OldhouseLoopKey>(MAIN_LOOP);
  const isInJumpRef = useRef(false);
  const jumpTimerRef = useRef<number | null>(null);
  const curseRef = useRef(curse);
  const autoNextEnabledRef = useRef(true);
  const isSwitchingRef = useRef(false);
  const needsUserGestureToPlayRef = useRef(false);
  const runningAnnouncedRef = useRef(false);
  const footstepsTimerRef = useRef<number | null>(null);
  const ghostTimerRef = useRef<number | null>(null);
  const isAudioStartedRef = useRef(false);
  const switchCounterRef = useRef(0);
  const nextJumpAtRef = useRef<number | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  });
  const [debugTick, setDebugTick] = useState(() => Date.now());

  const updateAudioDebug = useCallback((patch: Partial<AudioDebugState>) => {
    const prev: AudioDebugState = window.__AUDIO_DEBUG__ ?? {
      started: false,
      lastFanAt: 0,
      lastFootstepsAt: 0,
      lastGhostAt: 0,
      activeVideoKey: null,
      activeAmbientKey: null,
      activeVideoEl: currentVideoRef.current,
      switchId: 0,
      phase: 'idle'
    };
    window.__AUDIO_DEBUG__ = { ...prev, ...patch };
  }, []);

  const getCurrentVideoEl = useCallback(() => {
    return currentVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
  }, []);

  const getBufferVideoEl = useCallback(() => {
    return currentVideoRef.current === 'A' ? videoBRef.current : videoARef.current;
  }, []);

  const updateVideoDebug = useCallback((patch: Partial<VideoDebugState>) => {
    const prev: VideoDebugState = window.__VIDEO_DEBUG__ ?? {
      currentKey: null,
      bufferKey: null,
      isSwitching: false,
      isInJump: false,
      nextJumpAt: null,
      lastSwitchAt: 0,
      lastSwitchFrom: null,
      lastSwitchTo: null,
      lastError: null,
      lastEndedKey: null,
      activeVideoId: null,
      activeVideoSrc: null,
      bufferVideoId: null,
      bufferVideoSrc: null,
      currentActive: false,
      bufferActive: false,
      currentReadyState: null,
      currentPaused: null,
      timers: { jumpTimer: null }
    };

    window.__VIDEO_DEBUG__ = {
      ...prev,
      ...patch,
      timers: { ...prev.timers, ...(patch.timers ?? {}) }
    };
  }, []);

  const getVideoUrlForKey = useCallback((key: OldhouseLoopKey) => {
    return VIDEO_PATH_BY_KEY[key];
  }, []);

  const setNeedsGestureState = useCallback((value: boolean) => {
    needsUserGestureToPlayRef.current = value;
    onNeedUserGestureChange?.(value);
  }, [onNeedUserGestureChange]);

  const announceRunning = useCallback(() => {
    if (runningAnnouncedRef.current) return;
    runningAnnouncedRef.current = true;
    onSceneRunning?.();
  }, [onSceneRunning]);

  const markActiveVideo = useCallback(() => {
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (!videoA || !videoB) return;

    const active = currentVideoRef.current === 'A' ? videoA : videoB;
    const inactive = currentVideoRef.current === 'A' ? videoB : videoA;
    active.classList.add('is-active');
    inactive.classList.remove('is-active');
    active.style.display = 'block';
    inactive.style.display = 'none';
    active.style.opacity = '1';
    inactive.style.opacity = '0';
    active.style.zIndex = '1';
    inactive.style.zIndex = '1';
    console.log('[VIDEO]', 'markActiveVideo', {
      activeId: active.id,
      activeSrc: active.currentSrc || active.src,
      inactiveId: inactive.id,
      inactiveSrc: inactive.currentSrc || inactive.src
    });
    updateVideoDebug({
      activeVideoId: active.id === 'videoA' ? 'videoA' : 'videoB',
      activeVideoSrc: active.currentSrc || active.src || null,
      bufferVideoId: inactive.id === 'videoA' ? 'videoA' : 'videoB',
      bufferVideoSrc: inactive.currentSrc || inactive.src || null,
      currentActive: active.classList.contains('is-active'),
      bufferActive: inactive.classList.contains('is-active'),
      currentReadyState: active.readyState,
      currentPaused: active.paused
    });
  }, [updateVideoDebug]);

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

    [fanAudioRef.current, footstepsAudioRef.current, ghostAudioRef.current].forEach((audio) => {
      if (!audio) return;
      audio.muted = false;
      if (audio.volume <= 0) {
        audio.volume = 0.4;
      }
    });
  }, [getBufferVideoEl, getCurrentVideoEl]);

  const computeFootstepsIntervalMs = useCallback((curseValue: number) => {
    const c = clampCurse(curseValue) / 100;
    const minBase = 120000;
    const maxBase = 180000;
    const minFast = 20000;
    const maxFast = 45000;
    const min = minBase - (minBase - minFast) * c;
    const max = maxBase - (maxBase - maxFast) * c;
    return randomMs(min, max);
  }, []);

  const computeGhostIntervalMs = useCallback((curseValue: number) => {
    const c = clampCurse(curseValue) / 100;
    const minBase = 300000;
    const maxBase = 300000;
    const minFast = 60000;
    const maxFast = 120000;
    const min = minBase - (minBase - minFast) * c;
    const max = maxBase - (maxBase - maxFast) * c;
    return randomMs(min, max) + randomMs(-15000, 15000);
  }, []);

  const startFanLoop = useCallback(async () => {
    const fanAudio = fanAudioRef.current;
    if (!fanAudio) {
      throw new Error('Missing fan audio instance');
    }
    fanAudio.loop = true;
    fanAudio.muted = false;
    if (fanAudio.volume === 0) fanAudio.volume = 0.4;
    try {
      await fanAudio.play();
      setNeedsGestureState(false);
      const t = Date.now();
      updateAudioDebug({ started: true, lastFanAt: t });
      console.log('[AUDIO] fan loop started', { t, curse: curseRef.current });
    } catch {
      setNeedsGestureState(true);
      console.warn('[AUDIO] play blocked/failed', { key: 'fan_loop', errName: 'unknown' });
      throw new Error('Fan loop autoplay blocked until user gesture');
    }
  }, [updateAudioDebug]);

  const scheduleFootsteps = useCallback(() => {
    if (footstepsTimerRef.current) {
      window.clearTimeout(footstepsTimerRef.current);
    }
    const delay = computeFootstepsIntervalMs(curseRef.current);
    footstepsTimerRef.current = window.setTimeout(() => {
      if (needsUserGestureToPlayRef.current) {
        scheduleFootsteps();
        return;
      }
      const footstepsAudio = footstepsAudioRef.current;
      if (!footstepsAudio) {
        scheduleFootsteps();
        return;
      }
      footstepsAudio.currentTime = 0;
      footstepsAudio.muted = false;
      void footstepsAudio.play().then(() => {
        const t = Date.now();
        updateAudioDebug({ started: true, lastFootstepsAt: t });
        console.log('[AUDIO] footsteps played', { t, curse: curseRef.current });
      }).catch((e: unknown) => {
        setNeedsGestureState(true);
        console.warn('[AUDIO] play blocked/failed', { key: 'footsteps', errName: e instanceof Error ? e.name : 'unknown' });
      }).finally(() => {
        scheduleFootsteps();
      });
    }, delay);
  }, [computeFootstepsIntervalMs, updateAudioDebug]);

  const scheduleGhost = useCallback(() => {
    if (ghostTimerRef.current) {
      window.clearTimeout(ghostTimerRef.current);
    }
    const delay = computeGhostIntervalMs(curseRef.current);
    ghostTimerRef.current = window.setTimeout(() => {
      if (needsUserGestureToPlayRef.current) {
        scheduleGhost();
        return;
      }
      const ghostAudio = ghostAudioRef.current;
      if (!ghostAudio) {
        scheduleGhost();
        return;
      }
      ghostAudio.currentTime = 0;
      ghostAudio.muted = false;
      void ghostAudio.play().then(() => {
        const t = Date.now();
        updateAudioDebug({ started: true, lastGhostAt: t });
        console.log('[AUDIO] ghost played', { t, curse: curseRef.current });
      }).catch((e: unknown) => {
        setNeedsGestureState(true);
        console.warn('[AUDIO] play blocked/failed', { key: 'ghost_female', errName: e instanceof Error ? e.name : 'unknown' });
      }).finally(() => {
        scheduleGhost();
      });
    }, delay);
  }, [computeGhostIntervalMs, updateAudioDebug]);

  const tryPlayMedia = useCallback(async () => {
    const video = getCurrentVideoEl();
    const ambient = ambientRef.current;
    if (!video || !hasConfirmedPlayback) return false;

    applyAudibleDefaults();

    try {
      await video.play();
      if (ambient) await ambient.play();
      setNeedsGestureState(false);
      return true;
    } catch (e: unknown) {
      setNeedsGestureState(true);
      console.warn('[AUDIO] play blocked/failed', { key: 'active_media', errName: e instanceof Error ? e.name : 'unknown' });
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
    const ambientSrc = AMBIENT_BY_KEY[key];
    const cachedAmbient = getCachedAsset(ambientSrc);
    const ambient = cachedAmbient instanceof HTMLAudioElement ? cachedAmbient : new Audio(ambientSrc);
    ambient.preload = 'auto';
    ambient.loop = true;
    ambient.currentTime = 0;
    ambient.muted = false;
    ambient.volume = 1;
    return ambient;
  }, []);

  const computeJumpIntervalMs = useCallback((curseValue: number) => {
    const c = Math.min(Math.max(curseValue, 0), 100);

    const minBase = 120000;
    const maxBase = 300000;
    const minFast = 45000;
    const maxFast = 120000;

    const factor = c / 100;

    const min = minBase - (minBase - minFast) * factor;
    const max = maxBase - (maxBase - maxFast) * factor;

    return randomMs(min, max);
  }, []);

  const preloadIntoBuffer = useCallback((nextKey: OldhouseLoopKey) => {
    const bufferEl = getBufferVideoEl();
    if (!bufferEl) return Promise.reject(new Error('Buffer video missing'));

    return new Promise<void>((resolve, reject) => {
      const nextVideoPath = getVideoUrlForKey(nextKey);
      const cachedVideo = getCachedAsset(nextVideoPath);
      const resolvedVideoSrc = cachedVideo instanceof HTMLVideoElement ? cachedVideo.src : nextVideoPath;

      let fallbackTimer: number | null = null;
      let done = false;

      const resolveReady = (reason: string) => {
        if (done) return;
        done = true;
        cleanup();
        console.log('[VIDEO]', 'preloadIntoBuffer resolved', {
          nextKey,
          reason,
          id: bufferEl.id,
          readyState: bufferEl.readyState,
          src: bufferEl.currentSrc || bufferEl.src
        });
        resolve();
      };
      const rejectReady = (error: Error) => {
        if (done) return;
        done = true;
        cleanup();
        setAssets((prev) => ({ ...prev, videoOk: false }));
        setVideoErrorDetail(error.message);
        onSceneError?.({
          summary: '影片載入失敗，直播尚未開始。',
          missingAssets: [{ name: nextKey, url: resolvedVideoSrc, reason: error.message }]
        });
        reject(error);
      };

      const onMaybeReady = (eventName: string) => {
        if (bufferEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolveReady(eventName);
        }
      };
      const onError = () => {
        rejectReady(new Error(`Failed to preload ${nextKey} (${resolvedVideoSrc})`));
      };
      const cleanup = () => {
        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        bufferEl.removeEventListener('loadedmetadata', onLoadedMetadata);
        bufferEl.removeEventListener('loadeddata', onLoadedData);
        bufferEl.removeEventListener('canplay', onCanPlay);
        bufferEl.removeEventListener('canplaythrough', onCanPlayThrough);
        bufferEl.removeEventListener('error', onError);
      };

      const onLoadedMetadata = () => onMaybeReady('loadedmetadata');
      const onLoadedData = () => onMaybeReady('loadeddata');
      const onCanPlay = () => onMaybeReady('canplay');
      const onCanPlayThrough = () => onMaybeReady('canplaythrough');

      bufferEl.preload = 'auto';
      bufferEl.playsInline = true;
      bufferEl.controls = false;
      bufferEl.defaultMuted = false;
      bufferEl.muted = false;
      bufferEl.volume = 1;
      bufferEl.loop = false;
      bufferEl.currentTime = 0;

      bufferEl.pause();
      bufferEl.currentTime = 0;

      console.log('[VIDEO]', 'set buffer src', { id: bufferEl.id, nextKey, nextUrl: resolvedVideoSrc });
      bufferEl.src = resolvedVideoSrc;
      bufferEl.load();

      if (bufferEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolveReady('readyState-immediate');
        return;
      }

      fallbackTimer = window.setTimeout(() => {
        console.warn('[VIDEO]', 'preloadIntoBuffer timeout fallback', {
          nextKey,
          id: bufferEl.id,
          readyState: bufferEl.readyState,
          src: bufferEl.currentSrc || bufferEl.src
        });
        if (bufferEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolveReady('timeout-readyState');
          return;
        }
        rejectReady(new Error(`影片載入失敗：${nextKey} (${resolvedVideoSrc})`));
      }, PRELOAD_READY_FALLBACK_TIMEOUT_MS);

      bufferEl.addEventListener('loadedmetadata', onLoadedMetadata);
      bufferEl.addEventListener('loadeddata', onLoadedData);
      bufferEl.addEventListener('canplay', onCanPlay);
      bufferEl.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
      bufferEl.addEventListener('error', onError, { once: true });
    });
  }, [getBufferVideoEl, getVideoUrlForKey]);

  const switchTo = useCallback(async (nextKey: OldhouseLoopKey) => {
    console.log('[VIDEO]', 'switchTo requested', {
      nextKey,
      hasConfirmedPlayback,
      isSwitching: isSwitchingRef.current,
      needsUserGestureToPlay: needsUserGestureToPlayRef.current,
      currentKey: currentLoopKeyRef.current
    });
    if (!hasConfirmedPlayback) {
      updateVideoDebug({ lastError: `switchTo skipped(no-confirm) -> ${nextKey}` });
      console.warn('[VIDEO]', 'switchTo skipped: no playback confirmation', { nextKey });
      return;
    }
    if (isSwitchingRef.current) {
      updateVideoDebug({ lastError: `switchTo skipped(isSwitching) -> ${nextKey}` });
      console.warn('[VIDEO]', 'switchTo skipped: already switching', { nextKey });
      return;
    }
    isSwitchingRef.current = true;
    updateVideoDebug({ isSwitching: true, bufferKey: nextKey });

    const currentEl = getCurrentVideoEl();
    const bufferEl = getBufferVideoEl();
    if (!currentEl || !bufferEl) {
      isSwitchingRef.current = false;
      updateVideoDebug({ isSwitching: false, lastError: 'Missing video elements' });
      return;
    }

    const switchId = switchCounterRef.current + 1;
    switchCounterRef.current = switchId;
    const nextAmbient = createAmbient(nextKey);
    const prevAmbient = ambientRef.current;
    ambientBufferRef.current = nextAmbient;
    const fromKey = currentLoopKeyRef.current;
    const nextUrl = getVideoUrlForKey(nextKey);
    const currentSrc = currentEl.currentSrc || currentEl.src;

    try {
      console.log('[VIDEO]', 'switchTo start', {
        fromKey,
        toKey: nextKey,
        fromSrc: currentSrc,
        toSrc: nextUrl,
        currentReadyState: currentEl.readyState,
        currentPaused: currentEl.paused,
        currentTime: currentEl.currentTime
      });
      if (nextUrl === currentSrc) {
        console.warn('[VIDEO]', 'nextUrl equals current src', { fromKey, toKey: nextKey, src: nextUrl });
      }
      updateAudioDebug({ switchId, phase: 'preloadStart' });
      console.log('[VIDEO]', 'switchTo preload start', { switchId, nextKey, curse: curseRef.current });

      await preloadIntoBuffer(nextKey);


      bufferEl.defaultMuted = false;
      bufferEl.muted = false;
      bufferEl.volume = 1;
      bufferEl.controls = false;

      nextAmbient.muted = false;
      nextAmbient.volume = 1;

      updateAudioDebug({ switchId, phase: 'bufferPlayStart' });
      console.log('[VIDEO]', 'switchTo buffer play start', {
        switchId,
        nextKey,
        bufferId: bufferEl.id,
        bufferReadyState: bufferEl.readyState,
        bufferPaused: bufferEl.paused,
        bufferCurrentTime: bufferEl.currentTime
      });

      try {
        await bufferEl.play();
      } catch (e: unknown) {
        setNeedsGestureState(true);
        updateVideoDebug({ lastError: `video play blocked for ${nextKey}` });
        console.warn('[AUDIO] play blocked/failed', { key: `video_${nextKey}`, errName: e instanceof Error ? e.name : 'unknown' });
        return;
      }

      updateAudioDebug({
        switchId,
        phase: 'crossfadeStart',
        activeVideoKey: nextKey,
        activeAmbientKey: nextKey,
        activeVideoEl: currentVideoRef.current === 'A' ? 'B' : 'A'
      });
      console.log('[VIDEO]', 'switchTo crossfade start', {
        switchId,
        videoKey: nextKey,
        ambientKey: nextKey,
        outgoingVideoEl: currentVideoRef.current,
        incomingVideoEl: currentVideoRef.current === 'A' ? 'B' : 'A',
        curse: curseRef.current
      });

      await waitFirstFrame(bufferEl);

      bufferEl.style.display = 'block';
      currentEl.style.display = 'block';
      bufferEl.style.zIndex = '1';
      currentEl.style.zIndex = '1';
      bufferEl.classList.add('is-active');
      currentEl.classList.remove('is-active');
      bufferEl.style.opacity = '1';
      currentEl.style.opacity = '0';

      console.log('[VIDEO]', 'classes', {
        currentId: currentEl.id,
        bufferId: bufferEl.id,
        currentActive: currentEl.classList.contains('is-active'),
        bufferActive: bufferEl.classList.contains('is-active')
      });

      console.log('[VIDEO]', 'classes', {
        currentId: currentEl.id,
        bufferId: bufferEl.id,
        currentActive: currentEl.classList.contains('is-active'),
        bufferActive: bufferEl.classList.contains('is-active')
      });

      currentEl.volume = 0;
      currentEl.muted = true;
      bufferEl.muted = false;
      bufferEl.volume = 1;
      console.log('[VIDEO]', 'audio lanes', {
        current: { muted: currentEl.muted, vol: currentEl.volume },
        buffer: { muted: bufferEl.muted, vol: bufferEl.volume }
      });

      try {
        if (hasConfirmedPlayback) {
          await nextAmbient.play();
        }
      } catch (e: unknown) {
        setNeedsGestureState(true);
        updateVideoDebug({ lastError: `ambient play blocked for ${nextKey}` });
        console.warn('[AUDIO] play blocked/failed', { key: `ambient_${nextKey}`, errName: e instanceof Error ? e.name : 'unknown' });
      }

      setNeedsGestureState(false);

      const pauseOldVideoAtMs = Math.floor(CROSSFADE_MS * PAUSE_OLD_VIDEO_AT_RATIO);
      await wait(pauseOldVideoAtMs);
      currentEl.pause();

      if (prevAmbient) {
        prevAmbient.volume = 0;
        prevAmbient.muted = true;
        prevAmbient.pause();
        prevAmbient.currentTime = 0;
      }

      const restMs = Math.max(0, CROSSFADE_MS - pauseOldVideoAtMs);
      if (restMs > 0) {
        await wait(restMs);
      }

      currentEl.currentTime = 0;
      currentEl.muted = true;
      currentEl.volume = 0;

      nextAmbient.muted = false;
      nextAmbient.volume = 1;
      ambientRef.current = nextAmbient;
      ambientBufferRef.current = null;

      currentVideoRef.current = currentVideoRef.current === 'A' ? 'B' : 'A';
      markActiveVideo();
      currentLoopKeyRef.current = nextKey;
      setCurrentLoopKey(nextKey);
      updateVideoDebug({
        currentKey: nextKey,
        bufferKey: null,
        isInJump: isInJumpRef.current,
        lastSwitchAt: Date.now(),
        lastSwitchFrom: fromKey,
        lastSwitchTo: nextKey,
        lastError: null,
        activeVideoId: currentVideoRef.current === 'A' ? 'videoA' : 'videoB',
        activeVideoSrc: getCurrentVideoEl()?.currentSrc ?? getCurrentVideoEl()?.src ?? null,
        bufferVideoId: getBufferVideoEl()?.id === 'videoA' ? 'videoA' : getBufferVideoEl()?.id === 'videoB' ? 'videoB' : null,
        bufferVideoSrc: getBufferVideoEl()?.currentSrc ?? getBufferVideoEl()?.src ?? null,
        currentActive: getCurrentVideoEl()?.classList.contains('is-active') ?? false,
        bufferActive: getBufferVideoEl()?.classList.contains('is-active') ?? false,
        currentReadyState: getCurrentVideoEl()?.readyState ?? null,
        currentPaused: getCurrentVideoEl()?.paused ?? null
      });

      updateAudioDebug({
        switchId,
        phase: 'switchDone',
        activeVideoKey: nextKey,
        activeAmbientKey: nextKey,
        activeVideoEl: currentVideoRef.current
      });
      console.log('[VIDEO]', 'switchTo done', {
        switchId,
        videoKey: nextKey,
        ambientKey: nextKey,
        activeVideoEl: currentVideoRef.current,
        curse: curseRef.current
      });

      if (nextKey === MAIN_LOOP) {
        const warmupKey = randomPick(JUMP_LOOPS);
        void preloadIntoBuffer(warmupKey);
      }
    } catch (error) {
      updateVideoDebug({ lastError: String(error instanceof Error ? error.message : error) });
      console.error('[VIDEO]', 'switchTo failed', error);
      setAssets((prev) => ({ ...prev, videoOk: false }));
      onSceneError?.({
        summary: '影片載入失敗，直播尚未開始。',
        missingAssets: [{ name: nextKey, url: nextUrl, reason: error instanceof Error ? error.message : String(error) }]
      });
    } finally {
      isSwitchingRef.current = false;
      updateVideoDebug({ isSwitching: false });
      console.log('[VIDEO]', 'switchTo settled', {
        nextKey,
        isSwitching: isSwitchingRef.current,
        currentKey: currentLoopKeyRef.current
      });
    }
  }, [createAmbient, getBufferVideoEl, getCurrentVideoEl, getVideoUrlForKey, hasConfirmedPlayback, markActiveVideo, preloadIntoBuffer, updateAudioDebug, updateVideoDebug]);

  const scheduleNextJump = useCallback(() => {
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      nextJumpAtRef.current = null;
      updateVideoDebug({ timers: { jumpTimer: null }, nextJumpAt: null });
    }

    const interval = computeJumpIntervalMs(curseRef.current);
    const dueAt = Date.now() + interval;
    nextJumpAtRef.current = dueAt;
    console.log('[VIDEO]', 'scheduleNextJump set timer', { delay: interval, curse: curseRef.current });
    jumpTimerRef.current = window.setTimeout(() => {
      nextJumpAtRef.current = null;
      updateVideoDebug({ nextJumpAt: null });
      void triggerJumpOnce();
    }, interval);
    updateVideoDebug({ timers: { jumpTimer: jumpTimerRef.current }, nextJumpAt: dueAt });
  }, [computeJumpIntervalMs, updateVideoDebug]);

  const triggerJumpOnce = useCallback(async () => {
    console.log('[VIDEO]', 'triggerJumpOnce enter', {
      isSwitching: isSwitchingRef.current,
      isInJump: isInJumpRef.current,
      currentKey: currentLoopKeyRef.current
    });
    if (isSwitchingRef.current || isInJumpRef.current) {
      const reason = isSwitchingRef.current ? 'isSwitching' : 'isInJump';
      console.warn('[VIDEO]', 'triggerJumpOnce skipped', { reason });
      if (reason === 'isSwitching') {
        scheduleNextJump();
      }
      return;
    }
    if (currentLoopKeyRef.current !== MAIN_LOOP) {
      console.warn('[VIDEO]', 'triggerJumpOnce skipped: not on MAIN_LOOP', {
        currentKey: currentLoopKeyRef.current,
        mainLoop: MAIN_LOOP
      });
      scheduleNextJump();
      return;
    }

    isInJumpRef.current = true;
    updateVideoDebug({ isInJump: true });
    const nextKey = randomPick(JUMP_LOOPS);
    console.log('[VIDEO]', 'triggerJumpOnce picked nextKey', { nextKey, fromKey: currentLoopKeyRef.current });

    await switchTo(nextKey);

    if (currentLoopKeyRef.current !== nextKey) {
      isInJumpRef.current = false;
      updateVideoDebug({ isInJump: false });
      console.warn('[VIDEO]', 'triggerJumpOnce switch mismatch; reschedule', {
        expected: nextKey,
        actual: currentLoopKeyRef.current
      });
      scheduleNextJump();
      return;
    }

    currentLoopKeyRef.current = nextKey;
    console.log('[VIDEO]', 'triggerJumpOnce jump active', { currentKey: currentLoopKeyRef.current });
  }, [scheduleNextJump, switchTo]);

  const handleEnded = useCallback((event?: Event) => {
    const activeKey = currentLoopKeyRef.current;
    const activeVideo = getCurrentVideoEl();
    const endedEl = event?.currentTarget instanceof HTMLVideoElement ? event.currentTarget : null;
    if (endedEl && activeVideo && endedEl !== activeVideo) {
      console.log('[VIDEO]', 'ended ignored: inactive layer', {
        endedId: endedEl.id,
        activeId: activeVideo.id,
        activeKey
      });
      return;
    }
    console.log('[VIDEO]', 'ended handler fired', {
      key: activeKey,
      videoId: endedEl?.id ?? activeVideo?.id ?? 'unknown'
    });
    updateVideoDebug({ lastEndedKey: activeKey });
    if (!autoNextEnabledRef.current || !hasConfirmedPlayback) return;

    if (isInJumpRef.current) {
      isInJumpRef.current = false;
      updateVideoDebug({ isInJump: false });
      console.log('[VIDEO]', 'ended while in jump; switching back to MAIN_LOOP', { mainLoop: MAIN_LOOP });
      void switchTo(MAIN_LOOP).then(() => {
        currentLoopKeyRef.current = MAIN_LOOP;
        scheduleNextJump();
      });
      return;
    }

    console.log('[VIDEO]', 'ended on main/non-jump; enforce MAIN_LOOP', { mainLoop: MAIN_LOOP });
    void switchTo(MAIN_LOOP).then(() => {
      currentLoopKeyRef.current = MAIN_LOOP;
    });
  }, [getCurrentVideoEl, hasConfirmedPlayback, scheduleNextJump, switchTo, updateVideoDebug]);


  const startOldhouseCalmMode = useCallback(async () => {
    console.log('[VIDEO]', 'startOldhouseCalmMode', { mainLoop: MAIN_LOOP, jumpLoops: JUMP_LOOPS });
    setAutoNextEnabled(true);
    autoNextEnabledRef.current = true;
    isInJumpRef.current = false;
    currentLoopKeyRef.current = MAIN_LOOP;

    setRequiredAudioError(null);
    setVideoErrorDetail(null);

    const missingRequiredAudio = await verifyRequiredAudioAssets();
    if (missingRequiredAudio.length > 0) {
      const message = '必要音效素材載入失敗，無法開始直播。';
      setRequiredAudioError(message);
      setHasConfirmedPlayback(false);
      onSceneError?.({ summary: message, missingAssets: missingRequiredAudio });
      throw new Error(message);
    }

    if (!isAudioStartedRef.current) {
      isAudioStartedRef.current = true;
      try {
        await startFanLoop();
      } catch {
        setNeedsGestureState(true);
        isAudioStartedRef.current = false;
      }

      if (isAudioStartedRef.current) {
        scheduleFootsteps();
        scheduleGhost();
      }
    }

    await switchTo(MAIN_LOOP);
    const started = await tryPlayMedia();
    if (!started) {
      setNeedsGestureState(true);
      return;
    }
    scheduleNextJump();
    announceRunning();
  }, [announceRunning, onSceneError, scheduleFootsteps, scheduleGhost, scheduleNextJump, setNeedsGestureState, startFanLoop, switchTo, tryPlayMedia]);

  const stopOldhouseCalmMode = useCallback(() => {
    setAutoNextEnabled(false);
    autoNextEnabledRef.current = false;
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = null;
      nextJumpAtRef.current = null;
      updateVideoDebug({ timers: { jumpTimer: null }, nextJumpAt: null });
    }

    if (footstepsTimerRef.current) {
      window.clearTimeout(footstepsTimerRef.current);
      footstepsTimerRef.current = null;
    }
    if (ghostTimerRef.current) {
      window.clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = null;
    }
    isAudioStartedRef.current = false;
  }, [updateVideoDebug]);

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
    const syncDebugEnabled = () => {
      const searchEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
      const hashEnabled = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('debug') === '1';
      setDebugEnabled(searchEnabled || hashEnabled);
    };

    syncDebugEnabled();
    window.addEventListener('popstate', syncDebugEnabled);
    window.addEventListener('hashchange', syncDebugEnabled);
    return () => {
      window.removeEventListener('popstate', syncDebugEnabled);
      window.removeEventListener('hashchange', syncDebugEnabled);
    };
  }, []);

  useEffect(() => {
    if (!hasConfirmedPlayback) return;
    void startOldhouseCalmMode().catch((error) => {
      console.error('[audio-required] 啟動失敗，已阻止進入直播開始狀態', error);
    });
  }, [hasConfirmedPlayback, startOldhouseCalmMode]);

  useEffect(() => {
    if (!hasConfirmedPlayback || !autoNextEnabledRef.current || isInJumpRef.current) return;
    scheduleNextJump();
  }, [curse, hasConfirmedPlayback, scheduleNextJump]);

  const bindEnded = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    el.loop = false;
    el.onended = (event) => handleEnded(event);
    console.log('[VIDEO]', 'bind ended', { id: el.id, loop: el.loop });
  }, [handleEnded]);

  useEffect(() => {
    bindEnded(videoARef.current);
    bindEnded(videoBRef.current);
  }, [bindEnded]);

  useEffect(() => {
    window.__VIDEO_DEBUG__ = {
      currentKey: null,
      bufferKey: null,
      isSwitching: false,
      lastSwitchAt: 0,
      isInJump: false,
      nextJumpAt: null,
      lastSwitchFrom: null,
      lastSwitchTo: null,
      lastError: null,
      lastEndedKey: null,
      activeVideoId: null,
      activeVideoSrc: null,
      bufferVideoId: null,
      bufferVideoSrc: null,
      currentActive: false,
      bufferActive: false,
      currentReadyState: null,
      currentPaused: null,
      timers: { jumpTimer: null }
    };

    window.__AUDIO_DEBUG__ = {
      started: false,
      lastFanAt: 0,
      lastFootstepsAt: 0,
      lastGhostAt: 0,
      activeVideoKey: null,
      activeAmbientKey: null,
      activeVideoEl: currentVideoRef.current,
      switchId: 0,
      phase: 'init'
    };

    return () => {
      window.__AUDIO_DEBUG__ = undefined;
      window.__VIDEO_DEBUG__ = undefined;
    };
  }, []);

  useEffect(() => {
    fanAudioRef.current = new Audio(FAN_LOOP_PATH);
    fanAudioRef.current.preload = 'auto';
    fanAudioRef.current.loop = true;
    fanAudioRef.current.volume = 0.4;
    fanAudioRef.current.muted = false;

    footstepsAudioRef.current = new Audio(FOOTSTEPS_PATH);
    footstepsAudioRef.current.preload = 'auto';
    footstepsAudioRef.current.loop = false;
    footstepsAudioRef.current.volume = 0.85;
    footstepsAudioRef.current.muted = false;

    ghostAudioRef.current = new Audio(GHOST_FEMALE_PATH);
    ghostAudioRef.current.preload = 'auto';
    ghostAudioRef.current.loop = false;
    ghostAudioRef.current.volume = 0.75;
    ghostAudioRef.current.muted = false;

    return () => {
      stopAmbient();
      stopOldhouseCalmMode();
      fanAudioRef.current?.pause();
      footstepsAudioRef.current?.pause();
      ghostAudioRef.current?.pause();
      fanAudioRef.current = null;
      footstepsAudioRef.current = null;
      ghostAudioRef.current = null;
    };
  }, [stopAmbient, stopOldhouseCalmMode]);

  useEffect(() => {
    return () => {
      if (jumpTimerRef.current) {
        window.clearTimeout(jumpTimerRef.current);
      }
      nextJumpAtRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!debugEnabled) return;
    const timer = window.setInterval(() => {
      setDebugTick(Date.now());
      const currentEl = getCurrentVideoEl();
      const bufferEl = getBufferVideoEl();
      updateVideoDebug({
        currentKey: currentLoopKeyRef.current,
        isSwitching: isSwitchingRef.current,
        isInJump: isInJumpRef.current,
        nextJumpAt: nextJumpAtRef.current,
        activeVideoId: currentEl?.id === 'videoA' ? 'videoA' : currentEl?.id === 'videoB' ? 'videoB' : null,
        activeVideoSrc: currentEl?.currentSrc ?? currentEl?.src ?? null,
        bufferVideoId: bufferEl?.id === 'videoA' ? 'videoA' : bufferEl?.id === 'videoB' ? 'videoB' : null,
        bufferVideoSrc: bufferEl?.currentSrc ?? bufferEl?.src ?? null,
        currentActive: currentEl?.classList.contains('is-active') ?? false,
        bufferActive: bufferEl?.classList.contains('is-active') ?? false,
        currentReadyState: currentEl?.readyState ?? null,
        currentPaused: currentEl?.paused ?? null
      });
    }, 200);

    return () => {
      window.clearInterval(timer);
    };
  }, [debugEnabled, getBufferVideoEl, getCurrentVideoEl, updateVideoDebug]);

  const videoDebug = window.__VIDEO_DEBUG__;
  const trimSrc = (src: string | null | undefined) => {
    if (!src) return '-';
    return src.length > 72 ? `...${src.slice(-72)}` : src;
  };
  const nextJumpDueInSec = videoDebug?.nextJumpAt ? Math.max(0, (videoDebug.nextJumpAt - debugTick) / 1000).toFixed(1) : '-';
  const lastSwitchAgoMs = videoDebug?.lastSwitchAt ? Math.max(0, debugTick - videoDebug.lastSwitchAt) : null;

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
    console.log('[VIDEO]', 'loop flags', { A: videoA?.loop, B: videoB?.loop });
  }, [markActiveVideo]);

  useEffect(() => {
    const layer = videoLayerRef.current;
    if (!layer) return;

    const unlockPlayback = () => {
      if (!needsUserGestureToPlayRef.current) return;
      void (async () => {
        try {
          await startFanLoop();
          const started = await tryPlayMedia();
          if (!started) {
            return;
          }
          if (!isAudioStartedRef.current) {
            isAudioStartedRef.current = true;
            scheduleFootsteps();
            scheduleGhost();
          }
          announceRunning();
        } catch {
          setNeedsGestureState(true);
        }
      })();
    };

    layer.addEventListener('click', unlockPlayback, { passive: true });
    return () => {
      layer.removeEventListener('click', unlockPlayback);
    };
  }, [announceRunning, scheduleFootsteps, scheduleGhost, startFanLoop, tryPlayMedia]);

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
            onError={() => {
              setAssets((prev) => ({ ...prev, videoOk: false }));
              setVideoErrorDetail('videoA element error');
            }}
          />

          <video
            id="videoB"
            className="scene-video"
            ref={videoBRef}
            preload="auto"
            playsInline
            autoPlay
            onError={() => {
              setAssets((prev) => ({ ...prev, videoOk: false }));
              setVideoErrorDetail('videoB element error');
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
          影片載入失敗：<code>{videoErrorDetail ?? `active=${currentLoopKey}`}</code>
        </div>
      )}

      {requiredAudioError && (
        <div className="asset-warning">
          必要音效載入失敗：<code>{requiredAudioError}</code>
        </div>
      )}

      {debugEnabled && (
        <div className="video-debug-overlay" aria-live="polite">
          <div>currentKey: {videoDebug?.currentKey ?? '-'}</div>
          <div>currentEl: {videoDebug?.activeVideoId ?? '-'} | src: {trimSrc(videoDebug?.activeVideoSrc)}</div>
          <div>bufferEl: {videoDebug?.bufferVideoId ?? '-'} | src: {trimSrc(videoDebug?.bufferVideoSrc)}</div>
          <div>currentActive/bufferActive: {String(videoDebug?.currentActive ?? false)} / {String(videoDebug?.bufferActive ?? false)}</div>
          <div>isSwitching / isInJump: {String(videoDebug?.isSwitching ?? false)} / {String(videoDebug?.isInJump ?? false)}</div>
          <div>nextJumpDueIn: {nextJumpDueInSec}s</div>
          <div>
            lastSwitch: {(videoDebug?.lastSwitchFrom ?? '-')} -&gt; {(videoDebug?.lastSwitchTo ?? '-')} | {lastSwitchAgoMs == null ? '-' : `${lastSwitchAgoMs}ms ago`}
          </div>
          <div>currentEl readyState/paused: {videoDebug?.currentReadyState ?? '-'} / {String(videoDebug?.currentPaused ?? false)}</div>
        </div>
      )}
    </section>
  );
}
