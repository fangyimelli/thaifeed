import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ASSET_MANIFEST } from '../config/assetManifest';
import { gameReducer, initialState } from '../core/state/reducer';
import { isAnswerCorrect } from '../core/systems/answerParser';
import { resolvePlayableConsonant } from '../core/systems/consonantSelector';
import { parsePlayerSpeech } from '../core/systems/playerSpeechParser';
import {
  createDonateChatMessage,
  createPlayerMessage
} from '../core/systems/chatSystem';
import { createVipPassMessage, handleVipPlayerMessage, isVipHintCommand } from '../core/systems/vipSystem';
import { getMemoryNode, markReview } from '../core/adaptive/memoryScheduler';
import type { ChatMessage, DonateMessage } from '../core/state/types';
import donatePools from '../content/pools/donatePools.json';
import usernames from '../content/pools/usernames.json';
import ChatPanel from '../ui/chat/ChatPanel';
import SceneView from '../ui/scene/SceneView';
import LiveHeader from '../ui/hud/LiveHeader';
import LoadingOverlay, { type LoadingState } from '../ui/hud/LoadingOverlay';
import { preloadAssets, verifyRequiredAssets, type MissingRequiredAsset } from '../utils/preload';
import { Renderer2D } from '../renderer/renderer-2d/Renderer2D';
import { pickOne } from '../utils/random';
import { MAIN_LOOP } from '../config/oldhousePlayback';
import { onSceneEvent } from '../core/systems/sceneEvents';
import { requestSceneAction } from '../core/systems/sceneEvents';
import { ChatEngine } from '../chat/ChatEngine';
import { getChatLintReason, truncateLintText } from '../chat/ChatLint';
import { SAFE_FALLBACK_POOL } from '../chat/ChatPools';
import { collectActiveUsers } from '../core/systems/mentionV2';
import { createGhostLore } from '../core/systems/ghostLore';
import { EVENT_REGISTRY, EVENT_REGISTRY_KEYS, getEventManifest } from '../core/events/eventRegistry';
import { pickDialog } from '../core/events/eventDialogs';
import { pickReactionLines } from '../core/events/eventReactions';
import type { EventLinePhase, EventRunRecord, EventSendResult, EventTopic, StoryEventKey } from '../core/events/eventTypes';
import { QNA_FLOW_BY_EVENT } from '../game/qna/qnaFlows';
import {
  applyOptionResult,
  askCurrentQuestion,
  createInitialQnaState,
  getOptionById,
  getRetryPrompt,
  getUnknownPrompt,
  handleTimeoutPressure,
  parsePlayerReplyToOption,
  setQnaQuestionActor,
  startQnaFlow,
  stopQnaFlow,
  updateLastAskedPreview
} from '../game/qna/qnaEngine';

type EventStartBlockedReason =
  | 'locked_active'
  | 'cooldown_blocked'
  | 'in_flight'
  | 'chat_auto_paused'
  | 'event_exclusive_active'
  | 'no_active_user'
  | 'active_users_lt_3'
  | 'registry_missing'
  | 'vip_target'
  | 'invalid_state';

export type SendSource = 'submit' | 'debug_simulate' | 'fallback_click';

type ChatSendSource =
  | 'player_input'
  | 'audience_idle'
  | 'audience_reaction'
  | 'event_dialogue'
  | 'qna_question'
  | 'system_ui'
  | 'debug_tester'
  | 'unknown';

type ChatAutoScrollMode = 'FOLLOW' | 'COUNTDOWN_FREEZE' | 'FROZEN';
const FREEZE_AFTER_MESSAGE_COUNT = 10;

export type SendResult = {
  ok: boolean;
  status: 'sent' | 'blocked' | 'error';
  reason?: string;
  errorMessage?: string;
};

type LegacyRenameBlocker = (nextHandle: string) => false;

declare global {
  interface Window {
    __THAIFEED_RENAME_ACTIVE_USER__?: LegacyRenameBlocker;
    __THAIFEED_CHANGE_NAME__?: LegacyRenameBlocker;
    __THAIFEED_SET_NAME__?: LegacyRenameBlocker;
  }
}

function formatViewerCount(value: number) {
  if (value < 1000) return `${value}`;
  if (value < 10_000) return `${(value / 1000).toFixed(1)}K`;
  return `${Math.floor(value / 1000)}K`;
}

function formatMissingAsset(asset: MissingRequiredAsset) {
  return `[${asset.type}] ${asset.name} | ${asset.relativePath} | ${asset.url} | ${asset.reason}`;
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickNonRepeatingActor(pool: string[], recentActors: string[]): string {
  if (pool.length === 0) return 'ink31';
  const lastActor = recentActors[recentActors.length - 1];
  const recentFive = recentActors.slice(-4);
  const scored = pool.filter((actor) => {
    if (actor === lastActor) return false;
    const countInRecent = recentFive.filter((item) => item === actor).length;
    return countInRecent < 2;
  });
  const source = scored.length > 0 ? scored : pool.filter((actor) => actor !== lastActor);
  const usable = source.length > 0 ? source : pool;
  return usable[Math.floor(Math.random() * usable.length)] ?? pool[0];
}

function pickQuestionActor(activeUsers: string[], fallbackActor: string): string {
  const actorPool = activeUsers.filter((name) => name && name !== 'system');
  if (actorPool.length === 0) return fallbackActor;
  return pickOne(actorPool);
}

const EVENT_EXCLUSIVE_TIMEOUT_MS = 45_000;

type ChatActorState = {
  activeUser: string;
  audienceUsers: string[];
  removedActiveUserFromAudience: boolean;
};

type ActiveUserProfile = {
  id: string;
  handle: string;
  displayName: string;
  roleLabel: 'You';
  hasSpoken: boolean;
};

function separateChatActorState(messages: ChatMessage[], activeUserHandle: string): ChatActorState {
  const normalizedActiveUser = normalizeHandle(activeUserHandle);
  const activeUsers = collectActiveUsers(messages);
  const removedActiveUserFromAudience = Boolean(normalizedActiveUser) && activeUsers.includes(normalizedActiveUser);
  const audienceUsers = activeUsers.filter((name) => name && name !== 'system' && name !== normalizedActiveUser);
  return {
    activeUser: normalizedActiveUser,
    audienceUsers,
    removedActiveUserFromAudience
  };
}

function pickAudienceActor(state: ChatActorState, recentActors: string[]): { actor: string; blockedReason: string | null } {
  if (state.audienceUsers.length === 0) return { actor: 'ink31', blockedReason: 'audience_pool_empty' };
  const picked = pickNonRepeatingActor(state.audienceUsers, recentActors);
  if (state.activeUser && picked === state.activeUser) {
    const repickedPool = state.audienceUsers.filter((name) => name !== state.activeUser);
    if (repickedPool.length === 0) return { actor: 'ink31', blockedReason: 'audience_includes_activeUser' };
    return { actor: pickNonRepeatingActor(repickedPool, recentActors), blockedReason: 'audience_includes_activeUser' };
  }
  return { actor: picked, blockedReason: null };
}

function isPassCommand(raw: string) {
  const normalized = raw.trim().toLowerCase();
  return normalized === 'pass' || raw.trim() === '跳過';
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasHandleMention(text: string, handle: string): boolean {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return false;
  return new RegExp(`@${escapeRegExp(normalizedHandle)}(?:\\s|$)`, 'u').test(text);
}

function nextLeaveDelayMs() {
  return randomInt(30_000, 45_000);
}

const DESKTOP_BREAKPOINT = 1024;

function nextJoinDelayMs() {
  return 8_000 + Math.floor(Math.random() * 7_001);
}

function pickSafeFallbackText() {
  for (let i = 0; i < SAFE_FALLBACK_POOL.length; i += 1) {
    const candidate = pickOne(SAFE_FALLBACK_POOL).trim();
    if (candidate && !getChatLintReason(candidate)) return candidate;
  }
  return '先等等 我有點發毛';
}

function lintOutgoingMessage(message: ChatMessage): { message: ChatMessage; rejectedText: string; rejectedReason: string; rerollCount: number } {
  const reason = getChatLintReason(message.text);
  if (!reason) {
    return { message, rejectedText: '-', rejectedReason: '-', rerollCount: 0 };
  }

  let rerollCount = 0;
  while (rerollCount < 6) {
    const fallback = pickSafeFallbackText();
    rerollCount += 1;
    if (!getChatLintReason(fallback)) {
      return {
        message: {
          ...message,
          text: fallback,
          translation: message.language === 'th' ? message.translation : fallback
        },
        rejectedText: truncateLintText(message.text),
        rejectedReason: reason,
        rerollCount
      };
    }
  }

  const safeFallback = '先等等 我有點發毛';
  return {
    message: {
      ...message,
      text: safeFallback,
      translation: message.language === 'th' ? message.translation : safeFallback
    },
    rejectedText: truncateLintText(message.text),
    rejectedReason: reason,
    rerollCount: 6
  };
}

type ChatPacingMode = 'normal' | 'slightlyBusy' | 'tense' | 'tag_slow';
type TopicWeightProfile = {
  randomComment: number;
  videoObservation: number;
  suspicion: number;
  buildUp: number;
  eventTopic: number;
};

const NORMAL_TOPIC_WEIGHT: TopicWeightProfile = {
  randomComment: 60,
  videoObservation: 25,
  suspicion: 10,
  buildUp: 5,
  eventTopic: 0
};

const EVENT_TOPIC_WEIGHT: TopicWeightProfile = {
  eventTopic: 70,
  randomComment: 20,
  suspicion: 10,
  videoObservation: 0,
  buildUp: 0
};

const DEBUG_SEED_USERS = ['ink31', 'mew88', 'koo_77', 'nana23'];
const EVENT_TESTER_KEYS: StoryEventKey[] = ['VOICE_CONFIRM', 'GHOST_PING', 'TV_EVENT', 'NAME_CALL', 'VIEWER_SPIKE', 'LIGHT_GLITCH', 'FEAR_CHALLENGE'];


export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [appStarted, setAppStarted] = useState(false);
  const activeUserInitialHandleRef = useRef('');
  const [startNameInput, setStartNameInput] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('BOOT_START');
  const [hasOptionalAssetWarning, setHasOptionalAssetWarning] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initStatusText, setInitStatusText] = useState('初始化中');
  const [requiredAssetErrors, setRequiredAssetErrors] = useState<MissingRequiredAsset[]>([]);
  const [chatAutoPaused, setChatAutoPaused] = useState(false);
  const [chatAutoScrollMode, setChatAutoScrollMode] = useState<ChatAutoScrollMode>('FOLLOW');
  const [chatFreezeAfterNMessages, setChatFreezeAfterNMessages] = useState(FREEZE_AFTER_MESSAGE_COUNT);
  const [chatFreezeCountdownRemaining, setChatFreezeCountdownRemaining] = useState(0);
  const [chatFreezeCountdownStartedAt, setChatFreezeCountdownStartedAt] = useState<number | null>(null);
  const [chatLastMessageActorIdCounted, setChatLastMessageActorIdCounted] = useState<string | null>(null);
  const [chatLastCountdownDecrementAt, setChatLastCountdownDecrementAt] = useState<number | null>(null);
  const [lastQuestionMessageId, setLastQuestionMessageId] = useState<string | null>(null);
  const [lastQuestionMessageHasTag, setLastQuestionMessageHasTag] = useState(false);
  const [replyPreviewSuppressedReason, setReplyPreviewSuppressedReason] = useState<string | null>(null);
  const [lastBlockedReason, setLastBlockedReason] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(() => randomInt(400, 900));
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(null);
  const [mobileInnerHeight, setMobileInnerHeight] = useState(() => window.innerHeight);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [chatInputHeight, setChatInputHeight] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLElement>(null);
  const chatAreaRef = useRef<HTMLElement>(null);
  const [layoutMetricsTick, setLayoutMetricsTick] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const burstCooldownUntil = useRef(0);
  const sendCooldownUntil = useRef(0);
  const speechCooldownUntil = useRef(0);
  const lastInputTimestamp = useRef(Date.now());
  const lastIdleCurseAt = useRef(0);
  const postedInitMessages = useRef(false);
  const postedOptionalAssetWarningMessage = useRef(false);
  const soundUnlocked = useRef(false);
  const nonVipMessagesSinceLastVip = useRef(2);
  const currentVideoKeyRef = useRef<string>(MAIN_LOOP);
  const pacingModeRef = useRef<ChatPacingMode>('normal');
  const pacingModeUntilRef = useRef(0);
  const pacingNextModeFlipAtRef = useRef(Date.now() + randomInt(20_000, 40_000));
  const tagSlowActiveRef = useRef(false);
  const lastPacingModeRef = useRef<Exclude<ChatPacingMode, 'tag_slow'>>('normal');
  const eventWeightActiveUntilRef = useRef(0);
  const eventWeightRecoverUntilRef = useRef(0);
  const lastChatMessageAtRef = useRef(Date.now());
  const chatEngineRef = useRef(new ChatEngine());
  const ghostLoreRef = useRef(createGhostLore());
  const lockStateRef = useRef<{ isLocked: boolean; target: string | null; startedAt: number; replyingToMessageId: string | null }>({
    isLocked: false,
    target: null,
    startedAt: 0,
    replyingToMessageId: null
  });
  const cooldownsRef = useRef<Record<string, number>>({ ghost_female: 0, footsteps: 0, low_rumble: 0, tv_event: 0, ghost_ping_actor: 0 });
  const eventCooldownsRef = useRef<Record<StoryEventKey, number>>({
    VOICE_CONFIRM: 0,
    GHOST_PING: 0,
    TV_EVENT: 0,
    NAME_CALL: 0,
    VIEWER_SPIKE: 0,
    LIGHT_GLITCH: 0,
    FEAR_CHALLENGE: 0
  });
  const pendingReplyEventRef = useRef<{ key: StoryEventKey; target: string; eventId: string; expiresAt: number } | null>(null);
  const reactionBurstTimerRef = useRef<number | null>(null);
  const eventRecentContentIdsRef = useRef<Record<StoryEventKey, string[]>>({
    VOICE_CONFIRM: [],
    GHOST_PING: [],
    TV_EVENT: [],
    NAME_CALL: [],
    VIEWER_SPIKE: [],
    LIGHT_GLITCH: [],
    FEAR_CHALLENGE: []
  });
  const globalRecentContentIdsRef = useRef<string[]>([]);
  const eventTickCountRef = useRef(0);
  const eventLastTickAtRef = useRef(0);
  const eventLastCandidateCountRef = useRef(0);
  const eventLastCandidateKeysRef = useRef<string[]>([]);
  const eventGateRejectSummaryRef = useRef<Record<string, number>>({});
  const eventLastComputedAtRef = useRef(0);
  const eventLastReasonRef = useRef('INIT');
  const eventLastVariantIdRef = useRef('-');
  const eventLastKeyRef = useRef('-');
  const eventLastAtRef = useRef(0);
  const eventNextDueAtRef = useRef(0);

  const qnaStateRef = useRef(createInitialQnaState());
  const eventQueueRef = useRef<{ key: StoryEventKey; source: 'qna' }[]>([]);
  const eventExclusiveStateRef = useRef<{ exclusive: boolean; currentEventId: string | null; currentLockOwner: string | null }>({
    exclusive: false,
    currentEventId: null,
    currentLockOwner: null
  });
  const foreignTagBlockedCountRef = useRef(0);
  const lastBlockedReasonRef = useRef('-');

  const eventLifecycleRef = useRef<EventRunRecord | null>(null);
  const preEffectStateRef = useRef<{ triggered: boolean; at: number; sfxKey?: 'ghost_female' | 'footsteps' | 'fan_loop'; videoKey?: 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3' | 'oldhouse_room_loop4' }>({ triggered: false, at: 0 });
  const reactionRecentIdsRef = useRef<Record<EventTopic, string[]>>({ ghost: [], footsteps: [], light: [] });
  const reactionActorHistoryRef = useRef<string[]>([]);
  const reactionTextHistoryRef = useRef<string[]>([]);
  const blockedActiveUserAutoSpeakCountRef = useRef(0);
  const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  const eventRunnerStateRef = useRef<{ inFlight: boolean; currentEventId: string | null; pendingTimers: number[] }>({
    inFlight: false,
    currentEventId: null,
    pendingTimers: []
  });
  const eventTestDebugRef = useRef<{ lastStartAttemptAt: number; lastStartAttemptKey: string; lastStartAttemptBlockedReason: EventStartBlockedReason | '-' }>({
    lastStartAttemptAt: 0,
    lastStartAttemptKey: '-',
    lastStartAttemptBlockedReason: '-'
  });

  const clearEventRunnerPendingTimers = useCallback(() => {
    eventRunnerStateRef.current.pendingTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    eventRunnerStateRef.current.pendingTimers = [];
  }, []);

  const registerEventRunnerTimer = useCallback((timerId: number) => {
    eventRunnerStateRef.current.pendingTimers = [...eventRunnerStateRef.current.pendingTimers, timerId];
  }, []);

  const clearEventRunnerState = useCallback(() => {
    clearEventRunnerPendingTimers();
    eventRunnerStateRef.current.inFlight = false;
    eventRunnerStateRef.current.currentEventId = null;
  }, [clearEventRunnerPendingTimers]);

  const setEventAttemptDebug = useCallback((eventKey: StoryEventKey, blockedReason: EventStartBlockedReason | null) => {
    eventTestDebugRef.current = {
      lastStartAttemptAt: Date.now(),
      lastStartAttemptKey: eventKey,
      lastStartAttemptBlockedReason: blockedReason ?? '-'
    };
  }, []);


  useEffect(() => () => {
    clearEventRunnerState();
  }, [clearEventRunnerState]);


  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const syncLayoutMode = () => {
      setIsDesktopLayout(mediaQuery.matches);
    };

    syncLayoutMode();
    mediaQuery.addEventListener('change', syncLayoutMode);
    window.addEventListener('resize', syncLayoutMode);

    return () => {
      mediaQuery.removeEventListener('change', syncLayoutMode);
      window.removeEventListener('resize', syncLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (isDesktopLayout) {
      setMobileViewportHeight(null);
      setIsKeyboardOpen(false);
      return;
    }

    const vv = window.visualViewport;
    const updateViewport = () => {
      const nextVh = vv?.height ?? window.innerHeight;
      setMobileViewportHeight(nextVh);
      setMobileInnerHeight(window.innerHeight);
      setIsKeyboardOpen(Boolean(vv && window.innerHeight - vv.height > 120));
      document.documentElement.style.setProperty('--vvh', `${nextVh}px`);
      setLayoutMetricsTick((value) => value + 1);
    };

    updateViewport();
    vv?.addEventListener('resize', updateViewport);
    vv?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      vv?.removeEventListener('resize', updateViewport);
      vv?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.documentElement.style.removeProperty('--vvh');
    };
  }, [isDesktopLayout]);

  const dispatchChatMessage = (
    message: ChatMessage,
    options?: { source?: ChatSendSource; sourceTag?: string }
  ): { ok: true } | { ok: false; blockedReason: string } => {
    const source = options?.source ?? 'unknown';
    const sourceTag = options?.sourceTag ?? source;
    const normalizedActiveUser = normalizeHandle(activeUserInitialHandleRef.current || '');
    const actorHandle = normalizeHandle(message.username || '');
    const isActiveUserActor = Boolean(normalizedActiveUser) && actorHandle === normalizedActiveUser;

    if (isActiveUserActor && source !== 'player_input') {
      blockedActiveUserAutoSpeakCountRef.current += 1;
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          lastBlockedSendAttempt: {
            actorId: actorHandle || '-',
            actorHandle: message.username || '-',
            source,
            sourceTag,
            textPreview: truncateLintText(message.text || ''),
            at: Date.now(),
            blockedReason: 'activeUser_auto_speak_blocked'
          },
          blockedCounts: {
            ...(window.__CHAT_DEBUG__?.chat?.blockedCounts ?? {}),
            activeUserAutoSpeak: blockedActiveUserAutoSpeakCountRef.current
          }
        }
      };
      return { ok: false, blockedReason: 'activeUser_auto_speak_blocked' };
    }

    if (source === 'unknown') {
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          sendSourceWarning: {
            at: Date.now(),
            actor: actorHandle || '-',
            textPreview: truncateLintText(message.text || '')
          }
        }
      };
    }

    const activeUserHandle = activeUserInitialHandleRef.current;
    const textHasActiveUserTag = hasHandleMention(message.text, activeUserHandle);
    lastMessageMentionsActiveUserRef.current = textHasActiveUserTag;
    if (eventExclusiveStateRef.current.exclusive && textHasActiveUserTag && message.username !== eventExclusiveStateRef.current.currentLockOwner) {
      foreignTagBlockedCountRef.current += 1;
      lastBlockedReasonRef.current = 'foreign_tag_during_exclusive';
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          foreignTagBlockedCount: foreignTagBlockedCountRef.current,
          lastBlockedReason: lastBlockedReasonRef.current
        }
      });
      return { ok: false, blockedReason: 'foreign_tag_during_exclusive' };
    }

    const linted = lintOutgoingMessage(message);
    if (linted.rejectedReason !== '-') {
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          lint: {
            lastRejectedText: linted.rejectedText,
            lastRejectedReason: linted.rejectedReason,
            rerollCount: linted.rerollCount
          }
        }
      };
    }
    const now = Date.now();
    const shouldCountDownForFreeze =
      chatAutoScrollMode === 'COUNTDOWN_FREEZE'
      && actorHandle !== normalizeHandle(activeUserInitialHandleRef.current || '')
      && source !== 'system_ui'
      && (linted.message as ChatMessage & { isPinnedLayer?: boolean }).isPinnedLayer !== true;
    if (shouldCountDownForFreeze) {
      const nextRemaining = Math.max(0, chatFreezeCountdownRemaining - 1);
      setChatFreezeCountdownRemaining(nextRemaining);
      setChatLastMessageActorIdCounted(actorHandle || '-');
      setChatLastCountdownDecrementAt(now);
      if (nextRemaining <= 0) {
        setChatAutoScrollMode('FROZEN');
      }
    }
    lastChatMessageAtRef.current = now;
    const actionType = source === 'player_input' ? 'PLAYER_MESSAGE' : 'AUDIENCE_MESSAGE';
    dispatch({ type: actionType, payload: linted.message });
    return { ok: true };
  };

  const syncChatEngineDebug = useCallback(() => {
    const engineDebug = chatEngineRef.current.getDebugState() as {
      lint?: { lastRejectedText?: string; lastRejectedReason?: string; rerollCount?: number };
      activeUsers?: string[];
      activeUsersCount?: number;
      pacing?: {
        mode?: 'normal' | 'slowed' | 'locked_slowed';
        baseRate?: number;
        currentRate?: number;
        jitterEnabled?: boolean;
        nextMessageDueInSec?: number;
      };
    };
    const actorState = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '');
    const invariantViolated = actorState.removedActiveUserFromAudience;
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      chat: {
        ...(window.__CHAT_DEBUG__?.chat ?? {}),
        lint: {
          lastRejectedText: engineDebug.lint?.lastRejectedText ?? '-',
          lastRejectedReason: engineDebug.lint?.lastRejectedReason ?? '-',
          rerollCount: engineDebug.lint?.rerollCount ?? 0
        },
        activeUsers: {
          count: engineDebug.activeUsersCount ?? engineDebug.activeUsers?.length ?? 0,
          namesSample: (engineDebug.activeUsers ?? []).slice(0, 6)
        },
        audience: {
          count: actorState.audienceUsers.length
        },
        audienceInvariant: {
          removedActiveUser: invariantViolated,
          reason: invariantViolated ? 'audience_includes_activeUser_removed' : '-'
        },
        blockedCounts: {
          ...(window.__CHAT_DEBUG__?.chat?.blockedCounts ?? {}),
          activeUserAutoSpeak: blockedActiveUserAutoSpeakCountRef.current
        },
        activeUser: {
          id: activeUserProfileRef.current?.id ?? '-',
          handle: activeUserProfileRef.current?.handle ?? '-',
          registered: Boolean(activeUserProfileRef.current && usersByHandleRef.current.has(activeUserProfileRef.current.handle)),
          hasSpoken: activeUserProfileRef.current?.hasSpoken ?? false
        },
        mention: {
          lastMessageMentionsActiveUser: lastMessageMentionsActiveUserRef.current
        },
        lastActorPicked: {
          id: window.__CHAT_DEBUG__?.chat?.lastActorPicked?.id ?? '-'
        },
        actorPickBlockedReason: window.__CHAT_DEBUG__?.chat?.actorPickBlockedReason ?? '-',
        pacing: {
          mode: engineDebug.pacing?.mode ?? 'normal',
          baseRate: engineDebug.pacing?.baseRate ?? 0,
          currentRate: engineDebug.pacing?.currentRate ?? 0,
          jitterEnabled: engineDebug.pacing?.jitterEnabled ?? true,
          nextMessageDueInSec: engineDebug.pacing?.nextMessageDueInSec ?? 0
        }
      }
    };
  }, [state.messages]);

  const emitChatEvent = (event: Parameters<ChatEngine['emit']>[0]) => {
    const chats = chatEngineRef.current.emit(event, Date.now());
    chats.forEach((message) => dispatchChatMessage(message, { source: 'audience_idle' }));
    syncChatEngineDebug();
  };

  const updateEventDebug = useCallback((patch: Partial<NonNullable<Window['__CHAT_DEBUG__']>>) => {
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      ...patch,
      ui: window.__CHAT_DEBUG__?.ui
    };
  }, []);

  const markEventTopicBoost = useCallback((activeMs: number) => {
    const now = Date.now();
    eventWeightActiveUntilRef.current = Math.max(eventWeightActiveUntilRef.current, now + activeMs);
    eventWeightRecoverUntilRef.current = Math.max(eventWeightRecoverUntilRef.current, eventWeightActiveUntilRef.current + 5_000);
  }, []);

  const getCurrentTopicWeights = useCallback((now: number): TopicWeightProfile => {
    if (now <= eventWeightActiveUntilRef.current) return { ...EVENT_TOPIC_WEIGHT };
    if (now < eventWeightRecoverUntilRef.current) {
      const span = Math.max(1, eventWeightRecoverUntilRef.current - eventWeightActiveUntilRef.current);
      const progress = Math.min(1, Math.max(0, (now - eventWeightActiveUntilRef.current) / span));
      return {
        randomComment: EVENT_TOPIC_WEIGHT.randomComment + (NORMAL_TOPIC_WEIGHT.randomComment - EVENT_TOPIC_WEIGHT.randomComment) * progress,
        videoObservation: EVENT_TOPIC_WEIGHT.videoObservation + (NORMAL_TOPIC_WEIGHT.videoObservation - EVENT_TOPIC_WEIGHT.videoObservation) * progress,
        suspicion: EVENT_TOPIC_WEIGHT.suspicion + (NORMAL_TOPIC_WEIGHT.suspicion - EVENT_TOPIC_WEIGHT.suspicion) * progress,
        buildUp: EVENT_TOPIC_WEIGHT.buildUp + (NORMAL_TOPIC_WEIGHT.buildUp - EVENT_TOPIC_WEIGHT.buildUp) * progress,
        eventTopic: EVENT_TOPIC_WEIGHT.eventTopic + (NORMAL_TOPIC_WEIGHT.eventTopic - EVENT_TOPIC_WEIGHT.eventTopic) * progress
      };
    }
    return { ...NORMAL_TOPIC_WEIGHT };
  }, []);

  const triggerReactionBurst = useCallback((topic: EventTopic) => {
    markEventTopicBoost(12_000);
    if (reactionBurstTimerRef.current) {
      window.clearTimeout(reactionBurstTimerRef.current);
      reactionBurstTimerRef.current = null;
    }
    const durationMs = randomInt(10_000, 12_000);
    const reactionCount = randomInt(2, 5);
    const lines = pickReactionLines(topic, reactionCount, reactionRecentIdsRef.current[topic]);
    reactionRecentIdsRef.current[topic] = [...reactionRecentIdsRef.current[topic], ...lines.map((line) => line.id)].slice(-8);
    const fireAt = Date.now() + randomInt(300, 1200);
    reactionBurstTimerRef.current = window.setTimeout(() => {
      reactionBurstTimerRef.current = null;
      lines.forEach((line, index) => {
        window.setTimeout(() => {
          const chatActors = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '');
          const actorPool = chatActors.audienceUsers.length >= 3
            ? chatActors.audienceUsers
            : Array.from(new Set([...chatActors.audienceUsers, ...reactionActorHistoryRef.current, ...DEBUG_SEED_USERS]));
          let pickedLine = line;
          let rerollCount = 0;
          let rejectedReason = '-';
          while (reactionTextHistoryRef.current.slice(-8).includes(pickedLine.text) && rerollCount < 5) {
            const rerolled = pickReactionLines(topic, 1, reactionRecentIdsRef.current[topic])[0];
            if (!rerolled) break;
            pickedLine = rerolled;
            rerollCount += 1;
            rejectedReason = 'duplicate';
          }
          reactionTextHistoryRef.current = [...reactionTextHistoryRef.current, pickedLine.text].slice(-12);
          const pickedActor = pickAudienceActor({ activeUser: chatActors.activeUser, audienceUsers: actorPool, removedActiveUserFromAudience: chatActors.removedActiveUserFromAudience }, reactionActorHistoryRef.current);
          const actor = pickedActor.actor;
          reactionActorHistoryRef.current = [...reactionActorHistoryRef.current, actor].slice(-10);
          dispatchChatMessage({
            id: crypto.randomUUID(),
            username: actor,
            type: 'chat',
            text: pickedLine.text,
            language: 'zh',
            translation: pickedLine.text
          }, { source: 'audience_reaction' });
          window.__CHAT_DEBUG__ = {
            ...(window.__CHAT_DEBUG__ ?? {}),
            chat: {
              ...(window.__CHAT_DEBUG__?.chat ?? {}),
              lastActorPicked: { id: actor },
              actorPickBlockedReason: pickedActor.blockedReason ?? '-',
              lint: {
                ...(window.__CHAT_DEBUG__?.chat?.lint ?? {}),
                rerollCount,
                lastRejectedReason: rejectedReason,
                lastRejectedText: rejectedReason === 'duplicate' ? pickedLine.text : '-'
              }
            }
          };
        }, Math.floor((durationMs / Math.max(1, reactionCount)) * index));
      });
    }, Math.max(0, fireAt - Date.now()));
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        scheduler: { ...(window.__CHAT_DEBUG__?.event?.scheduler ?? {}), lastFiredAt: fireAt, nextDueAt: fireAt + durationMs },
        lastEventLabel: `reaction:${topic}`,
        lastReactions: {
          count: reactionCount,
          lastReactionActors: reactionActorHistoryRef.current.slice(-10)
        }
      },
      violation: reactionActorHistoryRef.current.some((actor) => actor === 'system') ? 'reaction_actor_system=true' : window.__CHAT_DEBUG__?.violation
    });
  }, [dispatchChatMessage, markEventTopicBoost, state.messages, updateEventDebug]);

  const buildEventLine = useCallback((eventKey: StoryEventKey, phase: EventLinePhase, target: string): { line: string; lineId: string } => {
    markEventTopicBoost(phase === 'opener' ? 12_000 : 8_000);
    const historyWindow = phase === 'opener' ? 5 : 4;
    const recentIds = eventRecentContentIdsRef.current[eventKey].slice(-historyWindow);
    const picked = pickDialog(eventKey, phase, target, recentIds);
    eventLastVariantIdRef.current = picked.id;
    const loreLevel = state.curse >= 70 ? 3 : state.curse >= 40 ? 2 : 1;
    const lore = ghostLoreRef.current.inject({
      fragment: picked.text,
      level: loreLevel,
      activeUser: target
    });
    eventRecentContentIdsRef.current[eventKey] = [...eventRecentContentIdsRef.current[eventKey], picked.id].slice(-5);
    globalRecentContentIdsRef.current = [...globalRecentContentIdsRef.current, picked.id].slice(-10);
    updateEventDebug({
      lastContentId: picked.id,
      lastNameInjected: lore.lastNameInjected,
      contentRepeatBlocked: picked.repeatBlocked,
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEventLabel: `event:${eventKey}:${phase}`
      }
    });
    return { line: lore.fragment, lineId: picked.id };
  }, [markEventTopicBoost, state.curse, updateEventDebug]);

  const dispatchEventLine = useCallback((line: string, actorHandle: string, source: 'scheduler_tick' | 'user_input' | 'debug_tester' = 'scheduler_tick', sendSource?: ChatSendSource): EventSendResult => {
    const now = Date.now();
    const activeUserHandle = activeUserInitialHandleRef.current;
    const textHasActiveUserTag = hasHandleMention(line, activeUserHandle);
    if (eventExclusiveStateRef.current.exclusive && textHasActiveUserTag && actorHandle !== eventExclusiveStateRef.current.currentLockOwner) {
      foreignTagBlockedCountRef.current += 1;
      lastBlockedReasonRef.current = 'foreign_tag_during_exclusive';
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          foreignTagBlockedCount: foreignTagBlockedCountRef.current,
          lastBlockedReason: lastBlockedReasonRef.current
        }
      });
      return { ok: false, blockedReason: 'foreign_tag_during_exclusive' };
    }
    if (!line.trim()) return { ok: false, blockedReason: 'empty' };
    if (!appStarted) return { ok: false, blockedReason: 'app_not_started' };
    if (source === 'scheduler_tick' && chatAutoPaused) return { ok: false, blockedReason: 'chat_auto_paused' };
    if (sendCooldownUntil.current > now) return { ok: false, blockedReason: 'rate_limited' };
    if (lockStateRef.current.isLocked && lockStateRef.current.target && lockStateRef.current.target !== actorHandle) {
      return { ok: false, blockedReason: 'locked_target_only' };
    }

    const messageId = crypto.randomUUID();
    const resolvedSendSource: ChatSendSource = sendSource ?? (source === 'debug_tester' ? 'debug_tester' : 'event_dialogue');
    const sent = dispatchChatMessage({
      id: messageId,
      username: actorHandle,
      type: 'chat',
      text: line,
      language: 'zh',
      translation: line,
      tagTarget: actorHandle
    }, { source: resolvedSendSource, sourceTag: `event:${source}` });
    if (!sent.ok) return { ok: false, blockedReason: sent.blockedReason };
    return { ok: true, lineId: messageId };
  }, [appStarted, chatAutoPaused, dispatchChatMessage, updateEventDebug]);

  const startChatFreezeCountdown = useCallback((count = FREEZE_AFTER_MESSAGE_COUNT) => {
    const now = Date.now();
    setChatAutoScrollMode('COUNTDOWN_FREEZE');
    setChatFreezeAfterNMessages(count);
    setChatFreezeCountdownRemaining(count);
    setChatFreezeCountdownStartedAt(now);
    setChatLastMessageActorIdCounted(null);
    setChatLastCountdownDecrementAt(null);
  }, []);

  const resetChatAutoScrollFollow = useCallback(() => {
    setChatAutoScrollMode('FOLLOW');
    setChatFreezeCountdownRemaining(0);
    setChatFreezeCountdownStartedAt(null);
    setChatLastMessageActorIdCounted(null);
    setChatLastCountdownDecrementAt(null);
  }, []);

  const resetQnaUiState = useCallback(() => {
    setReplyPreviewSuppressedReason(null);
  }, []);

  const playSfx = useCallback((
    key: 'ghost_female' | 'footsteps' | 'low_rumble' | 'fan_loop',
    options: { reason: string; source: 'event' | 'system' | 'unknown'; delayMs?: number; startVolume?: number; endVolume?: number; rampSec?: number; eventId?: string; eventKey?: StoryEventKey; allowBeforeStarterTag?: boolean }
  ) => {
    const now = Date.now();
    const cooldownMin = key === 'ghost_female' ? 180_000 : key === 'footsteps' || key === 'low_rumble' ? 120_000 : 0;
    if (key !== 'fan_loop') {
      const cooldownUntil = cooldownsRef.current[key] ?? 0;
      if (cooldownUntil > now) return false;
      cooldownsRef.current[key] = now + cooldownMin;
    }
    if (!options.allowBeforeStarterTag && (key === 'ghost_female' || key === 'footsteps') && eventLifecycleRef.current?.starterTagSent !== true) {
      return false;
    }
    requestSceneAction({
      type: 'REQUEST_SFX',
      sfxKey: key === 'low_rumble' ? 'footsteps' : key,
      reason: options.reason,
      source: options.source,
      delayMs: options.delayMs,
      startVolume: options.startVolume,
      endVolume: options.endVolume,
      rampSec: options.rampSec
    });
    return true;
  }, []);

  const startEvent = useCallback((eventKey: StoryEventKey, ctx: { source: 'user_input' | 'scheduler_tick' | 'debug_tester'; ignoreCooldowns?: boolean }) => {
    const now = Date.now();
    const chatActors = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '');
    const activeUsers = chatActors.audienceUsers;
    const sourceReason = ctx.source === 'scheduler_tick' ? 'SCHEDULER_TICK' : ctx.source === 'debug_tester' ? 'DEBUG_TESTER' : 'TIMER_TICK';
    const shouldIgnoreCooldown = Boolean(debugEnabled && ctx.source === 'debug_tester' && ctx.ignoreCooldowns);
    const eventDef = EVENT_REGISTRY[eventKey];
    const vipUsers = new Set(state.messages.filter((message) => Boolean(message.isVip)).map((message) => message.username));
    const eligibleActiveUsers = activeUsers.filter((name) => name && !vipUsers.has(name));
    const activeUserForTag = chatActors.activeUser;
    let questionActor = pickQuestionActor(eligibleActiveUsers, 'mod_live');
    if (questionActor === activeUserForTag) {
      const actorPool = eligibleActiveUsers.filter((name) => name !== activeUserForTag);
      questionActor = pickOne(actorPool.length > 0 ? actorPool : ['mod_live']);
    }

    let blockedReason: EventStartBlockedReason | null = null;
    const lockElapsedMs = lockStateRef.current.isLocked && lockStateRef.current.startedAt > 0 ? now - lockStateRef.current.startedAt : 0;
    const exclusiveTimeoutReached = lockElapsedMs >= EVENT_EXCLUSIVE_TIMEOUT_MS;
    if (eventExclusiveStateRef.current.exclusive && exclusiveTimeoutReached) {
      lastBlockedReasonRef.current = 'event_abandoned_timeout';
      if (qnaStateRef.current.isActive) {
        qnaStateRef.current.history = [...qnaStateRef.current.history, `abandoned:timeout:${now}`].slice(-40);
        stopQnaFlow(qnaStateRef.current, 'timeout_abandon');
      }
      eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
      pendingReplyEventRef.current = null;
    }
    if (!eventDef) blockedReason = 'registry_missing';
    else if (!appStarted) blockedReason = 'invalid_state';
    else if (ctx.source === 'scheduler_tick' && chatAutoPaused) blockedReason = 'chat_auto_paused';
    else if (eventRunnerStateRef.current.inFlight) blockedReason = 'in_flight';
    else if (eventExclusiveStateRef.current.exclusive && !exclusiveTimeoutReached) blockedReason = 'event_exclusive_active';
    else if (activeUsers.length < 3) blockedReason = 'active_users_lt_3';
    else if (!activeUserForTag) blockedReason = eligibleActiveUsers.length === 0 ? 'vip_target' : 'no_active_user';
    else if (lockStateRef.current.isLocked && lockStateRef.current.target && lockStateRef.current.target !== activeUserForTag) blockedReason = 'locked_active';
    else if (!shouldIgnoreCooldown && (eventCooldownsRef.current[eventKey] ?? 0) > now) blockedReason = 'cooldown_blocked';

    setEventAttemptDebug(eventKey, blockedReason);
    if (blockedReason) {
      lastBlockedReasonRef.current = blockedReason;
      eventLastReasonRef.current = sourceReason;
      eventLastKeyRef.current = eventKey;
      eventLastAtRef.current = now;
      preEffectStateRef.current = { triggered: false, at: 0 };
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          inFlight: false,
          lastStartAttemptBlockedReason: blockedReason,
          test: {
            ...(window.__CHAT_DEBUG__?.event?.test ?? {}),
            ...eventTestDebugRef.current
          },
          lastEvent: {
            ...(window.__CHAT_DEBUG__?.event?.lastEvent ?? {}),
            preEffectTriggered: false,
            preEffectAt: 0,
            preEffect: {},
            starterTagSent: false,
            abortedReason: blockedReason
          }
        }
      });
      return null;
    }

    const eventId = `${eventKey}_${Date.now()}`;
    const opener = pickDialog(eventKey, 'opener', activeUserForTag, eventRecentContentIdsRef.current[eventKey]);
    if (!opener.text.startsWith(`@${activeUserForTag}`)) {
      const record: EventRunRecord = {
        eventId,
        key: eventKey,
        state: 'aborted',
        at: Date.now(),
        starterTagSent: false,
        abortedReason: 'starter_line_not_tagged',
        lineIds: [opener.id],
        openerLineId: opener.id,
        preEffectTriggered: false
      };
      eventLifecycleRef.current = record;
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          inFlight: false,
          lastStartAttemptBlockedReason: '-',
          lastEvent: {
            key: eventKey,
            eventId: record.eventId,
            at: record.at,
            reason: sourceReason,
            state: record.state,
            starterTagSent: false,
            abortedReason: record.abortedReason,
            openerLineId: record.openerLineId,
            lineIds: record.lineIds,
            preEffectTriggered: false,
            preEffectAt: 0,
            preEffect: {}
          }
        }
      });
      return null;
    }

    eventRunnerStateRef.current.inFlight = true;
    eventRunnerStateRef.current.currentEventId = eventId;

    const preEffect = { sfxKey: undefined as 'ghost_female' | 'footsteps' | 'fan_loop' | undefined, videoKey: undefined as 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3' | 'oldhouse_room_loop4' | undefined };
    if (eventKey === 'TV_EVENT') {
      preEffect.videoKey = 'oldhouse_room_loop4';
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop4', reason: `event:pre_effect:${eventId}`, sourceEventKey: 'TV_EVENT' });
    } else if (eventKey === 'LIGHT_GLITCH') {
      preEffect.videoKey = 'oldhouse_room_loop2';
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop2', reason: `event:pre_effect:${eventId}`, sourceEventKey: 'LIGHT_GLITCH' });
    } else if (eventKey === 'VIEWER_SPIKE' || eventKey === 'FEAR_CHALLENGE') {
      preEffect.sfxKey = 'footsteps';
      playSfx('footsteps', { reason: `event:pre_effect:${eventId}`, source: 'event', eventId, eventKey, allowBeforeStarterTag: true });
    } else {
      preEffect.sfxKey = 'ghost_female';
      playSfx('ghost_female', { reason: `event:pre_effect:${eventId}`, source: 'event', eventId, eventKey, delayMs: 150, allowBeforeStarterTag: true });
    }
    const preEffectAt = Date.now();
    preEffectStateRef.current = { triggered: true, at: preEffectAt, sfxKey: preEffect.sfxKey, videoKey: preEffect.videoKey };

    const sendResult = dispatchEventLine(opener.text, questionActor, ctx.source);
    if (!sendResult.ok) {
      const shortCooldownMs = 15_000;
      eventCooldownsRef.current[eventKey] = Date.now() + shortCooldownMs;
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop3', reason: `event:recover:${eventId}`, sourceEventKey: eventKey });
      eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
      pendingReplyEventRef.current = null;
      const record: EventRunRecord = {
        eventId,
        key: eventKey,
        state: 'aborted',
        at: Date.now(),
        starterTagSent: false,
        abortedReason: 'tag_send_failed_after_pre_effect',
        lineIds: [opener.id],
        openerLineId: opener.id,
        preEffectTriggered: true,
        preEffectAt,
        preEffect: { ...preEffect }
      };
      eventLifecycleRef.current = record;
      clearEventRunnerState();
      eventLastReasonRef.current = sourceReason;
      eventLastKeyRef.current = eventKey;
      eventLastAtRef.current = Date.now();
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          inFlight: false,
          lastStartAttemptBlockedReason: '-',
          test: {
            ...(window.__CHAT_DEBUG__?.event?.test ?? {}),
            ...eventTestDebugRef.current
          },
          lastEvent: {
            key: eventKey,
            eventId: record.eventId,
            at: record.at,
            reason: sourceReason,
            state: record.state,
            starterTagSent: false,
            abortedReason: record.abortedReason,
            openerLineId: record.openerLineId,
            lineIds: record.lineIds,
            preEffectTriggered: true,
            preEffectAt,
            preEffect: { ...preEffect }
          }
        },
        violation: 'event_aborted:tag_send_failed_after_pre_effect'
      });
      return null;
    }

    eventRecentContentIdsRef.current[eventKey] = [...eventRecentContentIdsRef.current[eventKey], opener.id].slice(-5);
    lockStateRef.current = { isLocked: true, target: questionActor, startedAt: Date.now(), replyingToMessageId: null };
    eventExclusiveStateRef.current = {
      exclusive: true,
      currentEventId: eventId,
      currentLockOwner: questionActor
    };
    const record: EventRunRecord = {
      eventId,
      key: eventKey,
      state: 'active',
      at: Date.now(),
      starterTagSent: true,
      openerLineId: opener.id,
      lineIds: [opener.id],
      preEffectTriggered: true,
      preEffectAt,
      preEffect: { ...preEffect }
    };
    eventLifecycleRef.current = record;
    clearEventRunnerState();

    eventLastReasonRef.current = sourceReason;
    eventLastKeyRef.current = eventKey;
    eventLastAtRef.current = Date.now();
    const qnaFlowId = eventDef?.qnaFlowId ?? QNA_FLOW_BY_EVENT[eventKey];
    if (qnaFlowId && activeUserForTag) {
      const startedQna = startQnaFlow(qnaStateRef.current, {
        eventKey,
        flowId: qnaFlowId,
        taggedUser: activeUserForTag,
        questionActor
      });
      if (startedQna) {
        lockStateRef.current = { isLocked: true, target: questionActor, startedAt: Date.now(), replyingToMessageId: null };
        eventExclusiveStateRef.current.currentLockOwner = questionActor;
      }
    }

    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        inFlight: false,
        lastStartAttemptBlockedReason: '-',
        test: {
          ...(window.__CHAT_DEBUG__?.event?.test ?? {}),
          ...eventTestDebugRef.current
        },
        lastEvent: {
          key: eventKey,
          eventId: record.eventId,
          at: record.at,
          reason: sourceReason,
          state: record.state,
          starterTagSent: record.starterTagSent,
          abortedReason: record.abortedReason,
          openerLineId: record.openerLineId,
          followUpLineId: record.followUpLineId,
          lineIds: record.lineIds,
          topic: record.topic,
          preEffectTriggered: true,
          preEffectAt,
          preEffect: { ...preEffect }
        },
        queue: {
          length: eventQueueRef.current.length
        },
        qna: {
          ...qnaStateRef.current
        }
      }
    } as Partial<NonNullable<Window['__CHAT_DEBUG__']>>);

    return { eventId: record.eventId, target: questionActor };
  }, [appStarted, chatAutoPaused, clearEventRunnerState, debugEnabled, dispatchEventLine, playSfx, setEventAttemptDebug, state.messages, updateEventDebug]);

  const postFollowUpLine = useCallback((target: string, eventKey: StoryEventKey, phase: Exclude<EventLinePhase, 'opener'> = 'followUp') => {
    const built = buildEventLine(eventKey, phase, target);
    const sent = dispatchEventLine(built.line, target, 'scheduler_tick');
    if (!sent.ok) return false;
    if (!eventLifecycleRef.current) return true;
    eventLifecycleRef.current.followUpLineId = built.lineId;
    eventLifecycleRef.current.lineIds = [...eventLifecycleRef.current.lineIds, built.lineId];
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEvent: {
          ...(window.__CHAT_DEBUG__?.event?.lastEvent ?? {}),
          followUpLineId: built.lineId,
          lineIds: eventLifecycleRef.current.lineIds
        }
      }
    });
    return true;
  }, [buildEventLine, dispatchEventLine, updateEventDebug]);

  const sendQnaQuestion = useCallback(() => {
    const asked = askCurrentQuestion(qnaStateRef.current);
    if (!asked) return false;
    const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || '');
    if (!taggedUser) {
      qnaStateRef.current.history = [...qnaStateRef.current.history, `blocked:no_tagged_user:${Date.now()}`].slice(-40);
      setLastBlockedReason('no_tagged_user');
      return false;
    }
    if (!usersByHandleRef.current.has(taggedUser)) {
      qnaStateRef.current.history = [...qnaStateRef.current.history, `blocked:active_user_not_registered:${Date.now()}`].slice(-40);
      setLastBlockedReason('active_user_not_registered');
      return false;
    }
    qnaStateRef.current.taggedUser = taggedUser;
    const eventActiveUsers = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '').audienceUsers;
    let questionActor = qnaStateRef.current.lockTarget || eventExclusiveStateRef.current.currentLockOwner;
    if (!questionActor || questionActor === taggedUser) {
      qnaStateRef.current.history = [...qnaStateRef.current.history, `blocked:lock_target_invalid:${Date.now()}`].slice(-40);
      const actorPool = eventActiveUsers.filter((name) => name !== taggedUser);
      questionActor = pickOne(actorPool.length > 0 ? actorPool : ['mod_live']);
      setQnaQuestionActor(qnaStateRef.current, questionActor);
    }
    const optionLabels = asked.options.map((option) => option.label).join(' / ');
    const line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`;
    const requiredTag = `@${taggedUser}`;
    if (!line.includes(requiredTag)) {
      qnaStateRef.current.history = [...qnaStateRef.current.history, `blocked:qna_question_missing_tag:${Date.now()}`].slice(-40);
      setLastBlockedReason('qna_question_missing_tag');
      setReplyPreviewSuppressedReason('missing_tag_in_message');
      resetQnaUiState();
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      return false;
    }
    const sent = dispatchEventLine(line, questionActor, 'scheduler_tick', 'qna_question');
    if (!sent.ok || !sent.lineId) {
      setLastBlockedReason(sent.ok ? 'qna_question_send_failed' : sent.blockedReason ?? 'qna_question_send_failed');
      resetQnaUiState();
      return false;
    }

    const now = Date.now();
    lockStateRef.current = { isLocked: true, target: questionActor, startedAt: now, replyingToMessageId: sent.lineId };
    eventExclusiveStateRef.current.currentLockOwner = questionActor;
    setLastQuestionMessageId(sent.lineId);
    setLastQuestionMessageHasTag(true);
    setReplyPreviewSuppressedReason(null);
    setLastBlockedReason(null);
    if (hasHandleMention(line, taggedUser)) {
      startChatFreezeCountdown(FREEZE_AFTER_MESSAGE_COUNT);
    }


    updateLastAskedPreview(qnaStateRef.current, line);
    qnaStateRef.current.history = [...qnaStateRef.current.history, `ask:${qnaStateRef.current.stepId}:${Date.now()}`].slice(-40);
    return true;
  }, [dispatchEventLine, resetQnaUiState, startChatFreezeCountdown, state.messages]);

  const tryTriggerStoryEvent = useCallback((raw: string, source: 'user_input' | 'scheduler_tick' = 'user_input') => {
    const now = Date.now();
    const audienceUsers = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '').audienceUsers;
    const target = audienceUsers.length > 0 ? pickOne(audienceUsers) : null;
    const pending = pendingReplyEventRef.current;
    const isLocked = lockStateRef.current.isLocked && Boolean(lockStateRef.current.target);

    if (!appStarted) return;

    if (source === 'user_input' && qnaStateRef.current.isActive && qnaStateRef.current.awaitingReply) {
      const lockTarget = qnaStateRef.current.lockTarget;
      if (lockTarget && lockStateRef.current.target !== lockTarget) {
        lockStateRef.current = { isLocked: true, target: lockTarget, startedAt: Date.now(), replyingToMessageId: lockStateRef.current.replyingToMessageId };
      }
      const stripped = raw.replace(/^\s*@[^\s]+\s*/u, '').trim();
      const parsed = parsePlayerReplyToOption(qnaStateRef.current, stripped);
      if (!parsed) {
        const prompt = getRetryPrompt(qnaStateRef.current);
        const taggedUser = qnaStateRef.current.taggedUser || activeUserInitialHandleRef.current;
        if (taggedUser) {
          dispatchEventLine(`@${taggedUser} ${prompt}`, lockTarget ?? 'mod_live', 'user_input', 'qna_question');
        }
        sendQnaQuestion();
        return;
      }
      qnaStateRef.current.matched = { optionId: parsed.optionId, keyword: parsed.matchedKeyword, at: Date.now() };
      const option = getOptionById(qnaStateRef.current, parsed.optionId);
      if (!option) return;
      const result = applyOptionResult(qnaStateRef.current, option);
      if (result.type === 'retry' && parsed.optionId === 'UNKNOWN') {
        const prompt = getUnknownPrompt(qnaStateRef.current);
        const taggedUser = qnaStateRef.current.taggedUser || activeUserInitialHandleRef.current;
        if (taggedUser) {
          dispatchEventLine(`@${taggedUser} ${prompt}`, lockTarget ?? 'mod_live', 'user_input', 'qna_question');
        }
        sendQnaQuestion();
        return;
      }
      if (result.type === 'next') {
        sendQnaQuestion();
        return;
      }
      if (result.type === 'chain' && qnaStateRef.current.pendingChain) {
        eventQueueRef.current = [...eventQueueRef.current, { key: qnaStateRef.current.pendingChain.eventKey, source: 'qna' }];
        qnaStateRef.current.history = [...qnaStateRef.current.history, `chain_enqueued:${qnaStateRef.current.pendingChain.eventKey}:${Date.now()}`].slice(-40);
        return;
      }
      if (result.type === 'end') {
        stopQnaFlow(qnaStateRef.current, 'flow_end');
        eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
        lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
        return;
      }
    }

    if (source === 'user_input' && pending && now <= pending.expiresAt) {
      const reasonBase = `event:${pending.eventId}`;
      const repliedYes = /有/.test(raw);
      const repliedNo = /沒有/.test(raw);
      const repliedBrave = /不怕/.test(raw);
      if (pending.key === 'VOICE_CONFIRM' && repliedYes) {
        postFollowUpLine(pending.target, 'VOICE_CONFIRM');
        playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000, startVolume: 0, endVolume: 1, rampSec: 3 });
        triggerReactionBurst('ghost');
        if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'ghost';
      }
      if (pending.key === 'GHOST_PING') {
        playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 3000, startVolume: 1, endVolume: 1, rampSec: 0 });
        postFollowUpLine(pending.target, 'GHOST_PING');
        triggerReactionBurst('ghost');
        if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'ghost';
        cooldownsRef.current.ghost_ping_actor = now + randomInt(8 * 60_000, 12 * 60_000);
        lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
      }
      if (pending.key === 'TV_EVENT' && repliedNo) {
        requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop4', reason: reasonBase, sourceEventKey: 'TV_EVENT', delayMs: 2000 });
        postFollowUpLine(pending.target, 'TV_EVENT');
        const topic: EventTopic = Math.random() < 0.5 ? 'light' : 'ghost';
        triggerReactionBurst(topic);
        if (eventLifecycleRef.current) eventLifecycleRef.current.topic = topic;
      }
      if (pending.key === 'NAME_CALL') {
        playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000, startVolume: 0.8, endVolume: 1, rampSec: 0.2 });
        triggerReactionBurst('ghost');
        if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'ghost';
      }
      if (pending.key === 'VIEWER_SPIKE') {
        playSfx('footsteps', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key });
        triggerReactionBurst('footsteps');
        if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'footsteps';
      }
      if (pending.key === 'FEAR_CHALLENGE' && repliedBrave) {
        const chooseGhost = Math.random() < 0.5;
        const played = chooseGhost
          ? playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000, startVolume: 0.95, endVolume: 1, rampSec: 0.2 })
          : playSfx('footsteps', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000 });
        if (played) {
          postFollowUpLine(pending.target, 'FEAR_CHALLENGE');
          postFollowUpLine(pending.target, 'FEAR_CHALLENGE', 'closer');
          triggerReactionBurst(chooseGhost ? 'ghost' : 'footsteps');
          if (eventLifecycleRef.current) eventLifecycleRef.current.topic = chooseGhost ? 'ghost' : 'footsteps';
        }
      }
      if (eventLifecycleRef.current) {
        eventLifecycleRef.current.state = 'done';
        eventLifecycleRef.current.at = Date.now();
      }
      eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
      pendingReplyEventRef.current = null;
      return;
    }

    if (pending && now > pending.expiresAt) {
      if (eventLifecycleRef.current) {
        eventLifecycleRef.current.state = 'done';
        eventLifecycleRef.current.at = Date.now();
      }
      eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
      pendingReplyEventRef.current = null;
    }

    const gateRejectSummary: Record<string, number> = {};
    if (!target) gateRejectSummary.need_activeUsers = 1;
    if (isLocked) gateRejectSummary.locked = 1;
    eventLastComputedAtRef.current = now;
    eventLastCandidateKeysRef.current = EVENT_REGISTRY_KEYS.slice(0, 10);
    eventLastCandidateCountRef.current = target && !isLocked ? EVENT_REGISTRY_KEYS.length : 0;
    eventGateRejectSummaryRef.current = gateRejectSummary;
    if (!target || isLocked) return;

    const can = (key: StoryEventKey) => (eventCooldownsRef.current[key] ?? 0) <= now;
    for (const key of EVENT_REGISTRY_KEYS) {
      const def = EVENT_REGISTRY[key];
      if (audienceUsers.length < def.minActiveUsers) continue;
      if (!can(key)) continue;
      if (key === 'GHOST_PING' && (cooldownsRef.current.ghost_ping_actor ?? 0) > now) continue;
      if (key === 'TV_EVENT' && (cooldownsRef.current.tv_event ?? 0) > now) continue;
      if (Math.random() >= def.chance) continue;
      const started = startEvent(key, { source });
      if (!started) return;
      eventCooldownsRef.current[key] = now + def.cooldownMs;
      if (def.lockOnStart && started.target) lockStateRef.current = { isLocked: true, target: started.target, startedAt: now, replyingToMessageId: null };
      if (key === 'LIGHT_GLITCH') {
        requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop2', reason: `event:${started.eventId}`, sourceEventKey: 'LIGHT_GLITCH' });
        triggerReactionBurst('light');
        if (eventLifecycleRef.current) {
          eventLifecycleRef.current.state = 'done';
          eventLifecycleRef.current.topic = 'light';
        }
      } else {
        pendingReplyEventRef.current = { key, target: started.target || target, eventId: started.eventId, expiresAt: now + 20_000 };
      }
      if (key === 'TV_EVENT') cooldownsRef.current.tv_event = now + 90_000;
      return;
    }
  }, [appStarted, playSfx, postFollowUpLine, startEvent, state.messages, triggerReactionBurst]);

  useEffect(() => {
    chatEngineRef.current.syncFromMessages(state.messages);
  }, [state.messages]);

  useEffect(() => {
    let isCancelled = false;

    const runSetup = async () => {
      setIsReady(false);
      setIsRendererReady(false);
      setLoadingState('BOOT_START');

      const loadingStart = performance.now();
      setInitStatusText('正在檢查必要素材');
      const missingRequired = await verifyRequiredAssets();
      if (isCancelled) return;

      if (missingRequired.length > 0) {
        setRequiredAssetErrors(missingRequired);
        setInitStatusText('必要素材缺失（素材未加入專案或 base path 設定錯誤）');
        return;
      }

      setInitStatusText('正在預載素材');
      const result = await preloadAssets(ASSET_MANIFEST, {
        onProgress: (progressState) => {
          setLoadingProgress(progressState.progress);
          setInitStatusText(`正在預載素材 (${progressState.loaded}/${progressState.total})`);
        }
      });

      if (isCancelled) return;

      const renderer = new Renderer2D();
      renderer.mount();
      setIsRendererReady(true);
      setLoadingState('ASSETS_READY');

      const elapsed = performance.now() - loadingStart;
      if (elapsed < 800) await new Promise((resolve) => window.setTimeout(resolve, 800 - elapsed));
      if (isCancelled) return;

      setHasOptionalAssetWarning(result.optionalErrors.length > 0);
      if (result.requiredErrors.length > 0) {
        setRequiredAssetErrors(result.requiredErrors.map((url) => ({
          name: 'preload_failure',
          type: 'video',
          relativePath: 'unknown',
          url,
          reason: 'preload failed after required-asset verification'
        })));
        setInitStatusText('必要素材預載失敗，請檢查 Console');
        return;
      }

      setInitStatusText('初始化完成');
      setIsReady(true);
      setLoadingState('RUNNING');
    };

    void runSetup();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let timer = 0;

    const pickNextRhythm = (): Exclude<ChatPacingMode, 'tag_slow'> => {
      const options: Array<Exclude<ChatPacingMode, 'tag_slow'>> = ['normal', 'slightlyBusy', 'tense'];
      const candidates = options.filter((mode) => mode !== lastPacingModeRef.current);
      return pickOne(candidates.length > 0 ? candidates : options);
    };

    const nextInterval = () => {
      const now = Date.now();
      if (!tagSlowActiveRef.current && now >= pacingNextModeFlipAtRef.current) {
        const nextMode = pickNextRhythm();
        pacingModeRef.current = nextMode;
        lastPacingModeRef.current = nextMode;
        pacingModeUntilRef.current = now + randomInt(10_000, 20_000);
        pacingNextModeFlipAtRef.current = now + randomInt(20_000, 40_000);
      }

      if (!tagSlowActiveRef.current && now >= pacingModeUntilRef.current && pacingModeRef.current !== 'normal') {
        pacingModeRef.current = 'normal';
      }

      if (tagSlowActiveRef.current || lockStateRef.current.isLocked) {
        pacingModeRef.current = 'tag_slow';
      }

      const mode = pacingModeRef.current;
      const quietMode = !lockStateRef.current.isLocked && mode === 'normal' && state.curse <= 30;
      const base = quietMode
        ? randomInt(1200, 2200)
        : mode === 'tense'
          ? randomInt(400, 900)
          : mode === 'slightlyBusy'
            ? randomInt(650, 1200)
            : randomInt(800, 1600);
      const shouldSlowForLock = lockStateRef.current.isLocked;
      const shouldSlowForTag = mode === 'tag_slow';
      const slowMultiplier = shouldSlowForLock || shouldSlowForTag ? 2 : 1;
      const scaled = Math.floor(base * slowMultiplier);
      const transitionAt = mode === 'tag_slow' ? null : Math.min(pacingModeUntilRef.current, pacingNextModeFlipAtRef.current);
      chatEngineRef.current.setPacingDebug({
        mode: lockStateRef.current.isLocked ? 'locked_slowed' : (mode === 'tag_slow' ? 'slowed' : 'normal'),
        baseRate: base,
        currentRate: scaled,
        jitterEnabled: true,
        nextMessageDueInSec: Math.max(0, Math.ceil(scaled / 1000))
      });
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          pacing: {
            mode: quietMode ? 'quiet' : mode,
            nextModeInSec: transitionAt ? Math.max(0, Math.ceil((transitionAt - now) / 1000)) : -1
          }
        }
      };
      return scaled;
    };

    const dispatchTimedChats = (messages: ChatMessage[]) => {
      messages.forEach((message) => {
        dispatchChatMessage(message, { source: 'audience_idle' });
      });
    };

    const dispatchForcedBaseMessage = () => {
      const recentTexts = new Set(state.messages.slice(-40).map((message) => (message.translation ?? message.text).trim()));
      let fallback = pickSafeFallbackText();
      for (let i = 0; i < SAFE_FALLBACK_POOL.length; i += 1) {
        const candidate = pickSafeFallbackText();
        if (!recentTexts.has(candidate)) {
          fallback = candidate;
          break;
        }
      }
      dispatchChatMessage({
        id: crypto.randomUUID(),
        username: pickOne(usernames),
        text: fallback,
        language: 'zh',
        translation: fallback,
        type: 'chat'
      }, { source: 'audience_idle' });
    };

    const tick = () => {
      const now = Date.now();
      eventTickCountRef.current += 1;
      eventLastTickAtRef.current = now;
      const topicWeights = getCurrentTopicWeights(now);
      const timedChats = chatAutoPaused ? [] : chatEngineRef.current.tick(now);
      dispatchTimedChats(timedChats);
      syncChatEngineDebug();
      tryTriggerStoryEvent('', 'scheduler_tick');
      if (qnaStateRef.current.isActive) {
        const lockElapsedMs = lockStateRef.current.isLocked && lockStateRef.current.startedAt > 0 ? now - lockStateRef.current.startedAt : 0;
        if (lockElapsedMs >= EVENT_EXCLUSIVE_TIMEOUT_MS) {
          qnaStateRef.current.history = [...qnaStateRef.current.history, `abandoned:tick_timeout:${now}`].slice(-40);
          stopQnaFlow(qnaStateRef.current, 'timeout_abandon');
          eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
          lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
          pendingReplyEventRef.current = null;
          lastBlockedReasonRef.current = 'event_abandoned_timeout';
          return;
        }
        const pressure = handleTimeoutPressure(qnaStateRef.current);
        if (pressure === 'low_rumble') {
          playSfx('low_rumble', { reason: 'qna:pressure40', source: 'event' });
        }
        if (pressure === 'ghost_ping') {
          const played = playSfx('ghost_female', { reason: 'qna:pressure60', source: 'event', allowBeforeStarterTag: true });
          if (!played) {
            triggerReactionBurst('ghost');
          }
        }
        if (!qnaStateRef.current.awaitingReply && Date.now() >= qnaStateRef.current.nextAskAt) {
          sendQnaQuestion();
        }
      }
      if (!eventRunnerStateRef.current.inFlight && eventQueueRef.current.length > 0) {
        const next = eventQueueRef.current.shift();
        if (next) {
          const started = startEvent(next.key, { source: 'scheduler_tick' });
          if (!started) {
            qnaStateRef.current.history = [...qnaStateRef.current.history, `chain_failed:${next.key}:${Date.now()}`].slice(-40);
            qnaStateRef.current.pendingChain = null;
            qnaStateRef.current.awaitingReply = false;
            qnaStateRef.current.nextAskAt = Date.now() + 500;
          } else {
            qnaStateRef.current.history = [...qnaStateRef.current.history, `chain_started:${next.key}:${Date.now()}`].slice(-40);
            qnaStateRef.current.pendingChain = null;
          }
        }
      }
      emitChatEvent({ type: 'IDLE_TICK', topicWeights });
      if (!chatAutoPaused && Date.now() - lastChatMessageAtRef.current > 2500) {
        dispatchForcedBaseMessage();
      }
      const delay = nextInterval();
      eventNextDueAtRef.current = Date.now() + delay;
      timer = window.setTimeout(tick, delay);
    };

    const initialDelay = nextInterval();
    eventNextDueAtRef.current = Date.now() + initialDelay;
    timer = window.setTimeout(tick, initialDelay);
    return () => window.clearTimeout(timer);
  }, [chatAutoPaused, getCurrentTopicWeights, isReady, state.curse, state.messages, syncChatEngineDebug, tryTriggerStoryEvent]);

  useEffect(() => {
    const unsubscribe = onSceneEvent((event) => {
      if (event.type === 'VIDEO_ACTIVE') {
        currentVideoKeyRef.current = event.key;
        emitChatEvent({ type: 'SCENE_SWITCH', toKey: event.key });
      }
      if (event.type === 'SFX_START') {
        const sfxKey = event.sfxKey === 'fan_loop' ? 'fan' : event.sfxKey === 'footsteps' ? 'footsteps' : 'ghost';
        emitChatEvent({ type: 'SFX_START', sfxKey });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      updateEventDebug({
        lock: {
          isLocked: lockStateRef.current.isLocked,
          target: lockStateRef.current.target,
          elapsed: lockStateRef.current.isLocked ? now - lockStateRef.current.startedAt : 0,
          chatSpeedMultiplier: lockStateRef.current.isLocked ? 0.5 : 1
        },
        sfxCooldowns: { ...cooldownsRef.current },
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          scheduler: {
            ...(window.__CHAT_DEBUG__?.event?.scheduler ?? {}),
            now,
            cooldowns: { ...cooldownsRef.current }
          },
          queue: {
            ...(window.__CHAT_DEBUG__?.event?.queue ?? {}),
            length: eventQueueRef.current.length
          },
          qna: {
            ...qnaStateRef.current
          },
          exclusive: eventExclusiveStateRef.current.exclusive,
          currentEventId: eventExclusiveStateRef.current.currentEventId,
          currentLockOwner: eventExclusiveStateRef.current.currentLockOwner,
          lockTarget: lockStateRef.current.target,
          lockElapsedSec: lockStateRef.current.isLocked ? Math.max(0, Math.floor((now - lockStateRef.current.startedAt) / 1000)) : 0,
          foreignTagBlockedCount: foreignTagBlockedCountRef.current,
          lastBlockedReason: lastBlockedReasonRef.current
        }
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [updateEventDebug]);

  useEffect(() => {
    if (!isReady || !appStarted) return;

    let timer = 0;
    const burstTimers: number[] = [];

    const tick = () => {
      const baseChance = 0.35;
      const boostedChance = state.curse > 50 ? Math.min(0.95, baseChance * 1.5) : baseChance;

      if (Math.random() < boostedChance) {
        const now = Date.now();
        const canBurst = now >= burstCooldownUntil.current;
        const shouldBurst = canBurst && (state.curse > 60 || Math.random() < 0.12);

        if (shouldBurst) {
          burstCooldownUntil.current = now + 25_000;
          const burstMessages = randomInt(3, 6);
          const burstTotal = randomInt(5, 20);

          setViewerCount((value) => Math.min(99_999, value + burstTotal));

          for (let i = 0; i < burstMessages; i += 1) {
            const delayMs = i * randomInt(100, 200);
            const burstTimer = window.setTimeout(() => {
              const username = pickOne(usernames);
              dispatchChatMessage({
                id: crypto.randomUUID(),
                type: 'system',
                subtype: 'join',
                username: 'system',
                text: `${username} 加入聊天室`,
                language: 'zh'
              }, { source: 'system_ui' });
            }, delayMs);
            burstTimers.push(burstTimer);
          }
        } else {
          const username = pickOne(usernames);
          const normalJoinBoost = randomInt(1, 3);

          setViewerCount((value) => Math.min(99_999, value + normalJoinBoost));
          dispatchChatMessage({
            id: crypto.randomUUID(),
            type: 'system',
            subtype: 'join',
            username: 'system',
            text: `${username} 加入聊天室`,
            language: 'zh'
          }, { source: 'system_ui' });
        }
      }

      timer = window.setTimeout(tick, nextJoinDelayMs());
    };

    timer = window.setTimeout(tick, nextJoinDelayMs());
    return () => {
      window.clearTimeout(timer);
      burstTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [appStarted, state.curse, isReady]);

  useEffect(() => {
    if (!isReady || !appStarted) return;

    let timer = 0;

    const tick = () => {
      if (Math.random() < 0.08) {
        const leaveCount = randomInt(1, 5);
        setViewerCount((value) => Math.max(0, value - leaveCount));
      }

      timer = window.setTimeout(tick, nextLeaveDelayMs());
    };

    timer = window.setTimeout(tick, nextLeaveDelayMs());
    return () => window.clearTimeout(timer);
  }, [appStarted, loadingState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isReady || !appStarted) return;
      const now = Date.now();
      if (now - lastInputTimestamp.current <= 15_000) return;
      if (now - lastIdleCurseAt.current < 10_000) return;
      lastIdleCurseAt.current = now;
      dispatch({ type: 'INCREASE_CURSE_IDLE', payload: { amount: 2 } });
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [appStarted, loadingState]);


  useEffect(() => {
    if (loadingState === 'ERROR') return;
    if (isReady && isRendererReady && loadingState === 'ASSETS_CHECKING') {
      setLoadingState('ASSETS_READY');
    }
  }, [isReady, isRendererReady, loadingState]);

  useEffect(() => {
    if (loadingState !== 'RUNNING' || postedInitMessages.current) return;
    postedInitMessages.current = true;
    dispatchChatMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '畫面已準備完成',
      language: 'zh'
    }, { source: 'system_ui' });
    dispatchChatMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '初始化完成',
      language: 'zh'
    }, { source: 'system_ui' });
  }, [loadingState]);

  useEffect(() => {
    if (!isReady || !appStarted || !hasOptionalAssetWarning || postedOptionalAssetWarningMessage.current) return;
    postedOptionalAssetWarningMessage.current = true;
    dispatchChatMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '部分非必要素材載入失敗，遊戲可正常進行。',
      language: 'zh'
    }, { source: 'system_ui' });
  }, [appStarted, hasOptionalAssetWarning, isReady]);


  const hasFatalInitError = requiredAssetErrors.length > 0;
  const isLoading = !hasFatalInitError && (!isReady || !isRendererReady);
  const shouldShowMainContent = true;
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [mentionTarget, setMentionTarget] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [debugComposingOverride, setDebugComposingOverride] = useState<boolean | null>(null);
  const [simulatePlayerReply, setSimulatePlayerReply] = useState(true);
  const [ignoreCooldownsDebug, setIgnoreCooldownsDebug] = useState(false);
  const [eventTesterStatus, setEventTesterStatus] = useState<{ key: StoryEventKey | null; blockedReason: EventStartBlockedReason | null }>({
    key: null,
    blockedReason: null
  });
  const [sendFeedback, setSendFeedback] = useState<{ reason: string; at: number } | null>(null);
  const activeUserProfileRef = useRef<ActiveUserProfile | null>(null);
  const usersByIdRef = useRef<Map<string, ActiveUserProfile>>(new Map());
  const usersByHandleRef = useRef<Map<string, ActiveUserProfile>>(new Map());
  const lastMessageMentionsActiveUserRef = useRef(false);
  const [sendDebug, setSendDebug] = useState({
    lastClickAt: 0,
    lastSubmitAt: 0,
    lastAttemptAt: 0,
    lastResult: '-' as 'sent' | 'blocked' | 'error' | '-',
    blockedReason: '',
    errorMessage: ''
  });
  const containerHeight = shellRef.current?.getBoundingClientRect().height ?? null;
  const headerHeight = headerRef.current?.getBoundingClientRect().height ?? null;
  const videoHeight = videoRef.current?.getBoundingClientRect().height ?? null;
  const chatHeight = chatAreaRef.current?.getBoundingClientRect().height ?? null;

  const loadingErrorTitle = useMemo(() => {
    if (!hasFatalInitError) return undefined;
    return '初始化失敗：素材未加入專案或 base path 設定錯誤';
  }, [hasFatalInitError]);

  const updateChatDebug = useCallback((patch: Partial<NonNullable<Window['__CHAT_DEBUG__']>>) => {
    const base = window.__CHAT_DEBUG__ ?? ({} as NonNullable<Window['__CHAT_DEBUG__']>);
    window.__CHAT_DEBUG__ = {
      ...base,
      ...patch,
      ui: {
        ...(base.ui ?? {}),
        ...(patch.ui ?? {})
      }
    };
  }, []);

  const blockRenameAttempt = useCallback((_nextHandle: string): false => {
    updateChatDebug({ ui: { send: { blockedReason: 'rename_disabled' } } });
    return false;
  }, [updateChatDebug]);

  useEffect(() => {
    window.__THAIFEED_RENAME_ACTIVE_USER__ = blockRenameAttempt;
    window.__THAIFEED_CHANGE_NAME__ = blockRenameAttempt;
    window.__THAIFEED_SET_NAME__ = blockRenameAttempt;
    return () => {
      delete window.__THAIFEED_RENAME_ACTIVE_USER__;
      delete window.__THAIFEED_CHANGE_NAME__;
      delete window.__THAIFEED_SET_NAME__;
    };
  }, [blockRenameAttempt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const chatActors = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '');
      const activeUsers = chatActors.audienceUsers;
      const nextDueAt = Math.max(now, eventNextDueAtRef.current || now);
      const schedulerBlockedReason = !appStarted ? 'app_not_started' : (lockStateRef.current.isLocked ? 'lock_active' : '-');
      const schedulerBlocked = schedulerBlockedReason !== '-';
      const snapshot = {
        registry: {
          count: EVENT_REGISTRY_KEYS.length,
          keys: EVENT_REGISTRY_KEYS.slice(0, 20),
          enabledCount: EVENT_REGISTRY_KEYS.length,
          disabledCount: 0,
          manifest: getEventManifest()
        },
        scheduler: {
          now,
          nextDueAt,
          lastFiredAt: eventLastAtRef.current,
          tickCount: eventTickCountRef.current,
          lastTickAt: eventLastTickAtRef.current,
          blocked: schedulerBlocked,
          blockedReason: schedulerBlockedReason,
          cooldowns: { ...cooldownsRef.current, ...eventCooldownsRef.current }
        },
        candidates: {
          lastComputedAt: eventLastComputedAtRef.current,
          lastCandidateCount: eventLastCandidateCountRef.current,
          lastCandidateKeys: eventLastCandidateKeysRef.current.slice(0, 10),
          lastGateRejectSummary: { ...eventGateRejectSummaryRef.current }
        },
        lastEvent: {
          key: eventLifecycleRef.current?.key ?? eventLastKeyRef.current,
          eventId: eventLifecycleRef.current?.eventId,
          at: eventLifecycleRef.current?.at ?? eventLastAtRef.current,
          reason: eventLastReasonRef.current,
          lineVariantId: eventLastVariantIdRef.current,
          state: eventLifecycleRef.current?.state ?? 'done',
          starterTagSent: eventLifecycleRef.current?.starterTagSent ?? false,
          preEffectTriggered: eventLifecycleRef.current?.preEffectTriggered ?? preEffectStateRef.current.triggered,
          preEffectAt: eventLifecycleRef.current?.preEffectAt ?? preEffectStateRef.current.at,
          preEffect: eventLifecycleRef.current?.preEffect ?? { sfxKey: preEffectStateRef.current.sfxKey, videoKey: preEffectStateRef.current.videoKey },
          abortedReason: eventLifecycleRef.current?.abortedReason,
          waitingForReply: Boolean(pendingReplyEventRef.current),
          openerLineId: eventLifecycleRef.current?.openerLineId,
          followUpLineId: eventLifecycleRef.current?.followUpLineId,
          lineIds: eventLifecycleRef.current?.lineIds ?? [],
          topic: eventLifecycleRef.current?.topic
        },
        blocking: {
          isLocked: lockStateRef.current.isLocked,
          lockTarget: lockStateRef.current.target,
          lockElapsedSec: lockStateRef.current.isLocked ? Math.max(0, Math.floor((now - lockStateRef.current.startedAt) / 1000)) : 0,
          schedulerBlocked,
          schedulerBlockedReason,
          lockReason: qnaStateRef.current.isActive
            ? `${qnaStateRef.current.eventKey ?? '-'} / ${qnaStateRef.current.flowId || '-'} / ${qnaStateRef.current.stepId || '-'}`
            : (eventLifecycleRef.current?.key ?? '-'),
          replyingToMessageId: lockStateRef.current.replyingToMessageId,
          lockTargetMissing: lockStateRef.current.isLocked && !lockStateRef.current.target
        },
        cooldowns: { ...cooldownsRef.current, ...eventCooldownsRef.current },
        inFlight: eventRunnerStateRef.current.inFlight,
        lastStartAttemptBlockedReason: eventTestDebugRef.current.lastStartAttemptBlockedReason,
        test: {
          ...eventTestDebugRef.current
        },
        qna: {
          ...qnaStateRef.current,
          lockTargetInvalid: Boolean(qnaStateRef.current.lockTarget && qnaStateRef.current.taggedUser && qnaStateRef.current.lockTarget === qnaStateRef.current.taggedUser),
          taggedUserHandle: qnaStateRef.current.taggedUser,
          lastQuestionMessageId,
          lastQuestionMessageHasTag,
          lastBlockedReason
        }
      };

      updateChatDebug({
        event: snapshot,
        ui: {
          ...(window.__CHAT_DEBUG__?.ui ?? {}),
          replyPreviewSuppressed: replyPreviewSuppressedReason ?? '-',
          replyPinMounted: Boolean(lockStateRef.current.replyingToMessageId),
          replyPinContainerLocation: 'above_input',
          replyPinInsideChatList: false,
          replyPreviewLocation: 'above_input',
          legacyReplyQuoteEnabled: false
        },
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          autoPaused: chatAutoPaused,
          autoPausedReason: chatAutoPaused ? (window.__CHAT_DEBUG__?.ui?.send?.blockedReason ?? 'manual_or_unknown') : '-',
          autoScrollMode: chatAutoScrollMode,
          freezeCountdownRemaining: chatFreezeCountdownRemaining,
          freezeAfterNMessages: chatFreezeAfterNMessages,
          freezeCountdownStartedAt: chatFreezeCountdownStartedAt ?? 0,
          lastMessageActorIdCounted: chatLastMessageActorIdCounted ?? '-',
          lastCountdownDecrementAt: chatLastCountdownDecrementAt ?? 0,
          activeUsers: {
            count: activeUsers.length,
            nameSample: activeUsers.slice(0, 6),
            namesSample: activeUsers.slice(0, 6),
            currentHandle: activeUserInitialHandleRef.current || '-',
            initialHandle: activeUserInitialHandleRef.current || '-',
            renameDisabled: true
          },
          audience: {
            count: chatActors.audienceUsers.length
          },
          activeUser: {
            id: activeUserProfileRef.current?.id ?? '-',
            handle: activeUserProfileRef.current?.handle ?? '-',
            registered: Boolean(activeUserProfileRef.current && usersByHandleRef.current.has(activeUserProfileRef.current.handle)),
            hasSpoken: activeUserProfileRef.current?.hasSpoken ?? false
          },
          mention: {
            lastMessageMentionsActiveUser: lastMessageMentionsActiveUserRef.current
          },
          lastActorPicked: {
            id: window.__CHAT_DEBUG__?.chat?.lastActorPicked?.id ?? '-'
          },
          actorPickBlockedReason: window.__CHAT_DEBUG__?.chat?.actorPickBlockedReason ?? '-'
        }
      } as Partial<NonNullable<Window['__CHAT_DEBUG__']>>);
      syncChatEngineDebug();
    }, 600);
    return () => window.clearInterval(timer);
  }, [appStarted, chatAutoPaused, chatAutoScrollMode, chatFreezeAfterNMessages, chatFreezeCountdownRemaining, chatFreezeCountdownStartedAt, chatLastCountdownDecrementAt, chatLastMessageActorIdCounted, lastBlockedReason, lastQuestionMessageHasTag, lastQuestionMessageId, replyPreviewSuppressedReason, state.messages, syncChatEngineDebug, updateChatDebug]);

  const logSendDebug = useCallback((event: string, payload: Record<string, unknown>) => {
    if (!debugEnabled) return;
    console.log('[CHAT_DEBUG_SEND]', event, payload);
  }, [debugEnabled]);

  useEffect(() => {
    if (!sendFeedback) return;
    const timer = window.setTimeout(() => {
      setSendFeedback((prev) => (prev?.at === sendFeedback.at ? null : prev));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [sendFeedback]);

  useEffect(() => {
    updateChatDebug({
      ui: {
        send: {
          ...sendDebug,
          stateSnapshot: {
            inputLen: input.trim().length,
            isSending,
            isComposing: debugComposingOverride ?? isComposing,
            cooldownMsLeft: Math.max(0, sendCooldownUntil.current - Date.now()),
            tagLockActive: Boolean(replyTarget || mentionTarget),
            replyTarget,
            mentionTarget,
            canSendComputed: isReady && !isSending && input.trim().length > 0 && !(debugComposingOverride ?? isComposing)
          }
        }
      }
    });
  }, [debugComposingOverride, input, isComposing, isReady, isSending, mentionTarget, replyTarget, sendDebug, updateChatDebug]);

  const submitChat = useCallback(async (rawText: string, source: SendSource): Promise<SendResult> => {
    const now = Date.now();
    const markBlocked = (reason: string): SendResult => {
      const next = {
        ...sendDebug,
        lastAttemptAt: now,
        lastResult: 'blocked' as const,
        blockedReason: reason,
        errorMessage: ''
      };
      setSendDebug(next);
      setSendFeedback({ reason, at: now });
      updateChatDebug({
        ui: {
          send: {
            ...next,
            blockedAt: now
          }
        }
      });
      logSendDebug('blocked', { reason, source, inputLen: rawText.trim().length });
      return { ok: false, status: 'blocked', reason };
    };

    if (!isReady) return markBlocked('not_ready');
    if (isSending) return markBlocked('is_sending');
    const cooldownMsLeft = Math.max(0, sendCooldownUntil.current - now);
    if (cooldownMsLeft > 0) return markBlocked('cooldown_active');

    const raw = rawText.trim();
    if (!raw) return markBlocked('empty_input');
    if (debugComposingOverride ?? isComposing) return markBlocked('is_composing');
    const stripLeadingMentions = (text: string) => text.replace(/^\s*(?:@[\w_]+\s*)+/, '').trim();
    const outgoingText = lockStateRef.current.isLocked && lockStateRef.current.target
      ? `@${lockStateRef.current.target} ${stripLeadingMentions(raw)}`.trim()
      : raw;
    if (lockStateRef.current.isLocked && lockStateRef.current.target) {
      const explicitReplyTarget = raw.match(/^\s*@([\w_]+)/u)?.[1] ?? null;
      if (explicitReplyTarget && explicitReplyTarget !== lockStateRef.current.target) {
        lastBlockedReasonRef.current = 'player_reply_target_rewritten';
      }
    }

    let nextReplyTarget = replyTarget;
    let nextMentionTarget = mentionTarget;
    const selfTokens = new Set(['you']);
    const explicitMention = raw.match(/@([\w_]+)/)?.[1] ?? null;
    if (explicitMention) nextMentionTarget = explicitMention;
    const selfTagged = [nextReplyTarget, nextMentionTarget].some((target) => target && selfTokens.has(target.toLowerCase()));
    if (selfTagged) {
      nextReplyTarget = null;
      nextMentionTarget = null;
      setReplyTarget(null);
      setMentionTarget(null);
      logSendDebug('self_tag_ignored', { source, raw });
      updateChatDebug({ ui: { send: { blockedReason: 'self_tag_ignored' } } });
    }

    setReplyTarget(nextReplyTarget);
    setMentionTarget(nextMentionTarget);

    setIsSending(true);
    const submitDelayMs = randomInt(1000, 5000);
    const attemptDebug = {
      ...sendDebug,
      lastAttemptAt: now,
      blockedReason: '',
      errorMessage: ''
    };
    const markSent = (mode: string): SendResult => {
      if (!appStarted) {
        return markBlocked('app_not_started');
      }
      if (chatAutoPaused) {
        setChatAutoPaused(false);
      }
      resetChatAutoScrollFollow();
      const next = { ...attemptDebug, lastResult: 'sent' as const };
      setSendDebug(next);
      logSendDebug('sent', { source, mode, autoResumed: chatAutoPaused, autoScrollMode: chatAutoScrollMode });
      return { ok: true, status: 'sent' };
    };
    setSendDebug(attemptDebug);
    logSendDebug('attempt', { source, inputLen: raw.length, submitDelayMs });

    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, submitDelayMs);
      });

      lastInputTimestamp.current = Date.now();
      lastIdleCurseAt.current = 0;

      if (!soundUnlocked.current) {
        soundUnlocked.current = true;
        dispatchChatMessage({
          id: crypto.randomUUID(),
          type: 'system',
          username: 'system',
          text: '聲音已啟用',
          language: 'zh'
        }, { source: 'system_ui' });
      }

      const playableConsonant = resolvePlayableConsonant(state.currentConsonant.letter);

      if (!activeUserInitialHandleRef.current) {
        return markBlocked('no_active_user');
      }
      dispatchChatMessage(createPlayerMessage(outgoingText, activeUserInitialHandleRef.current), {
        source: 'player_input',
        sourceTag: source
      });
      if (activeUserProfileRef.current) {
        activeUserProfileRef.current = { ...activeUserProfileRef.current, hasSpoken: true };
        usersByIdRef.current.set(activeUserProfileRef.current.id, activeUserProfileRef.current);
        usersByHandleRef.current.set(activeUserProfileRef.current.handle, activeUserProfileRef.current);
      }

      const handlePass = () => {
        markReview(playableConsonant.letter, 'pass', state.curse);
        const entry = getMemoryNode(playableConsonant.letter);
        dispatch({
          type: 'ANSWER_PASS',
          payload: {
            message: createVipPassMessage(playableConsonant, entry.lapseCount)
          }
        });
        nonVipMessagesSinceLastVip.current = 0;
        setInput('');
      };

      if (isPassCommand(raw)) {
        handlePass();
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('pass');
      }

      const isHintInput = isVipHintCommand(raw);
      const vipReply = handleVipPlayerMessage({
        rawInput: raw,
        currentConsonant: playableConsonant.letter,
        currentAnchor: state.currentAnchor,
        state: { nonVipMessagesSinceLastVip: nonVipMessagesSinceLastVip.current },
        recentHistory: state.messages.map((message) => message.translation ?? message.text)
      });

      if (vipReply) {
        dispatchChatMessage(vipReply, { source: 'event_dialogue', sourceTag: 'vip_system' });
        nonVipMessagesSinceLastVip.current = 0;
      } else {
        nonVipMessagesSinceLastVip.current += 1;
      }

      if (isHintInput) {
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('hint');
      }

      if (isAnswerCorrect(raw, playableConsonant)) {
        const donateSample = pickOne(donatePools.messages);
        const donate: DonateMessage = {
          id: crypto.randomUUID(),
          username: pickOne(usernames),
          amount: pickOne(donatePools.amounts),
          message_th: donateSample.th,
          message_zh: donateSample.zh
        };

        const successMessage = {
          id: crypto.randomUUID(), username: 'mod_live', text: '這波有穩住', language: 'zh' as const, translation: '這波有穩住'
        };
        dispatch({
          type: 'ANSWER_CORRECT',
          payload: {
            message: successMessage,
            donateMessage: createDonateChatMessage(donate)
          }
        });
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('answer_correct');
      }

      const speechHit = parsePlayerSpeech(raw);
      const now = Date.now();
      const canTriggerSpeech = Boolean(speechHit) && now >= speechCooldownUntil.current;
      if (canTriggerSpeech) {
        speechCooldownUntil.current = now + 10_000;
      }

      const tagTarget = outgoingText.match(/@([\w_]+)/)?.[1] ?? null;
      if (lockStateRef.current.isLocked && lockStateRef.current.target && tagTarget !== lockStateRef.current.target) {
        return markBlocked('lock_target_mismatch');
      }
      tryTriggerStoryEvent(outgoingText, 'user_input');
      const chats = chatEngineRef.current.emit({ type: 'USER_SENT', text: outgoingText, user: 'you' }, Date.now());
      const wrongMessage = chats[0] ?? { id: crypto.randomUUID(), username: 'chat_mod', text: '這下壓力又上來了', language: 'zh', translation: '這下壓力又上來了' };
      dispatch({
        type: 'ANSWER_WRONG',
        payload: { message: wrongMessage }
      });
      setInput('');
      sendCooldownUntil.current = Date.now() + 350;
      tagSlowActiveRef.current = false;
      return markSent('answer_wrong');
    } catch (error) {
      const errorMessage = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      const next = {
        ...attemptDebug,
        lastResult: 'error' as const,
        errorMessage
      };
      setSendDebug(next);
      logSendDebug('error', { source, errorMessage });
      return { ok: false, status: 'error', errorMessage };
    } finally {
      setIsSending(false);
    }
  }, [appStarted, chatAutoPaused, chatAutoScrollMode, debugComposingOverride, isComposing, isReady, isSending, logSendDebug, mentionTarget, replyTarget, resetChatAutoScrollFollow, sendDebug, state, tryTriggerStoryEvent, updateChatDebug]);

  const submit = useCallback((source: SendSource) => {
    if (source === 'submit') {
      setSendDebug((prev) => ({ ...prev, lastSubmitAt: Date.now() }));
      logSendDebug('submit', { source });
    }
    return submitChat(input, source);
  }, [input, logSendDebug, submitChat]);

  const registerActiveUser = useCallback((rawHandle: string) => {
    const normalizedHandle = normalizeHandle(rawHandle);
    if (!normalizedHandle) return false;
    const nextProfile: ActiveUserProfile = {
      id: 'activeUser',
      handle: normalizedHandle,
      displayName: normalizedHandle,
      roleLabel: 'You',
      hasSpoken: activeUserProfileRef.current?.hasSpoken ?? false
    };
    activeUserInitialHandleRef.current = normalizedHandle;
    activeUserProfileRef.current = nextProfile;
    usersByIdRef.current.set(nextProfile.id, nextProfile);
    usersByHandleRef.current.set(nextProfile.handle, nextProfile);
    return true;
  }, []);

  const emitNpcTagToActiveUser = useCallback(() => {
    const activeHandle = normalizeHandle(activeUserInitialHandleRef.current || '');
    if (!activeHandle) {
      setLastBlockedReason('no_active_user');
      return;
    }
    if (!usersByHandleRef.current.has(activeHandle)) {
      setLastBlockedReason('active_user_not_registered');
      return;
    }
    const line = `@${activeHandle} Debug tester：請回覆我現在有沒有鎖定成功？`;
    const sent = dispatchEventLine(line, 'mod_live', 'debug_tester', 'debug_tester');
    if (!sent.ok || !sent.lineId) {
      setLastBlockedReason(sent.ok ? 'debug_emit_failed' : (sent.blockedReason ?? 'debug_emit_failed'));
      return;
    }
    const now = Date.now();
    lockStateRef.current = { isLocked: true, target: 'mod_live', startedAt: now, replyingToMessageId: sent.lineId };
    eventExclusiveStateRef.current.currentLockOwner = 'mod_live';
    setLastQuestionMessageId(sent.lineId);
    setLastQuestionMessageHasTag(true);
    setReplyPreviewSuppressedReason(null);
    setLastBlockedReason(null);
    startChatFreezeCountdown(FREEZE_AFTER_MESSAGE_COUNT);
  }, [dispatchEventLine, startChatFreezeCountdown]);


  useEffect(() => {
    tagSlowActiveRef.current = Boolean(replyTarget || mentionTarget);
  }, [mentionTarget, replyTarget]);

  const handleSendButtonClick = useCallback(() => {
    setSendDebug((prev) => ({ ...prev, lastClickAt: Date.now() }));
    logSendDebug('click', { source: 'button' });
  }, [logSendDebug]);

  const ensureDebugActiveUsers = useCallback(() => {
    const active = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '').audienceUsers;
    if (active.length > 0) return active;
    DEBUG_SEED_USERS.forEach((username) => {
      dispatchChatMessage({
        id: crypto.randomUUID(),
        type: 'chat',
        username,
        text: '在',
        language: 'zh',
        translation: '在'
      }, { source: 'debug_tester' });
    });
    return DEBUG_SEED_USERS;
  }, [dispatchChatMessage, state.messages]);

  const simulateReplyText = useCallback((key: StoryEventKey) => {
    if (key === 'VOICE_CONFIRM') return '有';
    if (key === 'TV_EVENT') return '沒有';
    if (key === 'FEAR_CHALLENGE') return '我不怕';
    return '我在';
  }, []);

  const triggerEventFromTester = useCallback((eventKey: StoryEventKey) => {
    const activeUsers = ensureDebugActiveUsers();
    if (activeUsers.length === 0) {
      setEventAttemptDebug(eventKey, 'no_active_user');
      setEventTesterStatus({ key: eventKey, blockedReason: 'no_active_user' });
      return;
    }

    const now = Date.now();
    const cooldown = eventCooldownsRef.current[eventKey] ?? 0;
    if (!ignoreCooldownsDebug && cooldown > now) {
      setEventAttemptDebug(eventKey, 'cooldown_blocked');
      setEventTesterStatus({ key: eventKey, blockedReason: 'cooldown_blocked' });
      return;
    }

    if (ignoreCooldownsDebug) {
      eventCooldownsRef.current[eventKey] = now + 5_000;
    } else {
      eventCooldownsRef.current[eventKey] = now + EVENT_REGISTRY[eventKey].cooldownMs;
    }

    const started = startEvent(eventKey, { source: 'debug_tester', ignoreCooldowns: ignoreCooldownsDebug });
    if (!started) {
      const blockedReason = eventTestDebugRef.current.lastStartAttemptBlockedReason;
      setEventTesterStatus({ key: eventKey, blockedReason: blockedReason === '-' ? 'invalid_state' : blockedReason });
      return;
    }

    setEventTesterStatus({ key: eventKey, blockedReason: null });

    if (eventKey === 'LIGHT_GLITCH') {
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop2', reason: `event:${started.eventId}`, sourceEventKey: 'LIGHT_GLITCH' });
      triggerReactionBurst('light');
      if (eventLifecycleRef.current) {
        eventLifecycleRef.current.state = 'done';
        eventLifecycleRef.current.topic = 'light';
      }
      return;
    }

    pendingReplyEventRef.current = { key: eventKey, target: started.target || activeUsers[0], eventId: started.eventId, expiresAt: now + 20_000 };
    if (!simulatePlayerReply) return;

    const delay = randomInt(800, 1500);
    const timerId = window.setTimeout(() => {
      if (!pendingReplyEventRef.current || pendingReplyEventRef.current.eventId !== started.eventId) return;
      const target = pendingReplyEventRef.current.target;
      setReplyTarget(target);
      setInput(`@${target} ${simulateReplyText(eventKey)}`);
      void submitChat(`@${target} ${simulateReplyText(eventKey)}`, 'debug_simulate');
    }, delay);
    registerEventRunnerTimer(timerId);
  }, [ensureDebugActiveUsers, ignoreCooldownsDebug, registerEventRunnerTimer, setEventAttemptDebug, simulatePlayerReply, simulateReplyText, startEvent, submitChat, triggerReactionBurst]);

  const resetEventTestState = useCallback(() => {
    clearEventRunnerState();
    eventTestDebugRef.current.lastStartAttemptBlockedReason = '-';
    setEventTesterStatus({ key: null, blockedReason: null });
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        test: {
          ...(window.__CHAT_DEBUG__?.event?.test ?? {}),
          ...eventTestDebugRef.current
        }
      }
    });
  }, [clearEventRunnerState, updateEventDebug]);

  const forceUnlockDebug = useCallback(() => {
    eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
    lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
  }, []);

  const forceShowLoop4Debug = useCallback(() => {
    requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop4', reason: 'debug_force_show_loop4_3s', sourceEventKey: 'TV_EVENT' });
    window.setTimeout(() => {
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop3', reason: 'debug_force_show_loop4_return', sourceEventKey: 'DEBUG' });
    }, 3000);
  }, []);

  return (
    <div ref={shellRef} className={`app-shell app-root-layout ${isDesktopLayout ? 'desktop-layout' : 'mobile-layout'}`}>
      <LoadingOverlay
        visible={isLoading}
        progress={loadingProgress}
        statusText={initStatusText}
        errorTitle={loadingErrorTitle}
        errors={requiredAssetErrors.map(formatMissingAsset)}
      />
      {shouldShowMainContent && (
      <main className="app-root app-layout">
        <header ref={headerRef} className="app-header top-dock">
          <div className="top-dock-row">
            <LiveHeader viewerCountLabel={formatViewerCount(viewerCount)} />
          </div>
        </header>
        <section ref={videoRef} tabIndex={-1} className={`video-area video-container ${isDesktopLayout ? 'videoViewportDesktop' : 'videoViewportMobile'}`}>
          <button type="button" className="video-debug-toggle" onClick={() => setDebugOpen((prev) => !prev)} aria-expanded={debugOpen}>
            Debug
          </button>
          {!hasFatalInitError ? (
            <SceneView
              targetConsonant={state.currentConsonant.letter}
              curse={state.curse}
              anchor={state.currentAnchor}
              isDesktopLayout={isDesktopLayout}
              appStarted={appStarted}
            />
          ) : (
            <div className="asset-warning scene-placeholder">
              初始化失敗：必要素材缺失（素材未加入專案或 base path 設定錯誤），請開啟 Console 檢查 missing 清單。
            </div>
          )}
          {!appStarted && (
            <div className="startup-overlay" role="dialog" aria-modal="true" aria-label="Enter your name">
              <div className="startup-card">
                <h2>Enter your name</h2>
                <input
                  value={startNameInput}
                  onChange={(event) => setStartNameInput(event.target.value)}
                  placeholder="username"
                  maxLength={24}
                />
                <button
                  type="button"
                  onClick={() => {
                    const normalizedName = normalizeHandle(startNameInput);
                    if (!normalizedName) return;
                    registerActiveUser(normalizedName);
                    setAppStarted(true);
                    setChatAutoPaused(false);
                    window.setTimeout(() => {
                      videoRef.current?.focus();
                    }, 0);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
          {debugOpen && (
            <aside className="video-debug-panel" aria-label="Debug Panel">
              <button type="button" className="video-debug-close" onClick={() => setDebugOpen(false)} aria-label="Close debug panel">×</button>
              <div className="debug-event-tester" aria-label="Event Tester">
                <h4>Event Tester</h4>
                <div className="debug-route-controls">
                  {EVENT_TESTER_KEYS.map((eventKey) => (
                    <div key={eventKey} className="debug-event-button-row">
                      <button type="button" onClick={() => triggerEventFromTester(eventKey)}>
                        Trigger {eventKey}
                      </button>
                      {eventTesterStatus.key === eventKey && eventTesterStatus.blockedReason && (
                        <small>Blocked: {eventTesterStatus.blockedReason}</small>
                      )}
                    </div>
                  ))}
                </div>
                <label>
                  <input type="checkbox" checked={ignoreCooldownsDebug} onChange={(event) => setIgnoreCooldownsDebug(event.target.checked)} />
                  Ignore Cooldowns (debug only)
                </label>
                <label>
                  <input type="checkbox" checked={simulatePlayerReply} onChange={(event) => setSimulatePlayerReply(event.target.checked)} />
                  Simulate Player Reply
                </label>
                <div className="debug-route-controls">
                  <button type="button" onClick={emitNpcTagToActiveUser}>Emit NPC Tag @You</button>
                  <button type="button" onClick={resetEventTestState}>Reset Test State</button>
                  <button type="button" onClick={forceUnlockDebug}>Force Unlock</button>
                  <button type="button" onClick={forceShowLoop4Debug}>Force Show loop4 (3s)</button>
                </div>
              </div>
              <div className="debug-route-meta">
                <div>event.registry.count: {window.__CHAT_DEBUG__?.event?.registry?.count ?? 0}</div>
                <div className="debug-event-manifest">
                  {(window.__CHAT_DEBUG__?.event?.registry?.manifest ?? []).map((entry) => (
                    <div key={entry.key}>[{entry.key}] pre({entry.preEffect?.sfxKey ?? '-'} / {entry.preEffect?.videoKey ?? '-'}) post({entry.postEffect?.sfxKey ?? '-'} / {entry.postEffect?.videoKey ?? '-'}) cd={entry.cooldownMs} lock={String(entry.usesLock)}</div>
                  ))}
                </div>
                <div>chat.activeUsers.count: {window.__CHAT_DEBUG__?.chat?.activeUsers?.count ?? 0}</div>
                <div>chat.audience.count: {window.__CHAT_DEBUG__?.chat?.audience?.count ?? 0}</div>
                <div>chat.activeUser.id: {window.__CHAT_DEBUG__?.chat?.activeUser?.id ?? '-'}</div>
                <div>chat.activeUser.handle: {window.__CHAT_DEBUG__?.chat?.activeUser?.handle ?? '-'}</div>
                <div>chat.activeUser.registered: {String(window.__CHAT_DEBUG__?.chat?.activeUser?.registered ?? false)}</div>
                <div>chat.activeUser.hasSpoken: {String(window.__CHAT_DEBUG__?.chat?.activeUser?.hasSpoken ?? false)}</div>
                <div>mention.test.lastMessageMentionsActiveUser: {String(window.__CHAT_DEBUG__?.chat?.mention?.lastMessageMentionsActiveUser ?? false)}</div>
                <div>lastActorPicked.id: {window.__CHAT_DEBUG__?.chat?.lastActorPicked?.id ?? '-'}</div>
                <div>actorPickBlockedReason: {window.__CHAT_DEBUG__?.chat?.actorPickBlockedReason ?? '-'}</div>
                <div>event.lastBlockedReason: {window.__CHAT_DEBUG__?.event?.lastBlockedReason ?? '-'}</div>
                <div>chat.blockedCounts.activeUserAutoSpeak: {window.__CHAT_DEBUG__?.chat?.blockedCounts?.activeUserAutoSpeak ?? 0}</div>
                <div>chat.lastBlockedSendAttempt.actor/source: {(window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.actorHandle ?? '-')} / {(window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.source ?? '-')}</div>
                <div>chat.lastBlockedSendAttempt.reason: {window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.blockedReason ?? '-'}</div>
                <div>chat.autoScrollMode: {window.__CHAT_DEBUG__?.chat?.autoScrollMode ?? '-'}</div>
                <div>chat.freezeCountdownRemaining: {window.__CHAT_DEBUG__?.chat?.freezeCountdownRemaining ?? 0}</div>
                <div>chat.freezeAfterNMessages: {window.__CHAT_DEBUG__?.chat?.freezeAfterNMessages ?? 0}</div>
                <div>chat.freezeCountdownStartedAt: {window.__CHAT_DEBUG__?.chat?.freezeCountdownStartedAt ?? 0}</div>
                <div>chat.lastMessageActorIdCounted: {window.__CHAT_DEBUG__?.chat?.lastMessageActorIdCounted ?? '-'}</div>
                <div>chat.lastCountdownDecrementAt: {window.__CHAT_DEBUG__?.chat?.lastCountdownDecrementAt ?? 0}</div>
                <div>lastEvent.key: {window.__CHAT_DEBUG__?.event?.lastEvent?.key ?? '-'}</div>
                <div>lastEvent.starterTagSent: {String(window.__CHAT_DEBUG__?.event?.lastEvent?.starterTagSent ?? false)}</div>
                <div>lastEvent.preEffectTriggered/preEffectAt: {String(window.__CHAT_DEBUG__?.event?.lastEvent?.preEffectTriggered ?? false)} / {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffectAt ?? '-'}</div>
                <div>lastEvent.preEffect.sfxKey/videoKey: {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffect?.sfxKey ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffect?.videoKey ?? '-'}</div>
                <div>video.lastPlayRequest.requestedKey: {window.__VIDEO_DEBUG__?.lastPlayRequest?.requestedKey ?? '-'}</div>
                <div>video.currentKey: {window.__VIDEO_DEBUG__?.currentKey ?? '-'}</div>
                <div>video.lastSwitch.toKey: {window.__VIDEO_DEBUG__?.lastSwitch?.toKey ?? '-'}</div>
                <div>video.lastDenied.denyReason: {window.__VIDEO_DEBUG__?.lastDenied?.denyReason ?? '-'}</div>
                <div>lastEvent.abortedReason: {window.__CHAT_DEBUG__?.event?.lastEvent?.abortedReason ?? '-'}</div>
                <div>lock.isLocked: {String(window.__CHAT_DEBUG__?.event?.blocking?.isLocked ?? false)}</div>
                <div>lock.lockTarget: {window.__CHAT_DEBUG__?.event?.blocking?.lockTarget ?? '-'}</div>
                <div>activeUserInitialHandle: {window.__CHAT_DEBUG__?.chat?.activeUsers?.initialHandle ?? '-'}</div>
                <div>renameDisabled: {String((window.__CHAT_DEBUG__?.chat?.activeUsers as { renameDisabled?: boolean } | undefined)?.renameDisabled ?? true)}</div>
                <div>event.inFlight: {String(window.__CHAT_DEBUG__?.event?.inFlight ?? false)}</div>
                <div>event.queue.length: {window.__CHAT_DEBUG__?.event?.queue?.length ?? 0}</div>
                <div>qna.isActive: {String(window.__CHAT_DEBUG__?.event?.qna?.isActive ?? false)}</div>
                <div>qna.flowId/eventKey/stepId: {window.__CHAT_DEBUG__?.event?.qna?.flowId ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.eventKey ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.stepId ?? '-'}</div>
                <div>qna.awaitingReply/attempts: {String(window.__CHAT_DEBUG__?.event?.qna?.awaitingReply ?? false)} / {window.__CHAT_DEBUG__?.event?.qna?.attempts ?? 0}</div>
                <div>qna.lastAskedAt/lockTarget: {window.__CHAT_DEBUG__?.event?.qna?.lastAskedAt ?? 0} / {window.__CHAT_DEBUG__?.event?.qna?.lockTarget ?? '-'}</div>
                <div>qna.taggedUserHandle: {window.__CHAT_DEBUG__?.event?.qna?.taggedUser ?? '-'}</div>
                <div>qna.lastQuestionMessageId: {window.__CHAT_DEBUG__?.event?.qna?.lastQuestionMessageId ?? '-'}</div>
                <div>qna.lastQuestionMessageHasTag: {String(window.__CHAT_DEBUG__?.event?.qna?.lastQuestionMessageHasTag ?? false)}</div>
                <div>qna.lastBlockedReason: {window.__CHAT_DEBUG__?.event?.qna?.lastBlockedReason ?? '-'}</div>
                <div>ui.replyPreviewSuppressed: {window.__CHAT_DEBUG__?.ui?.replyPreviewSuppressed ?? '-'}</div>
                <div>ui.replyPinMounted: {String((window.__CHAT_DEBUG__?.ui as { replyPinMounted?: boolean } | undefined)?.replyPinMounted ?? false)}</div>
                <div>ui.replyPinContainerLocation: {(window.__CHAT_DEBUG__?.ui as { replyPinContainerLocation?: string } | undefined)?.replyPinContainerLocation ?? '-'}</div>
                <div>ui.replyPinInsideChatList: {String((window.__CHAT_DEBUG__?.ui as { replyPinInsideChatList?: boolean } | undefined)?.replyPinInsideChatList ?? false)}</div>
                <div>ui.replyPreviewLocation/legacyReplyQuoteEnabled: {(window.__CHAT_DEBUG__?.ui as { replyPreviewLocation?: string; legacyReplyQuoteEnabled?: boolean } | undefined)?.replyPreviewLocation ?? '-'} / {String((window.__CHAT_DEBUG__?.ui as { legacyReplyQuoteEnabled?: boolean } | undefined)?.legacyReplyQuoteEnabled ?? false)}</div>
                <div>qna.lockTargetHandle: {window.__CHAT_DEBUG__?.event?.qna?.lockTarget ?? '-'}</div>
                <div>qna.lastQuestionActor.handle: {window.__CHAT_DEBUG__?.event?.qna?.lastQuestionActor ?? '-'}</div>
                <div>qna.lastAskedTextPreview: {window.__CHAT_DEBUG__?.event?.qna?.lastAskedTextPreview ?? '-'}</div>
                <div>qna.lockTargetInvalidError: {String(window.__CHAT_DEBUG__?.event?.qna?.lockTargetInvalid ?? false)}</div>
                <div>qna.matched.optionId/keyword/at: {window.__CHAT_DEBUG__?.event?.qna?.matched?.optionId ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.matched?.keyword ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.matched?.at ?? '-'}</div>
                <div>qna.pendingChain.eventKey: {window.__CHAT_DEBUG__?.event?.qna?.pendingChain?.eventKey ?? '-'}</div>
                <div>event.test.lastStartAttemptAt: {window.__CHAT_DEBUG__?.event?.test?.lastStartAttemptAt ?? 0}</div>
                <div>event.test.lastStartAttemptKey: {window.__CHAT_DEBUG__?.event?.test?.lastStartAttemptKey ?? '-'}</div>
                <div>event.test.lastStartAttemptBlockedReason: {window.__CHAT_DEBUG__?.event?.test?.lastStartAttemptBlockedReason ?? '-'}</div>
                <div>event.lastStartAttemptBlockedReason: {window.__CHAT_DEBUG__?.event?.lastStartAttemptBlockedReason ?? '-'}</div>
                <div>event.exclusive: {String(window.__CHAT_DEBUG__?.event?.exclusive ?? false)}</div>
                <div>event.currentEventId: {window.__CHAT_DEBUG__?.event?.currentEventId ?? '-'}</div>
                <div>lock.lockOwner: {window.__CHAT_DEBUG__?.event?.currentLockOwner ?? '-'}</div>
                <div>lock.lockElapsedSec: {window.__CHAT_DEBUG__?.event?.lockElapsedSec ?? 0}</div>
                <div>event.foreignTagBlockedCount: {window.__CHAT_DEBUG__?.event?.foreignTagBlockedCount ?? 0}</div>
                <div>event.lastBlockedReason: {window.__CHAT_DEBUG__?.event?.lastBlockedReason ?? '-'}</div>
                <div>sfx.ghostCooldown: {window.__CHAT_DEBUG__?.event?.cooldowns?.ghost_female ?? 0}</div>
                <div>sfx.footstepsCooldown: {window.__CHAT_DEBUG__?.event?.cooldowns?.footsteps ?? 0}</div>
              </div>
            </aside>
          )}
        </section>
        <section ref={chatAreaRef} className="chat-area chat-container input-surface">
          <ChatPanel
            messages={state.messages}
            input={input}
            onChange={(value) => {
              setInput(value);
            }}
            onToggleTranslation={(id) => dispatch({ type: 'TOGGLE_CHAT_TRANSLATION', payload: { id } })}
            onAutoPauseChange={setChatAutoPaused}
            isSending={isSending}
            isReady={isReady}
            loadingStatusText={initStatusText}
            onInputHeightChange={setChatInputHeight}
            sendFeedback={sendFeedback?.reason ?? null}
            onSubmit={submit}
            onCompositionStateChange={setIsComposing}
            isComposing={debugComposingOverride ?? isComposing}
            onDebugSimulateSend={() => submit('debug_simulate')}
            onDebugToggleSelfTag={() => {
              setReplyTarget((prev) => (prev ? null : 'you'));
            }}
            onDebugToggleComposing={() => {
              setDebugComposingOverride((prev) => (prev == null ? true : !prev));
            }}
            onSendButtonClick={handleSendButtonClick}
            isLocked={lockStateRef.current.isLocked}
            lockTarget={lockStateRef.current.target}
            replyingToMessageId={lockStateRef.current.replyingToMessageId}
            replyPreviewSuppressedReason={replyPreviewSuppressedReason}
            activeUserInitialHandle={activeUserInitialHandleRef.current}
            autoScrollMode={chatAutoScrollMode}
          />
        </section>
        {!isDesktopLayout && debugEnabled && (
          <aside className="mobile-layout-debug" data-tick={layoutMetricsTick}>
            <div>visualViewport.height: {mobileViewportHeight ? Math.round(mobileViewportHeight) : 'n/a'}</div>
            <div>window.innerHeight: {Math.round(mobileInnerHeight)}</div>
            <div>container height: {containerHeight ? Math.round(containerHeight) : 'n/a'}</div>
            <div>video height: {videoHeight ? Math.round(videoHeight) : 'n/a'}</div>
            <div>chat height: {chatHeight ? Math.round(chatHeight) : 'n/a'}</div>
            <div>header height: {headerHeight ? Math.round(headerHeight) : 'n/a'}</div>
            <div>input height: {chatInputHeight ? Math.round(chatInputHeight) : 'n/a'}</div>
            <div>keyboard open: {isKeyboardOpen ? 'true' : 'false'}</div>
          </aside>
        )}
      </main>
      )}
    </div>
  );
}
