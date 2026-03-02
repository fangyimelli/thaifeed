import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FAN_LOOP_PATH,
  JUMP_LOOPS,
  LOOP_KEY_ALIASES,
  MAIN_LOOP,
  type LoopRequestKey,
  type OldhouseLoopKey,
  VIDEO_PATH_BY_KEY
} from '../../config/oldhousePlayback';
import { resolveAssetUrl } from '../../config/assetUrls';
import { createPlayerCore } from '../../core/player/playerCore';
import { curseVisualClass } from '../../core/systems/curseSystem';
import { emitSceneEvent, onSceneRequest } from '../../core/systems/sceneEvents';
import type { AnchorType } from '../../core/state/types';
import { getCachedAsset } from '../../utils/preload';
import { audioEngine } from '../../audio/AudioEngine';
import { SFX_REGISTRY, type SfxKey } from '../../audio/SfxRegistry';
import { distanceApproachPlayer, playSfxApproach, type PlayResult } from '../../audio/distanceApproach';

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
  isDesktopLayout: boolean;
  appStarted: boolean;
  blackoutState?: {
    isActive: boolean;
    mode: 'full' | 'dim75';
    startedAt: number | null;
    endsAt: number | null;
    flickerSeed: number;
    pulseAtMs: number;
    pulseDurationMs: number;
  };
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

const initialAssets: SceneAssetState = {
  videoOk: true,
  smokeOk: true,
  crackOk: true,
  noiseOk: true,
  vignetteOk: true
};

const OVERLAY_SMOKE_SRC = resolveAssetUrl('assets/overlays/overlay_smoke_room.png');
const OVERLAY_CRACK_SRC = resolveAssetUrl('assets/overlays/overlay_crack_glass.png');
const OVERLAY_VIGNETTE_SRC = resolveAssetUrl('assets/overlays/overlay_vignette.png');
const OVERLAY_NOISE_SRC = resolveAssetUrl('assets/overlays/overlay_noise_film.png');

const ANCHOR_POSITIONS: Record<AnchorType, { top: number; left: number }> = {
  under_table: { top: 74, left: 46 },
  door: { top: 52, left: 84 },
  window: { top: 31, left: 66 },
  corner: { top: 20, left: 16 }
};

const CROSSFADE_MS = 420;
const PRELOAD_READY_FALLBACK_TIMEOUT_MS = 3200;
const JUMP_RETURN_SCHEDULE_FALLBACK_MS = 45000;
const FIRST_JUMP_DELAY_MIN_MS = 15000;
const FIRST_JUMP_DELAY_MAX_MS = 30000;

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

type AudioDebugState = {
  started: boolean;
  lastFanAt: number;
  lastFootstepsAt: number;
  lastGhostAt: number;
  activeVideoKey: OldhouseLoopKey | null;
  activeVideoEl: 'A' | 'B';
  switchId: number;
  phase: string;
  fanState: {
    mode: 'webaudio' | 'html-audio-fallback' | 'none';
    contextState: AudioContextState | 'unsupported';
    playing: boolean;
    currentTime: number;
    nextStartTime: number | null;
    xfadeSec: number;
    hasScheduledNext: boolean;
    bufferDuration: number | null;
    lastRestartReason: string | null;
  };
  videoStates: Array<{ id: 'videoA' | 'videoB'; paused: boolean; muted: boolean; volume: number; currentTime: number }>;
  playingAudios: Array<{ label: string; muted: boolean; volume: number; currentTime: number }>;
  lastPlayResult?: PlayResult;
  lastApproach?: { key: string; startGain: number; endGain: number; currentGain: number; startedAt: number; durationMs: number };
  trace?: Array<{ at: number; stage: string; key?: string; detail?: string }>;
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
  jumpCandidates: OldhouseLoopKey[];
  plannedJump: PlannedJumpState | null;
  nowMs: number;
  dueInMs: number | null;
  whyNotJumped: string;
  lastFallback: { fromKey: OldhouseLoopKey | null; toKey: OldhouseLoopKey | null; reason: string } | null;
  unavailableJumps: Array<{ key: OldhouseLoopKey; reason: string }>;
  sceneMapDigest: Record<OldhouseLoopKey, string>;
  lastPlayRequest: { requestedKey: string; at: number; reason: string; sourceEventKey?: string } | null;
  lastSwitch: { fromKey: string | null; toKey: string; at: number; reason: string; sourceEventKey?: string } | null;
  lastDenied: { requestedKey: string; at: number; denyReason: string; sourceEventKey?: string } | null;
  priorityLock: { lockedUntil: number; lockedByEventKey: string | null };
  timers: { jumpTimer: number | null; watchdogTimer: number | null };
};

type PlannedJumpState = {
  dueAt: number;
  key: OldhouseLoopKey;
  url: string;
  scheduledAt: number;
  timerId: number | null;
  lastTimerFiredAt: number | null;
  lastWatchdogFiredAt: number | null;
  executedForDueAt: number | null;
  executedAt: number | null;
  lastExecAt: number | null;
  lastExecReason: 'timer' | 'watchdog' | 'force' | null;
  lastExecResult: string | null;
};

const SCENE_MAP_DIGEST: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: VIDEO_PATH_BY_KEY.oldhouse_room_loop,
  oldhouse_room_loop2: VIDEO_PATH_BY_KEY.oldhouse_room_loop2,
  oldhouse_room_loop3: VIDEO_PATH_BY_KEY.oldhouse_room_loop3,
  oldhouse_room_loop4: VIDEO_PATH_BY_KEY.oldhouse_room_loop4
};

declare global {
  interface Window {
    __AUDIO_DEBUG__?: AudioDebugState;
    __VIDEO_DEBUG__?: VideoDebugState;
    __CHAT_DEBUG__?: {
      lastEventKey?: string;
      lastEventReason?: string;
      lastLineKey?: string;
      lastVariantId?: string;
      lastTone?: string;
      lastPersona?: string;
      lastSfxKey?: string;
      lastSfxReason?: string;
      lastGhostSfxReason?: string;
      lastContentId?: string;
      lastNameInjected?: string;
      contentRepeatBlocked?: boolean;
      violation?: string;
      sfxCooldowns?: Record<string, number>;
      lock?: { isLocked: boolean; target: string | null; elapsed: number; chatSpeedMultiplier: number };
      queueLength?: number;
      blockedReasons?: Record<string, number>;
      debugReset?: { count?: number; reason?: string; resetAt?: number };
      chat?: {
        autoPaused?: boolean;
        autoPausedReason?: string;
        autoScrollMode?: 'FOLLOW' | 'COUNTDOWN' | 'FROZEN';
        freezeCountdownRemaining?: number;
        freezeAfterNMessages?: number;
        freezeCountdownStartedAt?: number;
        lastScrollFreezeReason?: string;
        lastScrollModeChangeAt?: number;
        lastMessageActorIdCounted?: string;
        lastCountdownDecrementAt?: number;
        activeUsers?: { count?: number; nameSample?: string[]; namesSample?: string[]; currentHandle?: string; initialHandle?: string; renameDisabled?: boolean };
        audience?: { count?: number };
        activeUser?: { id?: string; handle?: string; registered?: boolean };
        system?: {
          buildStamp?: string;
          at?: number;
          bootstrap?: { isReady?: boolean; activatedAt?: number | null; activatedBy?: 'username_submit' | 'debug' | null };
          audioEnabledSystemMessageSent?: boolean;
          audioUnlockFailedReason?: string;
          lastBlockedReason?: string;
          debugReset?: { count?: number; reason?: string; resetAt?: number };
        };
        canTagActiveUser?: boolean;
        mention?: { lastMessageMentionsActiveUser?: boolean };
        lastActorPicked?: { id?: string };
        actorPickBlockedReason?: string;
        pacing?: {
          mode?: 'normal' | 'slightlyBusy' | 'tense' | 'quiet' | 'tag_slow' | 'slowed' | 'locked_slowed';
          nextModeInSec?: number;
          baseRate?: number;
          currentRate?: number;
          jitterEnabled?: boolean;
          nextMessageDueInSec?: number;
        };
        lint?: { lastRejectedText?: string; lastRejectedReason?: string; rerollCount?: number };
        audienceInvariant?: { removedActiveUser?: boolean; reason?: string };
        blockedCounts?: { activeUserAutoSpeak?: number };
        freeze?: { isFrozen?: boolean; reason?: 'tagged_question' | null; startedAt?: number | null };
        npcSpawnBlockedByFreeze?: number;
        ghostBlockedByFreeze?: number;
        sendSourceWarning?: { at?: number; actor?: string; textPreview?: string };
      lastBlockedSendAttempt?: {
          actorId?: string;
          actorHandle?: string;
          source?: string;
          sourceTag?: string;
          textPreview?: string;
          at?: number;
          blockedReason?: string;
        };
      };
      audio?: {
        lastApproach?: {
          key?: string;
          startedAt?: number;
          durationMs?: number;
          startGain?: number;
          endGain?: number;
          startLPF?: number;
          endLPF?: number;
        } | null;
      };
      fx?: {
        blackout?: {
          isActive?: boolean;
          mode?: 'full' | 'dim75';
          endsInMs?: number;
        };
      };
      event?: {
        registry?: {
          count?: number;
          keys?: string[];
          enabledCount?: number;
          disabledCount?: number;
          manifest?: Array<{
            key: string;
            preEffect?: { sfxKey?: string; videoKey?: string };
            postEffect?: { sfxKey?: string; videoKey?: string };
            cooldownMs?: number;
            usesLock?: boolean;
          }>;
        };
        scheduler?: {
          now?: number;
          nextDueAt?: number;
          lastFiredAt?: number;
          tickCount?: number;
          lastTickAt?: number;
          blocked?: boolean;
          blockedReason?: string;
          cooldowns?: Record<string, number>;
        };
        candidates?: {
          lastComputedAt?: number;
          lastCandidateCount?: number;
          lastCandidateKeys?: string[];
          lastGateRejectSummary?: Record<string, number>;
        };
        blocking?: {
          isLocked?: boolean;
          lockTarget?: string | null;
          lockElapsedSec?: number;
          schedulerBlocked?: boolean;
          schedulerBlockedReason?: string;
          lockReason?: string;
          lockTargetMissing?: boolean;
        };
        cooldowns?: Record<string, number>;
        cooldownMeta?: Record<string, { nextAllowedAt?: number; lastCommittedAt?: number; lastRollbackAt?: number }>;
        freezeGuard?: { hasRealTag?: boolean; replyUIReady?: boolean; freezeAllowed?: boolean; checkedAt?: number };
        inFlight?: boolean;
        lastStartAttemptBlockedReason?: string;
        exclusive?: boolean;
        currentEventId?: string | null;
        currentLockOwner?: string | null;
        lockTarget?: string | null;
        lockElapsedSec?: number;
        foreignTagBlockedCount?: number;
        lastBlockedReason?: string;
        queue?: {
          length?: number;
        };
        qna?: {
          isActive?: boolean;
          flowId?: string;
          eventKey?: string | null;
          stepId?: string;
          awaitingReply?: boolean;
          lastAskedAt?: number;
          attempts?: number;
          taggedUser?: string | null;
          lockTarget?: string | null;
          lastQuestionActor?: string | null;
          lastAskedTextPreview?: string;
          lockTargetInvalid?: boolean;
          matched?: { optionId?: string; keyword?: string; at?: number } | null;
          pendingChain?: { eventKey?: string } | null;
          taggedUserHandle?: string | null;
          lastQuestionMessageId?: string | null;
          lastQuestionMessageHasTag?: boolean;
          questionHasTagToActiveUser?: boolean;
          isTaggedQuestionActive?: boolean;
          lastBlockedReason?: string | null;
        };
        test?: {
          lastStartAttemptAt?: number;
          lastStartAttemptKey?: string;
          lastStartAttemptBlockedReason?: string;
        };
        lastEvent?: {
          key?: string;
          eventId?: string;
          at?: number;
          reason?: string;
          lineVariantId?: string;
          openerLineId?: string;
          followUpLineId?: string;
          lineIds?: string[];
          topic?: 'ghost' | 'footsteps' | 'light';
          state?: 'active' | 'aborted' | 'done';
          starterTagSent?: boolean;
          preEffectTriggered?: boolean;
          preEffectAt?: number;
          preEffect?: {
            sfxKey?: 'ghost_female' | 'footsteps' | 'fan_loop';
            videoKey?: 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3' | 'oldhouse_room_loop4';
          };
          abortedReason?: string;
          waitingForReply?: boolean;
          questionMessageId?: string | null;
          commitBlockedReason?: string;
          forcedByDebug?: boolean;
          forceOptions?: {
            ignoreCooldown?: boolean;
            ignorePause?: boolean;
            skipTagRequirement?: boolean;
          } | null;
          effects?: {
            plan?: { sfx?: string[]; videoKey?: string; blackout?: boolean };
            applied?: { sfxPlayed?: string[]; videoSwitched?: string; errors?: string[] };
          };
        };
        lastEventCommitBlockedReason?: string;
        lastCommitBlockedReason?: string;
        debug?: {
          lastForcedEventKey?: string | null;
          lastForcedAt?: number | null;
          lastForcedOptions?: {
            ignoreCooldown?: boolean;
            ignorePause?: boolean;
            skipTagRequirement?: boolean;
          } | null;
          forcedEventCount?: number;
        };
        lastEffects?: {
          sfxPlayed?: Array<{ key: string; startedAt: number }>;
          videoSwitchedTo?: { key?: string; src?: string } | null;
          blackoutStartedAt?: number | null;
          mode?: string;
        };
        lastReactions?: {
          count?: number;
          lastReactionActors?: string[];
        };
        lastEventLabel?: string;
      };
      ui?: {
        replyPinMounted?: boolean;
        replyPinContainerLocation?: string;
        replyPinInsideChatList?: boolean;
        replyPreviewSuppressed?: string;
        replyPreviewLocation?: string;
        legacyReplyQuoteEnabled?: boolean;
        send?: {
          lastClickAt?: number;
          lastSubmitAt?: number;
          lastAttemptAt?: number;
          blockedAt?: number;
          lastResult?: 'sent' | 'blocked' | 'error' | '-';
          blockedReason?: string;
          errorMessage?: string;
          stateSnapshot?: {
            inputLen?: number;
            isSending?: boolean;
            isComposing?: boolean;
            cooldownMsLeft?: number;
            tagLockActive?: boolean;
            replyTarget?: string | null;
            mentionTarget?: string | null;
            canSendComputed?: boolean;
          };
        };
      };
    };
  }
}

export default function SceneView({
  targetConsonant,
  curse,
  anchor,
  isDesktopLayout,
  appStarted,
  blackoutState,
  onNeedUserGestureChange,
  onSceneRunning,
  onSceneError
}: Props) {
  const [assets, setAssets] = useState<SceneAssetState>(initialAssets);
  const [currentLoopKey, setCurrentLoopKey] = useState<OldhouseLoopKey>(MAIN_LOOP);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [videoErrorDetail, setVideoErrorDetail] = useState<string | null>(null);
  const [debugIgnorePause, setDebugIgnorePause] = useState(false);
  const [debugIgnoreCooldown, setDebugIgnoreCooldown] = useState(false);
  const [debugMasterVolume, setDebugMasterVolume] = useState(distanceApproachPlayer.getMasterVolume());
  const videoLayerRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const currentVideoRef = useRef<'A' | 'B'>('A');
  const playerCoreRef = useRef(createPlayerCore());
  const blackoutRafRef = useRef<number | null>(null);
  const [blackoutOpacity, setBlackoutOpacity] = useState(0);
  const currentLoopKeyRef = useRef<OldhouseLoopKey>(MAIN_LOOP);
  const isInJumpRef = useRef(false);
  const jumpTimerRef = useRef<number | null>(null);
  const jumpReturnTimerRef = useRef<number | null>(null);
  const curseRef = useRef(curse);
  const autoNextEnabledRef = useRef(true);
  const isSwitchingRef = useRef(false);
  const needsUserGestureToPlayRef = useRef(false);
  const runningAnnouncedRef = useRef(false);
  const isAudioStartedRef = useRef(false);
  const switchCounterRef = useRef(0);
  const nextJumpAtRef = useRef<number | null>(null);
  const plannedJumpRef = useRef<PlannedJumpState | null>(null);
  const jumpWatchdogRef = useRef<number | null>(null);
  const priorityLockRef = useRef<{ lockedUntil: number; lockedByEventKey: string | null }>({ lockedUntil: 0, lockedByEventKey: null });
  const [debugEnabled, setDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const searchEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    const hashEnabled = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('debug') === '1';
    return searchEnabled || hashEnabled;
  });
  const [debugTick, setDebugTick] = useState(() => Date.now());

  const updateAudioDebug = useCallback((patch: Partial<AudioDebugState>) => {
    const prev: AudioDebugState = window.__AUDIO_DEBUG__ ?? {
      started: false,
      lastFanAt: 0,
      lastFootstepsAt: 0,
      lastGhostAt: 0,
      activeVideoKey: null,
      activeVideoEl: currentVideoRef.current,
      switchId: 0,
      phase: 'idle',
      fanState: {
        mode: 'none',
        contextState: 'unsupported',
        playing: false,
        currentTime: 0,
        nextStartTime: null,
        xfadeSec: 2,
        hasScheduledNext: false,
        bufferDuration: null,
        lastRestartReason: null
      },
      videoStates: [],
      playingAudios: [],
      trace: []
    };
    window.__AUDIO_DEBUG__ = {
      ...prev,
      ...patch,
      trace: [...(prev.trace ?? []), ...(patch.trace ?? [])].slice(-40)
    };
  }, []);

  const stopAllNonPersistentSfx = useCallback(() => {
    distanceApproachPlayer.stopAll();
  }, []);

  const getCurrentVideoEl = useCallback(() => {
    return currentVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
  }, []);

  const getBufferVideoEl = useCallback(() => {
    return currentVideoRef.current === 'A' ? videoBRef.current : videoARef.current;
  }, []);

  const updateVideoDebug = useCallback((patch: Omit<Partial<VideoDebugState>, 'timers'> & { timers?: Partial<VideoDebugState['timers']> }) => {
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
      jumpCandidates: [],
      plannedJump: null,
      nowMs: Date.now(),
      dueInMs: null,
      whyNotJumped: 'planned_jump_missing',
      lastFallback: null,
      unavailableJumps: [],
      sceneMapDigest: SCENE_MAP_DIGEST,
      lastPlayRequest: null,
      lastSwitch: null,
      lastDenied: null,
      priorityLock: { ...priorityLockRef.current },
      timers: { jumpTimer: null, watchdogTimer: null }
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

  const resolveLoopKey = useCallback((key: LoopRequestKey): OldhouseLoopKey | null => {
    return LOOP_KEY_ALIASES[key] ?? null;
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
    playerCoreRef.current.enforceAudio(active, inactive);
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

  const collectAudioDebugSnapshot = useCallback(() => {
    const currentVideo = getCurrentVideoEl();
    const bufferVideo = getBufferVideoEl();
    const videoStates = [videoARef.current, videoBRef.current]
      .filter((video): video is HTMLVideoElement => Boolean(video))
      .map((video) => ({
        id: video.id as 'videoA' | 'videoB',
        paused: video.paused,
        muted: video.muted,
        volume: Number(video.volume.toFixed(2)),
        currentTime: Number(video.currentTime.toFixed(2))
      }));
    const audios = distanceApproachPlayer.getPlayingKeys().map((label) => ({
      label,
      muted: false,
      volume: Number((SFX_REGISTRY[label].defaultVolume ?? 0).toFixed(2)),
      currentTime: 0
    }));
    updateAudioDebug({
      activeVideoEl: currentVideo?.id === 'videoB' ? 'B' : 'A',
      fanState: audioEngine.getFanDebugStatus(),
      videoStates,
      playingAudios: audios
    });
    return { videoStates, audios, bufferVideo };
  }, [getBufferVideoEl, getCurrentVideoEl, updateAudioDebug]);

  const startFanLoop = useCallback(async () => {
    try {
      audioEngine.setFanVolume(0.4);
      await audioEngine.startFanLoop(FAN_LOOP_PATH, 0.4, 'scene_start');
      setNeedsGestureState(false);
      const t = Date.now();
      updateAudioDebug({ started: true, lastFanAt: t });
      console.log('[AUDIO] fan loop started', { t, curse: curseRef.current });
      emitSceneEvent({ type: 'SFX_START', sfxKey: 'fan_loop', startedAt: t });
    } catch {
      setNeedsGestureState(true);
      console.warn('[AUDIO] play blocked/failed', { key: 'fan_loop', errName: 'unknown' });
      throw new Error('Fan loop autoplay blocked until user gesture');
    }
  }, [setNeedsGestureState, updateAudioDebug]);

  const playSfx = useCallback((sfxKey: SfxKey, options?: {
    delayMs?: number;
    startVolume?: number;
    endVolume?: number;
    rampSec?: number;
    ignorePause?: boolean;
    ignoreCooldown?: boolean;
    forceDebug?: boolean;
  }): Promise<PlayResult> => {
    if (sfxKey === 'fan_loop') return Promise.resolve({ ok: false, key: sfxKey, reason: 'unknown', detail: 'fan_loop handled by AudioEngine' });
    const trace = (stage: string, detail?: string) => updateAudioDebug({ trace: [{ at: Date.now(), stage, key: sfxKey, detail }] });
    trace('play_called', options?.forceDebug ? 'debug_force' : 'event');
    const spec = SFX_REGISTRY[sfxKey];
    if (!spec) {
      const result: PlayResult = { ok: false, key: sfxKey, reason: 'asset_missing', detail: 'missing manifest entry' };
      trace('asset_missing', result.detail);
      updateAudioDebug({ lastPlayResult: result });
      return Promise.resolve(result);
    }
    trace('asset_loaded', spec.file);
    const paused = Boolean((window.__CHAT_DEBUG__?.chat as { pause?: { isPaused?: boolean } } | undefined)?.pause?.isPaused);
    if (paused && !options?.ignorePause) {
      const result: PlayResult = { ok: false, key: sfxKey, reason: 'paused', detail: 'chat.pause.isPaused=true' };
      trace('paused_gate', result.detail);
      updateAudioDebug({ lastPlayResult: result });
      return Promise.resolve(result);
    }
    const now = Date.now();
    const cooldowns = window.__CHAT_DEBUG__?.event?.cooldowns ?? {};
    if (!options?.ignoreCooldown && (cooldowns[sfxKey] ?? 0) > now) {
      const result: PlayResult = { ok: false, key: sfxKey, reason: 'cooldown', detail: `until=${cooldowns[sfxKey]}` };
      trace('cooldown_gate', result.detail);
      updateAudioDebug({ lastPlayResult: result });
      return Promise.resolve(result);
    }
    if (distanceApproachPlayer.getMasterVolume() <= 0) {
      const result: PlayResult = { ok: false, key: sfxKey, reason: 'volume_zero', detail: 'master_gain=0' };
      trace('volume_zero', result.detail);
      updateAudioDebug({ lastPlayResult: result });
      return Promise.resolve(result);
    }
    const run = async () => {
      if (needsUserGestureToPlayRef.current) {
        const result: PlayResult = { ok: false, key: sfxKey, reason: 'audio_locked', detail: 'needs_user_gesture' };
        trace('audio_locked', result.detail);
        updateAudioDebug({ lastPlayResult: result });
        return result;
      }
      trace('node_chain_ready', 'src->gain->lowpass->panner->master');
      const approachKey = sfxKey as 'footsteps' | 'ghost_female';
      const result = await playSfxApproach(approachKey, {
        profileOverride: {
          startGain: options?.startVolume,
          endGain: options?.endVolume,
          durationMs: options?.rampSec ? Math.floor(options.rampSec * 1000) : undefined
        }
      });
      if (result.ok) {
        const startedAt = result.startedAt;
        trace('play_started', `duration=${result.durationMs}`);
        updateAudioDebug({
          started: true,
          lastFootstepsAt: sfxKey === 'footsteps' ? startedAt : (window.__AUDIO_DEBUG__?.lastFootstepsAt ?? 0),
          lastGhostAt: sfxKey === 'ghost_female' ? startedAt : (window.__AUDIO_DEBUG__?.lastGhostAt ?? 0),
          lastPlayResult: result,
          lastApproach: distanceApproachPlayer.getLastApproach() ?? undefined
        });
        emitSceneEvent({ type: 'SFX_START', sfxKey, startedAt });
        window.setTimeout(() => {
          trace('ended');
        }, result.durationMs + 60);
      } else {
        trace('error', `${result.reason}:${result.detail ?? '-'}`);
        updateAudioDebug({ lastPlayResult: result });
      }
      if (!result.ok && result.reason === 'audio_locked') {
        setNeedsGestureState(true);
      }
      console.log('[AUDIO][SFX_PLAY_RESULT]', result);
      return result;
    };
    if (options?.delayMs && options.delayMs > 0) {
      return new Promise((resolve) => {
        window.setTimeout(() => {
          void run().then(resolve);
        }, options.delayMs);
      });
    }
    return run();
  }, [setNeedsGestureState, updateAudioDebug]);

  useEffect(() => {
    if (!blackoutState?.isActive || !blackoutState.startedAt || !blackoutState.endsAt) {
      setBlackoutOpacity(0);
      if (blackoutRafRef.current != null) {
        window.cancelAnimationFrame(blackoutRafRef.current);
        blackoutRafRef.current = null;
      }
      return;
    }
    const baseOpacity = blackoutState.mode === 'full' ? 1 : 0.75;
    let seed = blackoutState.flickerSeed >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const render = () => {
      const now = Date.now();
      if (now >= blackoutState.endsAt!) {
        setBlackoutOpacity(0);
        blackoutRafRef.current = null;
        return;
      }
      const elapsed = now - blackoutState.startedAt!;
      const inPulse = elapsed >= blackoutState.pulseAtMs && elapsed <= blackoutState.pulseAtMs + blackoutState.pulseDurationMs;
      if (inPulse) {
        setBlackoutOpacity(0.02);
      } else {
        const jitter = rand() * 0.15;
        setBlackoutOpacity(Math.max(0, Math.min(1, baseOpacity - jitter)));
      }
      blackoutRafRef.current = window.requestAnimationFrame(render);
    };
    blackoutRafRef.current = window.requestAnimationFrame(render);
    return () => {
      if (blackoutRafRef.current != null) {
        window.cancelAnimationFrame(blackoutRafRef.current);
        blackoutRafRef.current = null;
      }
    };
  }, [blackoutState]);

  const tryPlayMedia = useCallback(async () => {
    const video = getCurrentVideoEl();
    if (!video || !appStarted) return false;

    const bufferVideo = getBufferVideoEl();
    if (bufferVideo) {
      playerCoreRef.current.enforceAudio(video, bufferVideo);
    }

    try {
      await video.play();
      setNeedsGestureState(false);
      return true;
    } catch (e: unknown) {
      setNeedsGestureState(true);
      console.warn('[AUDIO] play blocked/failed', { key: 'active_media', errName: e instanceof Error ? e.name : 'unknown' });
      return false;
    }
  }, [appStarted, getBufferVideoEl, getCurrentVideoEl, setNeedsGestureState]);

  const computeJumpIntervalMs = useCallback((curseValue: number) => {
    if (debugEnabled) {
      return randomMs(10000, 15000);
    }
    const c = clampCurse(curseValue) / 100;

    const minBase = 90000;
    const maxBase = 120000;
    const minFast = 30000;
    const maxFast = 60000;

    const min = minBase - (minBase - minFast) * c;
    const max = maxBase - (maxBase - maxFast) * c;

    return randomMs(min, max);
  }, [debugEnabled]);

  const preloadIntoBuffer = useCallback((nextKey: OldhouseLoopKey) => {
    const bufferEl = getBufferVideoEl();
    if (!bufferEl) return Promise.reject(new Error('Buffer video missing'));
    const nextVideoPath = getVideoUrlForKey(nextKey);
    const cachedVideo = getCachedAsset(nextVideoPath);
    const resolvedVideoSrc = cachedVideo instanceof HTMLVideoElement ? cachedVideo.src : nextVideoPath;
    return playerCoreRef.current.loadSource(bufferEl, resolvedVideoSrc, PRELOAD_READY_FALLBACK_TIMEOUT_MS);
  }, [getBufferVideoEl, getVideoUrlForKey]);

  const getJumpCandidates = useCallback(() => {
    const unavailable: Array<{ key: OldhouseLoopKey; reason: string }> = [];
    const mainUrl = getVideoUrlForKey(MAIN_LOOP);
    const candidates = JUMP_LOOPS.filter((key) => {
      const url = getVideoUrlForKey(key);
      if (!url) {
        unavailable.push({ key, reason: 'empty-url' });
        return false;
      }
      if (url === mainUrl) {
        unavailable.push({ key, reason: `url-collides-main(${url})` });
        return false;
      }
      return true;
    });
    return { candidates, unavailable };
  }, [getVideoUrlForKey]);

  const pickNextJumpKey = useCallback(() => {
    const { candidates, unavailable } = getJumpCandidates();
    updateVideoDebug({ jumpCandidates: candidates, unavailableJumps: unavailable });

    if (candidates.length === 0) {
      const reason = `no-jump-candidates:${unavailable.map((item) => `${item.key}:${item.reason}`).join(',') || 'empty'}`;
      updateVideoDebug({
        plannedJump: null,
        lastError: reason,
        lastFallback: { fromKey: null, toKey: MAIN_LOOP, reason }
      });
      throw new Error(reason);
    }

    let picked: OldhouseLoopKey = MAIN_LOOP;
    let tries = 0;
    while (picked === MAIN_LOOP && tries < 10) {
      picked = randomPick(candidates);
      tries += 1;
    }

    if (picked === MAIN_LOOP) {
      const reason = `picked-main-after-retry:${tries}`;
      updateVideoDebug({
        plannedJump: null,
        lastError: reason,
        lastFallback: { fromKey: MAIN_LOOP, toKey: MAIN_LOOP, reason }
      });
      throw new Error(reason);
    }

    const pickedUrl = getVideoUrlForKey(picked);
    updateVideoDebug({ lastError: null });
    console.log('[JUMP_PICK]', {
      candidates,
      pickedKey: picked,
      reason: 'random-jump',
      curse: curseRef.current,
      intervalMs: nextJumpAtRef.current ? Math.max(0, nextJumpAtRef.current - Date.now()) : null
    });
    return { pickedKey: picked, pickedUrl };
  }, [getJumpCandidates, getVideoUrlForKey, updateVideoDebug]);

  const switchTo = useCallback(async (nextKey: OldhouseLoopKey) => {
    console.log('[VIDEO]', 'switchTo requested', {
      nextKey,
      hasConfirmedPlayback: appStarted,
      isSwitching: isSwitchingRef.current,
      needsUserGestureToPlay: needsUserGestureToPlayRef.current,
      currentKey: currentLoopKeyRef.current
    });
    if (!appStarted) {
      updateVideoDebug({ lastError: `switchTo skipped(no-confirm) -> ${nextKey}` });
      console.warn('[VIDEO]', 'switchTo skipped: app not started', { nextKey });
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

      await playerCoreRef.current.switchTo(nextKey, nextUrl, CROSSFADE_MS);
      console.log('[VIDEO]', 'switchTo mapping', {
        targetKey: nextKey,
        targetUrl: nextUrl,
        beforeBufferSrc: bufferEl.currentSrc || bufferEl.src
      });

      stopAllNonPersistentSfx();
      const startedAt = Date.now();

      setNeedsGestureState(false);

      currentVideoRef.current = currentVideoRef.current === 'A' ? 'B' : 'A';
      markActiveVideo();
      currentLoopKeyRef.current = nextKey;
      setCurrentLoopKey(nextKey);
      emitSceneEvent({ type: 'VIDEO_ACTIVE', key: nextKey, startedAt });
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
        activeVideoEl: currentVideoRef.current
      });
      console.log('[VIDEO]', 'switchTo done', {
        switchId,
        videoKey: nextKey,
        activeVideoEl: currentVideoRef.current,
        curse: curseRef.current,
        afterBufferSrc: getBufferVideoEl()?.currentSrc || getBufferVideoEl()?.src,
        activeSrc: getCurrentVideoEl()?.currentSrc || getCurrentVideoEl()?.src
      });

      const { videoStates, audios } = collectAudioDebugSnapshot();
      if (debugEnabled) {
        console.log('[AUDIO-DEBUG] switch snapshot', {
          activeKey: nextKey,
          videoStates,
          playingAudios: audios
        });
      }

      if (nextKey === MAIN_LOOP) {
        const warmupKey = randomPick(JUMP_LOOPS);
        void preloadIntoBuffer(warmupKey);
      }
    } catch (error) {
      updateVideoDebug({ lastError: String(error instanceof Error ? error.message : error) });
      console.error('[VIDEO]', 'switchTo failed', error);
      if (nextKey !== MAIN_LOOP) {
        const reason = `switch-failed:${error instanceof Error ? error.message : String(error)}`;
        updateVideoDebug({ lastFallback: { fromKey: nextKey, toKey: MAIN_LOOP, reason } });
        isInJumpRef.current = false;
        updateVideoDebug({ isInJump: false });
        await requestVideoSwitch({ key: 'loop3', reason, sourceEventKey: 'SYSTEM_RETURN' });
      } else {
        setAssets((prev) => ({ ...prev, videoOk: false }));
        onSceneError?.({
          summary: '影片載入失敗，直播尚未開始。',
          missingAssets: [{ name: nextKey, url: nextUrl, reason: error instanceof Error ? error.message : String(error) }]
        });
      }
    } finally {
      isSwitchingRef.current = false;
      updateVideoDebug({ isSwitching: false });
      console.log('[VIDEO]', 'switchTo settled', {
        nextKey,
        isSwitching: isSwitchingRef.current,
        currentKey: currentLoopKeyRef.current
      });
    }
  }, [appStarted, collectAudioDebugSnapshot, debugEnabled, getBufferVideoEl, getCurrentVideoEl, getVideoUrlForKey, markActiveVideo, stopAllNonPersistentSfx, updateAudioDebug, updateVideoDebug]);

  const requestVideoSwitch = useCallback(async ({ key, reason, sourceEventKey }: { key: LoopRequestKey; reason: string; sourceEventKey?: string }) => {
    const requestedKey = resolveLoopKey(key);
    const now = Date.now();
    updateVideoDebug({
      lastPlayRequest: { requestedKey: String(key), at: now, reason, sourceEventKey },
      priorityLock: { ...priorityLockRef.current }
    });
    if (!requestedKey) {
      updateVideoDebug({
        lastDenied: { requestedKey: String(key), at: now, denyReason: 'unknown_video_key', sourceEventKey }
      });
      return false;
    }

    const lock = priorityLockRef.current;
    if (lock.lockedUntil > now && sourceEventKey !== lock.lockedByEventKey) {
      const denyReason = `priority_lock_active:${lock.lockedByEventKey ?? '-'}:${Math.max(0, lock.lockedUntil - now)}ms`;
      updateVideoDebug({
        lastDenied: { requestedKey: String(key), at: now, denyReason, sourceEventKey },
        priorityLock: { ...lock }
      });
      return false;
    }

    const fromKey = currentLoopKeyRef.current;
    await switchTo(requestedKey);
    const switched = currentLoopKeyRef.current === requestedKey;
    if (!switched) {
      updateVideoDebug({
        lastDenied: { requestedKey: String(key), at: Date.now(), denyReason: 'switch_not_applied', sourceEventKey }
      });
      return false;
    }

    if (sourceEventKey === 'TV_EVENT' && requestedKey === 'oldhouse_room_loop4') {
      const lockMs = randomMs(3000, 6000);
      priorityLockRef.current = { lockedUntil: Date.now() + lockMs, lockedByEventKey: 'TV_EVENT' };
    }

    updateVideoDebug({
      lastSwitch: { fromKey, toKey: requestedKey, at: Date.now(), reason, sourceEventKey },
      priorityLock: { ...priorityLockRef.current }
    });

    return true;
  }, [resolveLoopKey, switchTo, updateVideoDebug]);

  const computeWhyNotJumped = useCallback(() => {
    const planned = plannedJumpRef.current;
    if (!planned) return 'planned_jump_missing';
    if (planned.executedForDueAt === planned.dueAt) return 'executed_already';
    if (isSwitchingRef.current || isInJumpRef.current) {
      return `guard_locked(${isSwitchingRef.current ? 'isSwitching' : 'isInJump'})`;
    }
    if (Date.now() >= planned.dueAt && planned.lastTimerFiredAt == null) return 'timer_never_fired';
    if (planned.lastExecResult && planned.lastExecResult !== 'ok') return `last_exec_${planned.lastExecResult}`;
    return 'waiting_due';
  }, []);

  const syncPlannedJumpDebug = useCallback(() => {
    const planned = plannedJumpRef.current;
    if (!planned) {
      nextJumpAtRef.current = null;
      updateVideoDebug({
        plannedJump: null,
        nextJumpAt: null,
        nowMs: Date.now(),
        dueInMs: null,
        whyNotJumped: 'planned_jump_missing',
        timers: { jumpTimer: null }
      });
      return;
    }
    nextJumpAtRef.current = planned.dueAt;
    updateVideoDebug({
      plannedJump: planned,
      nextJumpAt: planned.dueAt,
      nowMs: Date.now(),
      dueInMs: planned.dueAt - Date.now(),
      whyNotJumped: computeWhyNotJumped(),
      timers: { jumpTimer: planned.timerId }
    });
  }, [computeWhyNotJumped, updateVideoDebug]);

  const scheduleNextJump = useCallback((options?: { force?: boolean; explicitDelay?: number }) => {
    const force = options?.force ?? false;
    const explicitDelay = options?.explicitDelay;

    if (!force && !autoNextEnabledRef.current) {
      return;
    }

    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = null;
    }
    if (jumpReturnTimerRef.current) {
      window.clearTimeout(jumpReturnTimerRef.current);
      jumpReturnTimerRef.current = null;
    }

    const interval = typeof explicitDelay === 'number' ? explicitDelay : computeJumpIntervalMs(curseRef.current);
    const dueAt = Date.now() + interval;
    try {
      const picked = pickNextJumpKey();
      plannedJumpRef.current = {
        dueAt,
        key: picked.pickedKey,
        url: picked.pickedUrl,
        scheduledAt: Date.now(),
        timerId: null,
        lastTimerFiredAt: null,
        lastWatchdogFiredAt: null,
        executedForDueAt: null,
        executedAt: null,
        lastExecAt: null,
        lastExecReason: null,
        lastExecResult: null
      };
    } catch (error) {
      plannedJumpRef.current = null;
      updateVideoDebug({
        plannedJump: null,
        lastError: String(error instanceof Error ? error.message : error),
        whyNotJumped: 'planned_jump_missing',
        dueInMs: null,
        nextJumpAt: null,
        timers: { jumpTimer: null }
      });
      return;
    }

    jumpTimerRef.current = window.setTimeout(() => {
      const planned = plannedJumpRef.current;
      if (planned) {
        planned.lastTimerFiredAt = Date.now();
        planned.timerId = null;
      }
      jumpTimerRef.current = null;
      syncPlannedJumpDebug();
      void execPlannedJump('timer');
    }, Math.max(0, dueAt - Date.now()));

    if (plannedJumpRef.current) {
      plannedJumpRef.current.timerId = jumpTimerRef.current;
    }

    console.log('[VIDEO]', 'scheduleNextJump set timer', {
      delay: interval,
      curse: curseRef.current,
      force,
      explicitDelay,
      timerId: jumpTimerRef.current,
      dueAt
    });
    syncPlannedJumpDebug();
  }, [computeJumpIntervalMs, pickNextJumpKey, syncPlannedJumpDebug, updateVideoDebug]);

  const execPlannedJump = useCallback(async (reason: 'timer' | 'watchdog' | 'force') => {
    const planned = plannedJumpRef.current;
    if (!planned) {
      updateVideoDebug({ lastError: 'planned-jump-missing', whyNotJumped: 'planned_jump_missing' });
      return;
    }

    if (reason === 'watchdog') {
      planned.lastWatchdogFiredAt = Date.now();
    }
    planned.lastExecReason = reason;
    planned.lastExecAt = Date.now();

    if (planned.executedForDueAt === planned.dueAt) {
      planned.lastExecResult = 'executed_already';
      syncPlannedJumpDebug();
      return;
    }

    if (isSwitchingRef.current || isInJumpRef.current || currentLoopKeyRef.current !== MAIN_LOOP) {
      planned.lastExecResult = 'skipped_guard';
      syncPlannedJumpDebug();
      window.setTimeout(() => {
        if (plannedJumpRef.current?.dueAt === planned.dueAt && plannedJumpRef.current.executedForDueAt !== planned.dueAt) {
          void execPlannedJump('watchdog');
        }
      }, 500);
      return;
    }

    planned.executedAt = Date.now();
    planned.executedForDueAt = planned.dueAt;
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = null;
    }
    planned.timerId = null;
    isInJumpRef.current = true;
    updateVideoDebug({ isInJump: true });

    const nextKey = planned.key;
    try {
      await requestVideoSwitch({ key: nextKey, reason: `planned_jump:${reason}`, sourceEventKey: 'SYSTEM_JUMP' });
      planned.lastExecResult = currentLoopKeyRef.current === nextKey ? 'ok' : 'switch_mismatch';
    } catch (error) {
      planned.lastExecResult = 'switch_error';
      updateVideoDebug({ lastError: String(error instanceof Error ? error.message : error) });
    } finally {
      planned.lastExecAt = Date.now();
      syncPlannedJumpDebug();
    }

    if (planned.lastExecResult !== 'ok') {
      isInJumpRef.current = false;
      updateVideoDebug({ isInJump: false });
      scheduleNextJump({ force: true });
      return;
    }

    currentLoopKeyRef.current = nextKey;
    if (jumpReturnTimerRef.current) {
      window.clearTimeout(jumpReturnTimerRef.current);
      jumpReturnTimerRef.current = null;
    }
    const activeVideo = getCurrentVideoEl();
    const hasKnownDuration = Boolean(activeVideo && Number.isFinite(activeVideo.duration) && activeVideo.duration > 0);
    const fallbackDelay = hasKnownDuration
      ? Math.max(JUMP_RETURN_SCHEDULE_FALLBACK_MS, Math.round((activeVideo?.duration ?? 0) * 1000) + 5000)
      : JUMP_RETURN_SCHEDULE_FALLBACK_MS;

    jumpReturnTimerRef.current = window.setTimeout(() => {
      if (!autoNextEnabledRef.current || !appStarted) return;
      if (isInJumpRef.current && currentLoopKeyRef.current === nextKey) {
        console.warn('[VIDEO]', 'jump fallback return to MAIN_LOOP', { fromKey: nextKey, mainLoop: MAIN_LOOP });
        isInJumpRef.current = false;
        updateVideoDebug({
          isInJump: false,
          lastError: 'jump-return-timeout-fallback',
          lastFallback: { fromKey: nextKey, toKey: MAIN_LOOP, reason: 'jump-return-timeout-fallback' }
        });
        jumpReturnTimerRef.current = null;
        void requestVideoSwitch({ key: 'loop3', reason: 'jump-return-timeout-fallback', sourceEventKey: 'SYSTEM_RETURN' }).then(() => {
          currentLoopKeyRef.current = MAIN_LOOP;
          scheduleNextJump({ force: true });
        });
      }
    }, fallbackDelay);
  }, [appStarted, getCurrentVideoEl, requestVideoSwitch, scheduleNextJump, syncPlannedJumpDebug, updateVideoDebug]);
  const runDebugForceAction = useCallback(async (
    action: 'FORCE_LOOP' | 'FORCE_LOOP2' | 'FORCE_MAIN' | 'FORCE_LOOP4_3S' | 'FORCE_PLANNED' | 'RESCHEDULE_JUMP',
    runner: () => Promise<unknown> | void
  ) => {
    const bufferBefore = getBufferVideoEl()?.currentSrc || getBufferVideoEl()?.src || null;
    const currentKey = currentLoopKeyRef.current;
    const plannedKey = plannedJumpRef.current?.key ?? null;
    await runner();
    const bufferAfter = getBufferVideoEl()?.currentSrc || getBufferVideoEl()?.src || null;
    console.log('[DEBUG_FORCE]', {
      action,
      currentKey,
      plannedKey,
      bufferBefore,
      bufferAfter
    });
  }, [getBufferVideoEl]);

  const forcePlannedJumpNow = useCallback(async () => {
    const planned = plannedJumpRef.current;
    if (!planned) {
      updateVideoDebug({ lastError: 'force-planned-missing' });
      return;
    }
    await execPlannedJump('force');
  }, [execPlannedJump, updateVideoDebug]);

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
    if (!autoNextEnabledRef.current || !appStarted) return;

    if (isInJumpRef.current) {
      isInJumpRef.current = false;
      if (jumpReturnTimerRef.current) {
        window.clearTimeout(jumpReturnTimerRef.current);
        jumpReturnTimerRef.current = null;
      }
      updateVideoDebug({ isInJump: false });
      console.log('[VIDEO]', 'ended while in jump; switching back to MAIN_LOOP', { mainLoop: MAIN_LOOP });
      void requestVideoSwitch({ key: 'loop3', reason: 'video-ended-in-jump', sourceEventKey: 'SYSTEM_RETURN' }).then(() => {
        currentLoopKeyRef.current = MAIN_LOOP;
        scheduleNextJump({ force: true });
      });
      return;
    }

    console.log('[VIDEO]', 'ended on main/non-jump; enforce MAIN_LOOP', { mainLoop: MAIN_LOOP });
    void requestVideoSwitch({ key: 'loop3', reason: 'video-ended-main-enforce', sourceEventKey: 'SYSTEM_RETURN' }).then(() => {
      currentLoopKeyRef.current = MAIN_LOOP;
    });
  }, [appStarted, getCurrentVideoEl, pickNextJumpKey, scheduleNextJump, switchTo, updateVideoDebug]);


  const startOldhouseCalmMode = useCallback(async () => {
    console.log('[VIDEO]', 'startOldhouseCalmMode', { mainLoop: MAIN_LOOP, jumpLoops: JUMP_LOOPS });
    setAutoNextEnabled(true);
    autoNextEnabledRef.current = true;
    isInJumpRef.current = false;
    currentLoopKeyRef.current = MAIN_LOOP;

    setVideoErrorDetail(null);

    if (!isAudioStartedRef.current) {
      isAudioStartedRef.current = true;
      try {
        await startFanLoop();
      } catch {
        setNeedsGestureState(true);
        isAudioStartedRef.current = false;
      }

    }

    await requestVideoSwitch({ key: 'loop3', reason: 'start_oldhouse_calm_mode', sourceEventKey: 'SYSTEM_BOOT' });
    const started = await tryPlayMedia();
    if (!started) {
      setNeedsGestureState(true);
      return;
    }
    scheduleNextJump({
      force: true,
      explicitDelay: randomMs(FIRST_JUMP_DELAY_MIN_MS, FIRST_JUMP_DELAY_MAX_MS)
    });
    announceRunning();
  }, [announceRunning, scheduleNextJump, setNeedsGestureState, startFanLoop, switchTo, tryPlayMedia]);

  const stopOldhouseCalmMode = useCallback(() => {
    setAutoNextEnabled(false);
    autoNextEnabledRef.current = false;
    if (jumpTimerRef.current) {
      window.clearTimeout(jumpTimerRef.current);
      jumpTimerRef.current = null;
      nextJumpAtRef.current = null;
      updateVideoDebug({ timers: { jumpTimer: null }, nextJumpAt: null });
    }
    if (jumpReturnTimerRef.current) {
      window.clearTimeout(jumpReturnTimerRef.current);
      jumpReturnTimerRef.current = null;
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
    if (!appStarted) return;
    void startOldhouseCalmMode().catch((error) => {
      console.error('[audio-required] 啟動失敗，已阻止進入直播開始狀態', error);
    });
  }, [appStarted, startOldhouseCalmMode]);

  useEffect(() => {
    if (!appStarted || !autoNextEnabledRef.current || isInJumpRef.current) return;
    scheduleNextJump();
  }, [appStarted, scheduleNextJump]);

  useEffect(() => {
    if (!appStarted) return;
    if (jumpWatchdogRef.current) {
      window.clearInterval(jumpWatchdogRef.current);
      jumpWatchdogRef.current = null;
    }
    jumpWatchdogRef.current = window.setInterval(() => {
      const planned = plannedJumpRef.current;
      if (!planned || !autoNextEnabledRef.current) return;
      if (Date.now() >= planned.dueAt && planned.executedForDueAt !== planned.dueAt) {
        void execPlannedJump('watchdog');
      }
    }, 1000);
    updateVideoDebug({ timers: { watchdogTimer: jumpWatchdogRef.current } });
    return () => {
      if (jumpWatchdogRef.current) {
        window.clearInterval(jumpWatchdogRef.current);
        jumpWatchdogRef.current = null;
      }
      updateVideoDebug({ timers: { watchdogTimer: null } });
    };
  }, [appStarted, execPlannedJump, updateVideoDebug]);

  useEffect(() => {
    const shouldMute = !appStarted;
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (videoA) videoA.muted = shouldMute;
    if (videoB) videoB.muted = shouldMute;
  }, [appStarted]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const planned = plannedJumpRef.current;
      if (planned && Date.now() >= planned.dueAt && planned.executedForDueAt !== planned.dueAt) {
        void execPlannedJump('watchdog');
      }
      void audioEngine.ensureFanAfterVisibility().then(() => {
        updateAudioDebug({ fanState: audioEngine.getFanDebugStatus() });
      }).catch((error: unknown) => {
        console.warn('[AUDIO] visibility fan resume failed', { errName: error instanceof Error ? error.name : 'unknown' });
        updateAudioDebug({ fanState: audioEngine.getFanDebugStatus() });
      });
    };

    const onUserInteractionResume = () => {
      void audioEngine.resumeFromGesture().then(() => {
        void audioEngine.ensureFanAfterVisibility();
        updateAudioDebug({ fanState: audioEngine.getFanDebugStatus() });
      }).catch(() => {
        // keep existing gesture lock flow
      });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointerdown', onUserInteractionResume, { passive: true });
    window.addEventListener('touchstart', onUserInteractionResume, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointerdown', onUserInteractionResume);
      window.removeEventListener('touchstart', onUserInteractionResume);
    };
  }, [execPlannedJump, updateAudioDebug]);

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
      jumpCandidates: [],
      plannedJump: null,
      nowMs: Date.now(),
      dueInMs: null,
      whyNotJumped: 'planned_jump_missing',
      lastFallback: null,
      unavailableJumps: [],
      sceneMapDigest: SCENE_MAP_DIGEST,
      lastPlayRequest: null,
      lastSwitch: null,
      lastDenied: null,
      priorityLock: { ...priorityLockRef.current },
      timers: { jumpTimer: null, watchdogTimer: null }
    };

    window.__AUDIO_DEBUG__ = {
      started: false,
      lastFanAt: 0,
      lastFootstepsAt: 0,
      lastGhostAt: 0,
      activeVideoKey: null,
      activeVideoEl: currentVideoRef.current,
      switchId: 0,
      phase: 'init',
      fanState: {
        mode: 'none',
        contextState: 'unsupported',
        playing: false,
        currentTime: 0,
        nextStartTime: null,
        xfadeSec: 2,
        hasScheduledNext: false,
        bufferDuration: null,
        lastRestartReason: null
      },
      videoStates: [],
      playingAudios: []
      ,
      trace: []
    };

    return () => {
      window.__AUDIO_DEBUG__ = undefined;
      window.__VIDEO_DEBUG__ = undefined;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopAllNonPersistentSfx();
      stopOldhouseCalmMode();
      audioEngine.teardown();
    };
  }, [stopAllNonPersistentSfx, stopOldhouseCalmMode]);

  useEffect(() => {
    return onSceneRequest((payload) => {
      if (payload.type === 'DEBUG_FORCE_JUMP_NOW') {
        void forcePlannedJumpNow();
        return;
      }
      if (payload.type === 'DEBUG_RESCHEDULE_JUMP') {
        scheduleNextJump({ force: true });
        return;
      }
      const run = () => {
        if (payload.type === 'REQUEST_SFX') {
          if (payload.sfxKey === 'fan_loop') return;
          playSfx(payload.sfxKey, {
            delayMs: payload.delayMs,
            startVolume: payload.startVolume,
            endVolume: payload.endVolume,
            rampSec: payload.rampSec
          });
          return;
        }
        if (payload.type === 'REQUEST_VIDEO_SWITCH') {
          void requestVideoSwitch({ key: payload.key, reason: payload.reason, sourceEventKey: payload.sourceEventKey });
          return;
        }
        void requestVideoSwitch({ key: payload.sceneKey, reason: payload.reason, sourceEventKey: 'SCENE_REQUEST' });
      };
      if (payload.delayMs && payload.delayMs > 0) {
        window.setTimeout(run, payload.delayMs);
      } else {
        run();
      }
    });
  }, [forcePlannedJumpNow, playSfx, requestVideoSwitch, scheduleNextJump]);

  useEffect(() => {
    return () => {
      if (jumpTimerRef.current) {
        window.clearTimeout(jumpTimerRef.current);
      }
      if (jumpReturnTimerRef.current) {
        window.clearTimeout(jumpReturnTimerRef.current);
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
      const { videoStates, audios } = collectAudioDebugSnapshot();
      updateVideoDebug({
        currentKey: currentLoopKeyRef.current,
        isSwitching: isSwitchingRef.current,
        isInJump: isInJumpRef.current,
        nextJumpAt: nextJumpAtRef.current,
        plannedJump: plannedJumpRef.current,
        nowMs: Date.now(),
        dueInMs: plannedJumpRef.current ? plannedJumpRef.current.dueAt - Date.now() : null,
        whyNotJumped: computeWhyNotJumped(),
        activeVideoId: currentEl?.id === 'videoA' ? 'videoA' : currentEl?.id === 'videoB' ? 'videoB' : null,
        activeVideoSrc: currentEl?.currentSrc ?? currentEl?.src ?? null,
        bufferVideoId: bufferEl?.id === 'videoA' ? 'videoA' : bufferEl?.id === 'videoB' ? 'videoB' : null,
        bufferVideoSrc: bufferEl?.currentSrc ?? bufferEl?.src ?? null,
        currentActive: currentEl?.classList.contains('is-active') ?? false,
        bufferActive: bufferEl?.classList.contains('is-active') ?? false,
        currentReadyState: currentEl?.readyState ?? null,
        currentPaused: currentEl?.paused ?? null,
        sceneMapDigest: SCENE_MAP_DIGEST
      });
      if (Date.now() % 2000 < 220) {
        console.log('[AUDIO-DEBUG] tick', {
          activeKey: currentLoopKeyRef.current,
          videoStates,
          playingAudios: audios
        });
      }
    }, 200);

    return () => {
      window.clearInterval(timer);
    };
  }, [collectAudioDebugSnapshot, computeWhyNotJumped, debugEnabled, getBufferVideoEl, getCurrentVideoEl, updateVideoDebug]);

  const videoDebug = window.__VIDEO_DEBUG__;
  const trimSrc = (src: string | null | undefined) => {
    if (!src) return '-';
    return src.length > 72 ? `...${src.slice(-72)}` : src;
  };
  const nextJumpDueInSec = videoDebug?.dueInMs != null ? Math.max(0, videoDebug.dueInMs / 1000).toFixed(1) : '-';
  const lastSwitchAgoMs = videoDebug?.lastSwitchAt ? Math.max(0, debugTick - videoDebug.lastSwitchAt) : null;
  const eventDebug = window.__CHAT_DEBUG__?.event;
  const chatDebug = window.__CHAT_DEBUG__?.chat;
  const uiSendDebug = window.__CHAT_DEBUG__?.ui?.send;
  const debugInference = (() => {
    const reasons: string[] = [];
    if ((eventDebug?.registry?.count ?? 0) === 0) reasons.push('EVENT_REGISTRY_EMPTY');
    const now = eventDebug?.scheduler?.now ?? 0;
    const nextDueAt = eventDebug?.scheduler?.nextDueAt ?? 0;
    const tickCount = eventDebug?.scheduler?.tickCount ?? 0;
    if (now > nextDueAt && tickCount === 0) reasons.push('SCHEDULER_NOT_TICKING');
    if (tickCount > 0 && (eventDebug?.candidates?.lastCandidateCount ?? 0) === 0) reasons.push('NO_CANDIDATES');
    if ((chatDebug?.activeUsers?.count ?? 0) < 3) reasons.push('INSUFFICIENT_ACTIVE_USERS');
    if (eventDebug?.blocking?.isLocked) reasons.push('LOCK_ACTIVE');
    if (uiSendDebug?.lastResult === 'blocked' && uiSendDebug?.blockedReason === 'chat_auto_paused') reasons.push('CHAT_AUTO_PAUSED_BLOCKING_SEND');
    return reasons;
  })();

  useEffect(() => {
    markActiveVideo();
    if (videoARef.current && videoBRef.current) {
      playerCoreRef.current.init(videoARef.current, videoBRef.current);
    }
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
          await distanceApproachPlayer.resumeFromGesture();
          const started = await tryPlayMedia();
          if (!started) {
            return;
          }
          if (!isAudioStartedRef.current) isAudioStartedRef.current = true;
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
  }, [announceRunning, startFanLoop, tryPlayMedia]);

  const anchorPos = ANCHOR_POSITIONS[anchor];
  const pulseStrength = Math.min(1.4, 0.7 + curse / 80);
  const pulseOpacity = Math.min(1, 0.35 + curse / 120);

  return (
    <section className={`scene-view ${isDesktopLayout ? 'scene-view-desktop' : 'scene-view-mobile'}`}>
      <div className={`video-layer-wrapper ${isDesktopLayout ? 'video-layer-wrapper-desktop' : 'video-layer-wrapper-mobile'}`}>
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
              src={OVERLAY_SMOKE_SRC}
              alt="smoke"
              onError={() => setAssets((prev) => ({ ...prev, smokeOk: false }))}
            />
          )}
          {assets.crackOk && (
            <img
              className="overlay crack"
              src={OVERLAY_CRACK_SRC}
              alt="crack"
              onError={() => setAssets((prev) => ({ ...prev, crackOk: false }))}
            />
          )}
          {assets.vignetteOk && (
            <img
              className="overlay vignette"
              src={OVERLAY_VIGNETTE_SRC}
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
          <div id="blackoutOverlay" className="overlay blackout-overlay" style={{ opacity: blackoutOpacity }} />
        </div>

        {assets.noiseOk && (
          <img
            className={`overlay noise distortion-overlay ${curseVisualClass(curse)}`}
            src={OVERLAY_NOISE_SRC}
            alt="noise"
            onError={() => setAssets((prev) => ({ ...prev, noiseOk: false }))}
          />
        )}

      </div>

      {!assets.videoOk && (
        <div className="asset-warning">
          影片載入失敗：<code>{videoErrorDetail ?? `active=${currentLoopKey}`}</code>
        </div>
      )}

      {debugEnabled && (
        <>
        <div className="video-debug-overlay" aria-live="polite">
          <div>inference: {debugInference.join(' | ') || 'NONE'}</div>
          <div>video.currentKey: {videoDebug?.currentKey ?? '-'}</div>
          <div>video.lastSwitch.toKey: {videoDebug?.lastSwitch?.toKey ?? '-'}</div>
          <div>video.lastDenied.denyReason: {videoDebug?.lastDenied?.denyReason ?? '-'}</div>
          <div>currentEl: {videoDebug?.activeVideoId ?? '-'} | src: {trimSrc(videoDebug?.activeVideoSrc)}</div>
          <div>bufferEl: {videoDebug?.bufferVideoId ?? '-'} | src: {trimSrc(videoDebug?.bufferVideoSrc)}</div>
          <div>currentActive/bufferActive: {String(videoDebug?.currentActive ?? false)} / {String(videoDebug?.bufferActive ?? false)}</div>
          <div>isSwitching / isInJump: {String(videoDebug?.isSwitching ?? false)} / {String(videoDebug?.isInJump ?? false)}</div>
          <div>nextJumpDueIn: {nextJumpDueInSec}s</div>
          <div>now/dueAt/diffMs: {videoDebug?.nowMs ?? '-'} / {videoDebug?.plannedJump?.dueAt ?? '-'} / {videoDebug?.dueInMs ?? '-'}</div>
          <div>
            lastSwitch: {(videoDebug?.lastSwitchFrom ?? '-')} -&gt; {(videoDebug?.lastSwitchTo ?? '-')} | {lastSwitchAgoMs == null ? '-' : `${lastSwitchAgoMs}ms ago`}
          </div>
          <div>currentEl readyState/paused: {videoDebug?.currentReadyState ?? '-'} / {String(videoDebug?.currentPaused ?? false)}</div>
          <div>jumpCandidates: {(videoDebug?.jumpCandidates ?? []).join(', ') || '-'}</div>
          <div>plannedJumpKey/plannedJumpUrl: {videoDebug?.plannedJump?.key ?? '-'} / {trimSrc(videoDebug?.plannedJump?.url)}</div>
          <div>planned scheduledAt/timerId: {videoDebug?.plannedJump?.scheduledAt ?? '-'} / {videoDebug?.plannedJump?.timerId ?? '-'}</div>
          <div>lastTimerFiredAt/lastWatchdogFiredAt: {videoDebug?.plannedJump?.lastTimerFiredAt ?? '-'} / {videoDebug?.plannedJump?.lastWatchdogFiredAt ?? '-'}</div>
          <div>lastExec reason/result/at: {videoDebug?.plannedJump?.lastExecReason ?? '-'} / {videoDebug?.plannedJump?.lastExecResult ?? '-'} / {videoDebug?.plannedJump?.lastExecAt ?? '-'}</div>
          <div>executedAt/executedForDueAt: {videoDebug?.plannedJump?.executedAt ?? '-'} / {videoDebug?.plannedJump?.executedForDueAt ?? '-'}</div>
          <div>why not jumped?: {videoDebug?.whyNotJumped ?? '-'}</div>
          <div>unavailableJumps: {(videoDebug?.unavailableJumps ?? []).map((item) => `${item.key}(${item.reason})`).join(', ') || '-'}</div>
          <div>
            lastFallback: {videoDebug?.lastFallback ? `${videoDebug.lastFallback.fromKey ?? '-'} -&gt; ${videoDebug.lastFallback.toKey ?? '-'} (${videoDebug.lastFallback.reason})` : '-'}
          </div>
          <div>
            sceneMapDigest: {(Object.entries(videoDebug?.sceneMapDigest ?? SCENE_MAP_DIGEST) as Array<[OldhouseLoopKey, string]>).map(([key, value]) => `${key}=${trimSrc(value)}`).join(' | ')}
          </div>
          <div>activeKey(audio): {window.__AUDIO_DEBUG__?.activeVideoKey ?? '-'}</div>
          <div>audioContext.state: {window.__AUDIO_DEBUG__?.fanState?.contextState ?? '-'}</div>
          <div>fan playing/currentTime: {String(window.__AUDIO_DEBUG__?.fanState?.playing ?? false)} / {(window.__AUDIO_DEBUG__?.fanState?.currentTime ?? 0).toFixed(2)}</div>
          <div>fan nextStartTime/xfade/currentTime/scheduled: {window.__AUDIO_DEBUG__?.fanState?.nextStartTime?.toFixed?.(2) ?? '-'} / {(window.__AUDIO_DEBUG__?.fanState?.xfadeSec ?? 0).toFixed(2)} / {(window.__AUDIO_DEBUG__?.fanState?.currentTime ?? 0).toFixed(2)} / {String(window.__AUDIO_DEBUG__?.fanState?.hasScheduledNext ?? false)}</div>
          <div>fan bufferDuration: {window.__AUDIO_DEBUG__?.fanState?.bufferDuration?.toFixed?.(2) ?? '-'}</div>
          <div>fan lastRestartReason/mode: {window.__AUDIO_DEBUG__?.fanState?.lastRestartReason ?? '-'} / {window.__AUDIO_DEBUG__?.fanState?.mode ?? '-'}</div>
          <div>videoStates: {(window.__AUDIO_DEBUG__?.videoStates ?? []).map((item) => `${item.id}[p:${String(item.paused)} m:${String(item.muted)} v:${item.volume}]`).join(' | ') || '-'}</div>
          <div>playingAudios: {(window.__AUDIO_DEBUG__?.playingAudios ?? []).map((item) => `${item.label}[m:${String(item.muted)} v:${item.volume} t:${item.currentTime}]`).join(' | ') || '-'} | fan[{String(window.__AUDIO_DEBUG__?.fanState?.playing ?? false)}]</div>
          <div>audio.lastPlayResult: {window.__AUDIO_DEBUG__?.lastPlayResult ? JSON.stringify(window.__AUDIO_DEBUG__?.lastPlayResult) : '-'}</div>
          <div>audio.lastApproach gain(start/end/current): {(window.__AUDIO_DEBUG__?.lastApproach?.startGain ?? '-')} / {(window.__AUDIO_DEBUG__?.lastApproach?.endGain ?? '-')} / {(window.__AUDIO_DEBUG__?.lastApproach?.currentGain ?? '-')}</div>
          <div>audio.trace(last5): {(window.__AUDIO_DEBUG__?.trace ?? []).slice(-5).map((t) => `${t.stage}:${t.key ?? '-'}:${t.detail ?? '-'}`).join(' | ') || '-'}</div>
          <div>event.lastEvent/reason: {window.__CHAT_DEBUG__?.lastEventKey ?? '-'} / {window.__CHAT_DEBUG__?.lastEventReason ?? '-'}</div>
          <div>event.line/variant/tone/persona: {window.__CHAT_DEBUG__?.lastLineKey ?? '-'} / {window.__CHAT_DEBUG__?.lastVariantId ?? '-'} / {window.__CHAT_DEBUG__?.lastTone ?? '-'} / {window.__CHAT_DEBUG__?.lastPersona ?? '-'}</div>
          <div>event.sfx/reason: {window.__CHAT_DEBUG__?.lastSfxKey ?? '-'} / {window.__CHAT_DEBUG__?.lastSfxReason ?? '-'}</div>
          <div>event.lastGhostSfxReason: {window.__CHAT_DEBUG__?.lastGhostSfxReason ?? '-'}</div>
          <div>event.lastContentId/repeatBlocked: {window.__CHAT_DEBUG__?.lastContentId ?? '-'} / {String(window.__CHAT_DEBUG__?.contentRepeatBlocked ?? false)}</div>
          <div>event.lastNameInjected: {window.__CHAT_DEBUG__?.lastNameInjected ?? '-'}</div>
          <div>event.violation: {window.__CHAT_DEBUG__?.violation ?? '-'}</div>
          <div>event.sfxCooldowns: {Object.entries(window.__CHAT_DEBUG__?.sfxCooldowns ?? {}).map(([k, v]) => `${k}:${v}`).join(', ') || '-'}</div>
          <div>event.lock: {window.__CHAT_DEBUG__?.lock ? `${String(window.__CHAT_DEBUG__.lock.isLocked)} target=${window.__CHAT_DEBUG__.lock.target ?? '-'} elapsed=${window.__CHAT_DEBUG__.lock.elapsed}ms speed=${window.__CHAT_DEBUG__.lock.chatSpeedMultiplier}` : '-'}</div>
          <div>event.queue/blocked: {window.__CHAT_DEBUG__?.event?.queue?.length ?? window.__CHAT_DEBUG__?.queueLength ?? 0} / {Object.entries(window.__CHAT_DEBUG__?.blockedReasons ?? {}).map(([k, v]) => `${k}:${v}`).join(', ') || '-'}</div>
          <div>qna.active/flow/step: {String(window.__CHAT_DEBUG__?.event?.qna?.isActive ?? false)} / {window.__CHAT_DEBUG__?.event?.qna?.flowId ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.stepId ?? '-'}</div>
          <div>qna.awaiting/attempts/lastAskedAt: {String(window.__CHAT_DEBUG__?.event?.qna?.awaitingReply ?? false)} / {window.__CHAT_DEBUG__?.event?.qna?.attempts ?? 0} / {window.__CHAT_DEBUG__?.event?.qna?.lastAskedAt ?? 0}</div>
          <div>qna.lockTarget/match: {window.__CHAT_DEBUG__?.event?.qna?.lockTarget ?? '-'} / {(window.__CHAT_DEBUG__?.event?.qna?.matched?.optionId ?? '-') + ':' + (window.__CHAT_DEBUG__?.event?.qna?.matched?.keyword ?? '-')}</div>
          <div>qna.pendingChain: {window.__CHAT_DEBUG__?.event?.qna?.pendingChain?.eventKey ?? '-'}</div>
          <div>qna.taggedUserHandle/lastQuestionMessageId: {window.__CHAT_DEBUG__?.event?.qna?.taggedUserHandle ?? window.__CHAT_DEBUG__?.event?.qna?.taggedUser ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.lastQuestionMessageId ?? '-'}</div>
          <div>qna.lastQuestionMessageHasTag/lastBlockedReason: {String(window.__CHAT_DEBUG__?.event?.qna?.lastQuestionMessageHasTag ?? false)} / {window.__CHAT_DEBUG__?.event?.qna?.lastBlockedReason ?? '-'}</div>
          <div>qna.questionHasTagToActiveUser/isTaggedQuestionActive: {String(window.__CHAT_DEBUG__?.event?.qna?.questionHasTagToActiveUser ?? false)} / {String(window.__CHAT_DEBUG__?.event?.qna?.isTaggedQuestionActive ?? false)}</div>
          <div>ui.replyPin.mounted/location/insideChatList: {String(window.__CHAT_DEBUG__?.ui?.replyPinMounted ?? false)} / {window.__CHAT_DEBUG__?.ui?.replyPinContainerLocation ?? '-'} / {String(window.__CHAT_DEBUG__?.ui?.replyPinInsideChatList ?? false)}</div>
          <div>ui.replyPreview.suppressed: {window.__CHAT_DEBUG__?.ui?.replyPreviewSuppressed ?? '-'}</div>
          <div>ui.replyPreview.location/legacyQuote: {window.__CHAT_DEBUG__?.ui?.replyPreviewLocation ?? '-'} / {String(window.__CHAT_DEBUG__?.ui?.legacyReplyQuoteEnabled ?? false)}</div>
          <div>chat.pacing.mode: {window.__CHAT_DEBUG__?.chat?.pacing?.mode ?? '-'}</div>
          <div>chat.activeUsers.count: {window.__CHAT_DEBUG__?.chat?.activeUsers?.count ?? 0}</div>
          <div>chat.activeUsers.nameSample: {(window.__CHAT_DEBUG__?.chat?.activeUsers?.nameSample ?? window.__CHAT_DEBUG__?.chat?.activeUsers?.namesSample ?? []).join(', ') || '-'}</div>
          <div>chat.activeUser.id/handle: {window.__CHAT_DEBUG__?.chat?.activeUser?.id ?? '-'} / {window.__CHAT_DEBUG__?.chat?.activeUser?.handle ?? window.__CHAT_DEBUG__?.chat?.activeUsers?.currentHandle ?? '-'}</div>
          <div>chat.activeUser.registered/canTag: {String(window.__CHAT_DEBUG__?.chat?.activeUser?.registered ?? false)} / {String(window.__CHAT_DEBUG__?.chat?.canTagActiveUser ?? false)}</div>
          <div>system.bootstrap.isReady/activatedBy: {String(window.__CHAT_DEBUG__?.chat?.system?.bootstrap?.isReady ?? false)} / {window.__CHAT_DEBUG__?.chat?.system?.bootstrap?.activatedBy ?? '-'}</div>
          <div>mention.test.lastMessageMentionsActiveUser: {String(window.__CHAT_DEBUG__?.chat?.mention?.lastMessageMentionsActiveUser ?? false)}</div>
          <div>chat.autoPaused/reason: {String(window.__CHAT_DEBUG__?.chat?.autoPaused ?? false)} / {window.__CHAT_DEBUG__?.chat?.autoPausedReason ?? '-'}</div>
          <div>chat.autoScrollMode/remain/after/startAt: {window.__CHAT_DEBUG__?.chat?.autoScrollMode ?? '-'} / {window.__CHAT_DEBUG__?.chat?.freezeCountdownRemaining ?? 0} / {window.__CHAT_DEBUG__?.chat?.freezeAfterNMessages ?? 0} / {window.__CHAT_DEBUG__?.chat?.freezeCountdownStartedAt ?? 0}</div>
          <div>chat.lastScrollFreezeReason/lastScrollModeChangeAt: {window.__CHAT_DEBUG__?.chat?.lastScrollFreezeReason ?? '-'} / {window.__CHAT_DEBUG__?.chat?.lastScrollModeChangeAt ?? 0}</div>
          <div>chat.lastMessageActorIdCounted/lastCountdownDecrementAt: {window.__CHAT_DEBUG__?.chat?.lastMessageActorIdCounted ?? '-'} / {window.__CHAT_DEBUG__?.chat?.lastCountdownDecrementAt ?? 0}</div>
          <div>chat.pacing.baseRate/currentRate/jitter/nextDue: {window.__CHAT_DEBUG__?.chat?.pacing?.baseRate ?? '-'} / {window.__CHAT_DEBUG__?.chat?.pacing?.currentRate ?? '-'} / {String(window.__CHAT_DEBUG__?.chat?.pacing?.jitterEnabled ?? true)} / {window.__CHAT_DEBUG__?.chat?.pacing?.nextMessageDueInSec ?? '-'}</div>
          <div>chat.pacing.nextModeInSec: {window.__CHAT_DEBUG__?.chat?.pacing?.nextModeInSec ?? '-'}</div>
          <div>chat.lint.lastRejectedText: {window.__CHAT_DEBUG__?.chat?.lint?.lastRejectedText ?? '-'}</div>
          <div>chat.lint.lastRejectedReason: {window.__CHAT_DEBUG__?.chat?.lint?.lastRejectedReason ?? '-'}</div>
          <div>chat.lint.rerollCount: {window.__CHAT_DEBUG__?.chat?.lint?.rerollCount ?? 0}</div>
          <div>chat.audienceInvariant.removedActiveUser/reason: {String(window.__CHAT_DEBUG__?.chat?.audienceInvariant?.removedActiveUser ?? false)} / {window.__CHAT_DEBUG__?.chat?.audienceInvariant?.reason ?? '-'}</div>
          <div>chat.blockedCounts.activeUserAutoSpeak: {window.__CHAT_DEBUG__?.chat?.blockedCounts?.activeUserAutoSpeak ?? 0}</div>
          <div>chat.lastBlockedSendAttempt.actor/source: {window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.actorHandle ?? '-'} / {window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.source ?? '-'}</div>
          <div>chat.lastBlockedSendAttempt.reason: {window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.blockedReason ?? '-'}</div>
          <div>event.registry.count: {window.__CHAT_DEBUG__?.event?.registry?.count ?? 0}</div>
          <div>event.registry.keys: {(window.__CHAT_DEBUG__?.event?.registry?.keys ?? []).join(', ') || '-'}</div>
          <div>event.registry.enabled/disabled: {window.__CHAT_DEBUG__?.event?.registry?.enabledCount ?? 0} / {window.__CHAT_DEBUG__?.event?.registry?.disabledCount ?? 0}</div>
          <div>event.registry.manifest: {(window.__CHAT_DEBUG__?.event?.registry?.manifest ?? []).map((entry) => `[${entry.key}] pre(${entry.preEffect?.sfxKey ?? '-'} / ${entry.preEffect?.videoKey ?? '-'}) post(${entry.postEffect?.sfxKey ?? '-'} / ${entry.postEffect?.videoKey ?? '-'}) cd=${entry.cooldownMs ?? 0} lock=${String(entry.usesLock ?? false)}`).join(' | ') || '-'}</div>
          <div>event.scheduler.now: {window.__CHAT_DEBUG__?.event?.scheduler?.now ?? '-'}</div>
          <div>event.scheduler.nextDueAt: {window.__CHAT_DEBUG__?.event?.scheduler?.nextDueAt ?? '-'}</div>
          <div>event.scheduler.lastFiredAt: {window.__CHAT_DEBUG__?.event?.scheduler?.lastFiredAt ?? '-'}</div>
          <div>event.scheduler.tickCount/lastTickAt: {window.__CHAT_DEBUG__?.event?.scheduler?.tickCount ?? 0} / {window.__CHAT_DEBUG__?.event?.scheduler?.lastTickAt ?? '-'}</div>
          <div>event.scheduler.blocked: {String(window.__CHAT_DEBUG__?.event?.scheduler?.blocked ?? false)}</div>
          <div>event.scheduler.blockedReason: {window.__CHAT_DEBUG__?.event?.scheduler?.blockedReason ?? '-'}</div>
          <div>event.scheduler.cooldowns: {Object.entries(window.__CHAT_DEBUG__?.event?.scheduler?.cooldowns ?? {}).map(([k, v]) => `${k}:${v}`).join(', ') || '-'}</div>
          <div>event.candidates.lastComputed/count/keys: {window.__CHAT_DEBUG__?.event?.candidates?.lastComputedAt ?? '-'} / {window.__CHAT_DEBUG__?.event?.candidates?.lastCandidateCount ?? 0} / {(window.__CHAT_DEBUG__?.event?.candidates?.lastCandidateKeys ?? []).join(', ') || '-'}</div>
          <div>event.candidates.lastGateRejectSummary: {Object.entries(window.__CHAT_DEBUG__?.event?.candidates?.lastGateRejectSummary ?? {}).map(([k, v]) => `${k}:${v}`).join(', ') || '-'}</div>
          <div>event.lastEvent.key/eventId/state: {window.__CHAT_DEBUG__?.event?.lastEvent?.key ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.eventId ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.state ?? '-'}</div>
          <div>event.lastEvent.starterTagSent/abortedReason: {String(window.__CHAT_DEBUG__?.event?.lastEvent?.starterTagSent ?? false)} / {window.__CHAT_DEBUG__?.event?.lastEvent?.abortedReason ?? '-'}</div>
          <div>event.lastEvent.questionMessageId/commitBlockedReason: {window.__CHAT_DEBUG__?.event?.lastEvent?.questionMessageId ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.commitBlockedReason ?? '-'}</div>
          <div>event.lastEventCommitBlockedReason: {window.__CHAT_DEBUG__?.event?.lastEventCommitBlockedReason ?? '-'}</div>
          <div>event.lastEvent.preEffectTriggered/preEffectAt: {String(window.__CHAT_DEBUG__?.event?.lastEvent?.preEffectTriggered ?? false)} / {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffectAt ?? '-'}</div>
          <div>event.lastEvent.preEffect.sfxKey/videoKey: {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffect?.sfxKey ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffect?.videoKey ?? '-'}</div>
          <div>event.lastEffects.sfxPlayed: {(window.__CHAT_DEBUG__?.event?.lastEffects?.sfxPlayed ?? []).map((item: { key?: string; startedAt?: number }) => `${item.key ?? '-'}@${item.startedAt ?? '-'}`).join(', ') || '-'}</div>
          <div>event.lastEvent.effects.plan: {JSON.stringify(window.__CHAT_DEBUG__?.event?.lastEvent?.effects?.plan ?? null)}</div>
          <div>event.lastEvent.effects.applied: {JSON.stringify(window.__CHAT_DEBUG__?.event?.lastEvent?.effects?.applied ?? null)}</div>
          <div>event.lastEffects.videoSwitchedTo: {(window.__CHAT_DEBUG__?.event?.lastEffects?.videoSwitchedTo?.key ?? '-')} / {(window.__CHAT_DEBUG__?.event?.lastEffects?.videoSwitchedTo?.src ?? '-')}</div>
          <div>event.lastEffects.blackoutStartedAt/mode: {window.__CHAT_DEBUG__?.event?.lastEffects?.blackoutStartedAt ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEffects?.mode ?? '-'}</div>
          <div>event.lastStartAttemptBlockedReason: {window.__CHAT_DEBUG__?.event?.lastStartAttemptBlockedReason ?? '-'}</div>
          <div>event.lastEvent.at/reason/variant: {window.__CHAT_DEBUG__?.event?.lastEvent?.at ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.reason ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.lineVariantId ?? '-'}</div>
          <div>event.blocking.isLocked/lockTarget/lockReason: {String(window.__CHAT_DEBUG__?.event?.blocking?.isLocked ?? false)} / {window.__CHAT_DEBUG__?.event?.blocking?.lockTarget ?? '-'} / {window.__CHAT_DEBUG__?.event?.blocking?.lockReason ?? '-'}</div>
          <div>event.blocking.lockElapsedSec: {window.__CHAT_DEBUG__?.event?.blocking?.lockElapsedSec ?? 0}</div>
          <div>event.blocking.schedulerBlocked/reason: {String(window.__CHAT_DEBUG__?.event?.blocking?.schedulerBlocked ?? false)} / {window.__CHAT_DEBUG__?.event?.blocking?.schedulerBlockedReason ?? '-'}</div>
          <div>event.cooldowns: {Object.entries(window.__CHAT_DEBUG__?.event?.cooldowns ?? {}).map(([k, v]) => `${k}:${v}`).join(', ') || '-'}</div>
          <div>ui.send.lastClickAt: {window.__CHAT_DEBUG__?.ui?.send?.lastClickAt ?? '-'}</div>
          <div>ui.send.lastSubmitAt: {window.__CHAT_DEBUG__?.ui?.send?.lastSubmitAt ?? '-'}</div>
          <div>ui.send.lastAttemptAt: {window.__CHAT_DEBUG__?.ui?.send?.lastAttemptAt ?? '-'}</div>
          <div>ui.send.lastResult: {window.__CHAT_DEBUG__?.ui?.send?.lastResult ?? '-'}</div>
          <div>ui.send.blockedReason: {window.__CHAT_DEBUG__?.ui?.send?.blockedReason || '-'}</div>
          <div>ui.send.errorMessage: {window.__CHAT_DEBUG__?.ui?.send?.errorMessage || '-'}</div>
          <div>ui.send.stateSnapshot: {JSON.stringify(window.__CHAT_DEBUG__?.ui?.send?.stateSnapshot ?? null)}</div>
        </div>

        <div className="video-debug-controls-panel">
          <div className="video-debug-controls">
            <button type="button" onClick={() => { void runDebugForceAction('FORCE_LOOP', async () => { await requestVideoSwitch({ key: 'loop1', reason: 'debug_force_loop', sourceEventKey: 'DEBUG' }); }); }}>▶ Force LOOP</button>
            <button type="button" onClick={() => { void runDebugForceAction('FORCE_LOOP2', async () => { await requestVideoSwitch({ key: 'loop2', reason: 'debug_force_loop2', sourceEventKey: 'DEBUG' }); }); }}>▶ Force LOOP2</button>
            <button type="button" onClick={() => { void runDebugForceAction('FORCE_MAIN', async () => { await requestVideoSwitch({ key: 'loop3', reason: 'debug_force_main', sourceEventKey: 'DEBUG' }); }); }}>▶ Force MAIN</button>
            <button type="button" onClick={() => { void runDebugForceAction('FORCE_LOOP4_3S', async () => {
              await requestVideoSwitch({ key: 'loop4', reason: 'debug_force_loop4_3s', sourceEventKey: 'TV_EVENT' });
              window.setTimeout(() => {
                void requestVideoSwitch({ key: 'loop3', reason: 'debug_force_loop4_3s_return', sourceEventKey: 'DEBUG' });
              }, 3000);
            }); }}>▶ Force Show loop4 (3s)</button>
            <button type="button" onClick={() => { void runDebugForceAction('FORCE_PLANNED', forcePlannedJumpNow); }}>⚡ Force Planned Jump Now</button>
            <button type="button" onClick={() => { void runDebugForceAction('RESCHEDULE_JUMP', () => scheduleNextJump({ force: true })); }}>🔁 Reschedule Jump</button>
          </div>
          <div className="video-debug-controls" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>SFX Tests</strong>
            <button type="button" onClick={() => { void playSfx('footsteps', { forceDebug: true, ignorePause: debugIgnorePause, ignoreCooldown: debugIgnoreCooldown }); }}>Play footsteps</button>
            <button type="button" onClick={() => { void playSfx('ghost_female', { forceDebug: true, ignorePause: debugIgnorePause, ignoreCooldown: debugIgnoreCooldown }); }}>Play ghost_female</button>
            <button type="button" onClick={() => { distanceApproachPlayer.stopAll(); updateAudioDebug({ trace: [{ at: Date.now(), stage: 'stop_all', detail: 'debug_stop_all' }] }); }}>Stop all</button>
            <label><input type="checkbox" checked={debugIgnorePause} onChange={(e) => setDebugIgnorePause(e.target.checked)} /> Ignore pause</label>
            <label><input type="checkbox" checked={debugIgnoreCooldown} onChange={(e) => setDebugIgnoreCooldown(e.target.checked)} /> Ignore cooldown</label>
            <label>
              Master
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={debugMasterVolume}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setDebugMasterVolume(value);
                  distanceApproachPlayer.setMasterVolume(value);
                  updateAudioDebug({ trace: [{ at: Date.now(), stage: 'master_volume', detail: String(value) }] });
                }}
              />
              {debugMasterVolume.toFixed(2)}
            </label>
          </div>
        </div>
        </>
      )}

    </section>
  );
}
