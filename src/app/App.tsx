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
import { EVENT_REGISTRY, EVENT_REGISTRY_KEYS } from '../core/events/eventRegistry';
import { pickDialog } from '../core/events/eventDialogs';
import { pickReactionLines } from '../core/events/eventReactions';
import { startEvent as runEventStart } from '../core/events/eventRunner';
import type { EventLinePhase, EventRunRecord, EventSendResult, EventTopic, StoryEventKey } from '../core/events/eventTypes';

export type SendSource = 'submit' | 'debug_simulate' | 'fallback_click';

export type SendResult = {
  ok: boolean;
  status: 'sent' | 'blocked' | 'error';
  reason?: string;
  errorMessage?: string;
};

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

function isPassCommand(raw: string) {
  const normalized = raw.trim().toLowerCase();
  return normalized === 'pass' || raw.trim() === '跳過';
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


export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const isDebugRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/debug');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [appStarted, setAppStarted] = useState(false);
  const [, setActiveUser] = useState('');
  const [startNameInput, setStartNameInput] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('BOOT_START');
  const [hasOptionalAssetWarning, setHasOptionalAssetWarning] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initStatusText, setInitStatusText] = useState('初始化中');
  const [requiredAssetErrors, setRequiredAssetErrors] = useState<MissingRequiredAsset[]>([]);
  const [chatAutoPaused, setChatAutoPaused] = useState(false);
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
  const lockStateRef = useRef<{ isLocked: boolean; target: string | null; startedAt: number }>({ isLocked: false, target: null, startedAt: 0 });
  const cooldownsRef = useRef<Record<string, number>>({ ghost_female: 0, footsteps: 0, low_rumble: 0, loop4: 0, ghost_ping_actor: 0 });
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

  const eventLifecycleRef = useRef<EventRunRecord | null>(null);
  const reactionRecentIdsRef = useRef<Record<EventTopic, string[]>>({ ghost: [], footsteps: [], light: [] });

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

  const dispatchAudienceMessage = (message: ChatMessage) => {
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
    lastChatMessageAtRef.current = Date.now();
    dispatch({ type: 'AUDIENCE_MESSAGE', payload: linted.message });
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
        pacing: {
          mode: engineDebug.pacing?.mode ?? 'normal',
          baseRate: engineDebug.pacing?.baseRate ?? 0,
          currentRate: engineDebug.pacing?.currentRate ?? 0,
          jitterEnabled: engineDebug.pacing?.jitterEnabled ?? true,
          nextMessageDueInSec: engineDebug.pacing?.nextMessageDueInSec ?? 0
        }
      }
    };
  }, []);

  const emitChatEvent = (event: Parameters<ChatEngine['emit']>[0]) => {
    const chats = chatEngineRef.current.emit(event, Date.now());
    chats.forEach(dispatchAudienceMessage);
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
          dispatchAudienceMessage({
            id: crypto.randomUUID(),
            username: pickOne(usernames),
            type: 'chat',
            text: line.text,
            language: 'zh',
            translation: line.text
          });
        }, Math.floor((durationMs / Math.max(1, reactionCount)) * index));
      });
    }, Math.max(0, fireAt - Date.now()));
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        scheduler: { ...(window.__CHAT_DEBUG__?.event?.scheduler ?? {}), lastFiredAt: fireAt, nextDueAt: fireAt + durationMs },
        lastEventLabel: `reaction:${topic}`
      }
    });
  }, [dispatchAudienceMessage, markEventTopicBoost, updateEventDebug]);

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

  const dispatchEventLine = useCallback((line: string, target: string): EventSendResult => {
    const now = Date.now();
    if (!line.trim()) return { ok: false, blockedReason: 'empty' };
    if (!appStarted) return { ok: false, blockedReason: 'app_not_started' };
    if (chatAutoPaused) return { ok: false, blockedReason: 'chat_auto_paused' };
    if (sendCooldownUntil.current > now) return { ok: false, blockedReason: 'rate_limited' };
    if (lockStateRef.current.isLocked && lockStateRef.current.target && lockStateRef.current.target !== target) {
      return { ok: false, blockedReason: 'locked_target_only' };
    }

    dispatchAudienceMessage({
      id: crypto.randomUUID(),
      username: 'mod_live',
      type: 'chat',
      text: line,
      language: 'zh',
      translation: line,
      tagTarget: target
    });
    return { ok: true };
  }, [appStarted, chatAutoPaused, dispatchAudienceMessage]);

  const playSfx = useCallback((
    key: 'ghost_female' | 'footsteps' | 'low_rumble' | 'fan_loop',
    options: { reason: string; source: 'event' | 'system' | 'unknown'; delayMs?: number; startVolume?: number; endVolume?: number; rampSec?: number; eventId?: string; eventKey?: StoryEventKey }
  ) => {
    const now = Date.now();
    const cooldownMin = key === 'ghost_female' ? 180_000 : key === 'footsteps' || key === 'low_rumble' ? 120_000 : 0;
    if (key !== 'fan_loop') {
      const cooldownUntil = cooldownsRef.current[key] ?? 0;
      if (cooldownUntil > now) return false;
      cooldownsRef.current[key] = now + cooldownMin;
    }
    if ((key === 'ghost_female' || key === 'footsteps') && eventLifecycleRef.current?.starterTagSent !== true) {
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

  const startEvent = useCallback((eventKey: StoryEventKey, ctx: { source: 'user_input' | 'scheduler_tick' }) => {
    const record = runEventStart(eventKey, {
      activeUsers: collectActiveUsers(state.messages),
      sendLine: (line, meta) => {
        const result = dispatchEventLine(line, meta.actor);
        return { ...result, lineId: meta.lineId };
      },
      canRunEvent: (activeUser) => {
        if (!appStarted) return 'app_not_started';
        if (chatAutoPaused) return 'chat_auto_paused';
        if (lockStateRef.current.isLocked && lockStateRef.current.target && lockStateRef.current.target !== activeUser) return 'locked_target_only';
        return null;
      },
      setLock: (actor) => {
        lockStateRef.current = { isLocked: true, target: actor, startedAt: Date.now() };
      },
      getRecentEventLineIds: (key) => eventRecentContentIdsRef.current[key],
      rememberEventLineId: (key, lineId) => {
        eventRecentContentIdsRef.current[key] = [...eventRecentContentIdsRef.current[key], lineId].slice(-5);
      },
      onEventRecord: (nextRecord) => {
        eventLifecycleRef.current = nextRecord;
      }
    });

    eventLastReasonRef.current = ctx.source === 'scheduler_tick' ? 'SCHEDULER_TICK' : 'TIMER_TICK';
    eventLastKeyRef.current = eventKey;
    eventLastAtRef.current = Date.now();
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEvent: {
          key: eventKey,
          eventId: record.eventId,
          at: record.at,
          reason: eventLastReasonRef.current,
          state: record.state,
          starterTagSent: record.starterTagSent,
          abortedReason: record.abortedReason,
          openerLineId: record.openerLineId,
          followUpLineId: record.followUpLineId,
          lineIds: record.lineIds,
          topic: record.topic
        }
      },
      violation: record.state === 'aborted' ? `event_aborted:${record.abortedReason ?? 'unknown'}` : window.__CHAT_DEBUG__?.violation
    } as Partial<NonNullable<Window['__CHAT_DEBUG__']>>);

    const target = lockStateRef.current.target ?? '';
    return record.state === 'aborted' ? null : { eventId: record.eventId, target };
  }, [appStarted, chatAutoPaused, dispatchEventLine, state.messages, updateEventDebug]);

  const postFollowUpLine = useCallback((target: string, eventKey: StoryEventKey, phase: Exclude<EventLinePhase, 'opener'> = 'followUp') => {
    const built = buildEventLine(eventKey, phase, target);
    const sent = dispatchEventLine(built.line, target);
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

  const tryTriggerStoryEvent = useCallback((raw: string, source: 'user_input' | 'scheduler_tick' = 'user_input') => {
    const now = Date.now();
    const activeUsers = collectActiveUsers(state.messages);
    const target = activeUsers.length > 0 ? pickOne(activeUsers) : null;
    const pending = pendingReplyEventRef.current;
    const isLocked = lockStateRef.current.isLocked && Boolean(lockStateRef.current.target);

    if (!appStarted) return;

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
        lockStateRef.current = { isLocked: false, target: null, startedAt: 0 };
      }
      if (pending.key === 'TV_EVENT' && repliedNo) {
        requestSceneAction({ type: 'REQUEST_SCENE_SWITCH', sceneKey: 'oldhouse_room_loop2', reason: reasonBase, delayMs: 2000 });
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
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0 };
      pendingReplyEventRef.current = null;
      return;
    }

    if (pending && now > pending.expiresAt) {
      if (eventLifecycleRef.current) {
        eventLifecycleRef.current.state = 'done';
        eventLifecycleRef.current.at = Date.now();
      }
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0 };
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
      if (activeUsers.length < def.minActiveUsers) continue;
      if (!can(key)) continue;
      if (key === 'GHOST_PING' && (cooldownsRef.current.ghost_ping_actor ?? 0) > now) continue;
      if (key === 'TV_EVENT' && (cooldownsRef.current.loop4 ?? 0) > now) continue;
      if (Math.random() >= def.chance) continue;
      const started = startEvent(key, { source });
      eventCooldownsRef.current[key] = now + def.cooldownMs;
      if (!started) return;
      if (def.lockOnStart && started.target) lockStateRef.current = { isLocked: true, target: started.target, startedAt: now };
      if (key === 'LIGHT_GLITCH') {
        requestSceneAction({ type: 'REQUEST_SCENE_SWITCH', sceneKey: Math.random() < 0.5 ? 'oldhouse_room_loop' : 'oldhouse_room_loop2', reason: `event:${started.eventId}` });
        triggerReactionBurst('light');
        if (eventLifecycleRef.current) {
          eventLifecycleRef.current.state = 'done';
          eventLifecycleRef.current.topic = 'light';
        }
      } else {
        pendingReplyEventRef.current = { key, target: started.target || target, eventId: started.eventId, expiresAt: now + 20_000 };
      }
      if (key === 'TV_EVENT') cooldownsRef.current.loop4 = now + 90_000;
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
        dispatchAudienceMessage(message);
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
      dispatchAudienceMessage({
        id: crypto.randomUUID(),
        username: pickOne(usernames),
        text: fallback,
        language: 'zh',
        translation: fallback,
        type: 'chat'
      });
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
          }
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
              dispatchAudienceMessage({
                id: crypto.randomUUID(),
                type: 'system',
                subtype: 'join',
                username: 'system',
                text: `${username} 加入聊天室`,
                language: 'zh'
              });
            }, delayMs);
            burstTimers.push(burstTimer);
          }
        } else {
          const username = pickOne(usernames);
          const normalJoinBoost = randomInt(1, 3);

          setViewerCount((value) => Math.min(99_999, value + normalJoinBoost));
          dispatchAudienceMessage({
            id: crypto.randomUUID(),
            type: 'system',
            subtype: 'join',
            username: 'system',
            text: `${username} 加入聊天室`,
            language: 'zh'
          });
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
    dispatchAudienceMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '畫面已準備完成',
      language: 'zh'
    });
    dispatchAudienceMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '初始化完成',
      language: 'zh'
    });
  }, [loadingState]);

  useEffect(() => {
    if (!isReady || !appStarted || !hasOptionalAssetWarning || postedOptionalAssetWarningMessage.current) return;
    postedOptionalAssetWarningMessage.current = true;
    dispatchAudienceMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '部分非必要素材載入失敗，遊戲可正常進行。',
      language: 'zh'
    });
  }, [appStarted, hasOptionalAssetWarning, isReady]);


  const hasFatalInitError = requiredAssetErrors.length > 0;
  const isLoading = !hasFatalInitError && (!isReady || !isRendererReady);
  const shouldShowMainContent = true;
  const debugEnabled = isDebugRoute || new URLSearchParams(window.location.search).get('debug') === '1';
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [mentionTarget, setMentionTarget] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [debugComposingOverride, setDebugComposingOverride] = useState<boolean | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{ reason: string; at: number } | null>(null);
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const activeUsers = collectActiveUsers(state.messages);
      const nextDueAt = Math.max(now, eventNextDueAtRef.current || now);
      const schedulerBlockedReason = !appStarted ? 'app_not_started' : (lockStateRef.current.isLocked ? 'lock_active' : '-');
      const schedulerBlocked = schedulerBlockedReason !== '-';
      const snapshot = {
        registry: {
          count: EVENT_REGISTRY_KEYS.length,
          keys: EVENT_REGISTRY_KEYS.slice(0, 20),
          enabledCount: EVENT_REGISTRY_KEYS.length,
          disabledCount: 0
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
          abortedReason: eventLifecycleRef.current?.abortedReason,
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
          schedulerBlockedReason
        },
        cooldowns: { ...cooldownsRef.current, ...eventCooldownsRef.current }
      };

      updateChatDebug({
        event: snapshot,
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          autoPaused: chatAutoPaused,
          autoPausedReason: chatAutoPaused ? (window.__CHAT_DEBUG__?.ui?.send?.blockedReason ?? 'manual_or_unknown') : '-',
          activeUsers: {
            count: activeUsers.length,
            nameSample: activeUsers.slice(0, 6),
            namesSample: activeUsers.slice(0, 6)
          }
        }
      } as Partial<NonNullable<Window['__CHAT_DEBUG__']>>);
      syncChatEngineDebug();
    }, 600);
    return () => window.clearInterval(timer);
  }, [appStarted, chatAutoPaused, state.messages, syncChatEngineDebug, updateChatDebug]);

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
      const next = { ...attemptDebug, lastResult: 'sent' as const };
      setSendDebug(next);
      logSendDebug('sent', { source, mode, autoResumed: chatAutoPaused });
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
        dispatchAudienceMessage({
          id: crypto.randomUUID(),
          type: 'system',
          username: 'system',
          text: '聲音已啟用',
          language: 'zh'
        });
      }

      const playableConsonant = resolvePlayableConsonant(state.currentConsonant.letter);

      dispatch({ type: 'PLAYER_MESSAGE', payload: createPlayerMessage(raw) });

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
        dispatchAudienceMessage(vipReply);
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

      const tagTarget = raw.match(/@([\w_]+)/)?.[1] ?? null;
      if (lockStateRef.current.isLocked && lockStateRef.current.target && tagTarget && tagTarget !== lockStateRef.current.target) {
        return markBlocked('lock_target_mismatch');
      }
      tryTriggerStoryEvent(raw, 'user_input');
      const chats = chatEngineRef.current.emit({ type: 'USER_SENT', text: raw, user: 'you' }, Date.now());
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
  }, [appStarted, chatAutoPaused, debugComposingOverride, isComposing, isReady, isSending, logSendDebug, mentionTarget, replyTarget, sendDebug, state, tryTriggerStoryEvent, updateChatDebug]);

  const submit = useCallback((source: SendSource) => {
    if (source === 'submit') {
      setSendDebug((prev) => ({ ...prev, lastSubmitAt: Date.now() }));
      logSendDebug('submit', { source });
    }
    return submitChat(input, source);
  }, [input, logSendDebug, submitChat]);


  useEffect(() => {
    tagSlowActiveRef.current = Boolean(replyTarget || mentionTarget);
  }, [mentionTarget, replyTarget]);

  const handleSendButtonClick = useCallback(() => {
    setSendDebug((prev) => ({ ...prev, lastClickAt: Date.now() }));
    logSendDebug('click', { source: 'button' });
  }, [logSendDebug]);

  const forceEventNow = useCallback(() => {
    const activeUsers = collectActiveUsers(state.messages);
    const target = activeUsers[0];
    if (!target) {
      eventGateRejectSummaryRef.current = { need_activeUsers: 1 };
      eventLastCandidateCountRef.current = 0;
      eventLastComputedAtRef.current = Date.now();
      return;
    }
    startEvent('NAME_CALL', { source: 'scheduler_tick' });
  }, [startEvent, state.messages]);

  const forceTagLock = useCallback(() => {
    const activeUsers = collectActiveUsers(state.messages);
    const target = activeUsers[0] ?? null;
    if (!target) return;
    lockStateRef.current = { isLocked: true, target, startedAt: Date.now() };
  }, [state.messages]);

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
          <LiveHeader viewerCountLabel={formatViewerCount(viewerCount)} />
          <a className="debug-route-link" href={isDebugRoute ? '/' : '/debug?debug=1'}>{isDebugRoute ? 'Back' : 'Open Debug'}</a>
        </header>
        <section ref={videoRef} tabIndex={-1} className={`video-area video-container ${isDesktopLayout ? 'videoViewportDesktop' : 'videoViewportMobile'}`}>
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
                    const name = startNameInput.trim();
                    if (!name) return;
                    setActiveUser(name);
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
          />
        </section>
        {isDebugRoute && debugEnabled && (
          <aside className="debug-route-panel">
            <h3>Debug Snapshot</h3>
            <div className="debug-route-controls">
              <button type="button" onClick={forceEventNow}>Force Event Now</button>
              <button type="button" onClick={forceTagLock}>Force Tag Lock</button>
              <button type="button" onClick={() => requestSceneAction({ type: 'DEBUG_RESCHEDULE_JUMP' })}>Reschedule</button>
              <button type="button" onClick={() => requestSceneAction({ type: 'DEBUG_FORCE_JUMP_NOW' })}>Force Jump Now</button>
            </div>
            <pre>{JSON.stringify(window.__CHAT_DEBUG__ ?? {}, null, 2)}</pre>
          </aside>
        )}
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
