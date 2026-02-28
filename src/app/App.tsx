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

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

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

type StoryEventKey =
  | 'VOICE_CONFIRM'
  | 'GHOST_PING'
  | 'TV_EVENT'
  | 'NAME_CALL'
  | 'VIEWER_SPIKE'
  | 'LIGHT_GLITCH'
  | 'FEAR_CHALLENGE';

type EventLinePhase = 'opener' | 'followUp';
type EventLineOption = { id: string; text: string };

const STORY_EVENT_CONTENT: Record<StoryEventKey, { opener: EventLineOption[]; followUp?: EventLineOption[] }> = {
  VOICE_CONFIRM: {
    opener: [
      { id: 'voice_open_1', text: '你那邊有開聲音嗎' },
      { id: 'voice_open_2', text: '你現在有聽到什麼嗎' },
      { id: 'voice_open_3', text: '你有開喇叭嗎' },
      { id: 'voice_open_4', text: '你有戴耳機嗎' },
      { id: 'voice_open_5', text: '你那邊是不是有聲音' }
    ],
    followUp: [
      { id: 'voice_follow_1', text: '我剛剛好像聽到東西' },
      { id: 'voice_follow_2', text: '你那邊是不是有怪聲' },
      { id: 'voice_follow_3', text: '好像不是風聲' },
      { id: 'voice_follow_4', text: '剛剛那個不是我吧' },
      { id: 'voice_follow_5', text: '那聲音不是聊天室的' }
    ]
  },
  GHOST_PING: {
    opener: [{ id: 'ghost_ping_open_1', text: '你還在嗎' }],
    followUp: [{ id: 'ghost_ping_follow_1', text: '你有聽到我的聲音嗎 我說了什麼' }]
  },
  TV_EVENT: {
    opener: [
      { id: 'tv_open_1', text: '電視是不是動了一下' },
      { id: 'tv_open_2', text: '你有看到畫面怪怪的嗎' },
      { id: 'tv_open_3', text: '剛剛那邊是不是有閃' },
      { id: 'tv_open_4', text: '那個角落是不是有影子' },
      { id: 'tv_open_5', text: '剛剛是不是晃了一下' }
    ],
    followUp: [
      { id: 'tv_follow_1', text: '你真的沒看到嗎' },
      { id: 'tv_follow_2', text: '不對 那不是我眼花' },
      { id: 'tv_follow_3', text: '那個不是正常的吧' },
      { id: 'tv_follow_4', text: '剛剛那個是什麼' },
      { id: 'tv_follow_5', text: '你沒看到我嗎' }
    ]
  },
  NAME_CALL: {
    opener: [
      { id: 'name_open_1', text: '剛剛有人叫你名字' },
      { id: 'name_open_2', text: '你有聽到有人叫你嗎' },
      { id: 'name_open_3', text: '好像有人在喊你' },
      { id: 'name_open_4', text: '那聲音是不是在叫你' },
      { id: 'name_open_5', text: '你剛剛有聽到自己的名字嗎' }
    ]
  },
  VIEWER_SPIKE: {
    opener: [
      { id: 'viewer_open_1', text: '人數是不是跳了一下' },
      { id: 'viewer_open_2', text: '剛剛觀看數怪怪的' },
      { id: 'viewer_open_3', text: '那個數字是不是動了' },
      { id: 'viewer_open_4', text: '我剛剛看到人數變化' },
      { id: 'viewer_open_5', text: '好像有人突然進來' }
    ]
  },
  LIGHT_GLITCH: {
    opener: [
      { id: 'light_open_1', text: '燈是不是怪怪的' },
      { id: 'light_open_2', text: '你有看到亮度變嗎' },
      { id: 'light_open_3', text: '剛剛是不是暗了一下' },
      { id: 'light_open_4', text: '那盞燈是不是在動' },
      { id: 'light_open_5', text: '我怎麼覺得亮度不對' }
    ]
  },
  FEAR_CHALLENGE: {
    opener: [
      { id: 'fear_open_1', text: '你怕嗎' },
      { id: 'fear_open_2', text: '你現在會怕嗎' },
      { id: 'fear_open_3', text: '這樣你不會怕嗎' },
      { id: 'fear_open_4', text: '你真的不怕嗎' },
      { id: 'fear_open_5', text: '你心跳有變快嗎' }
    ],
    followUp: [
      { id: 'fear_follow_1', text: '我好像聽到聲音' },
      { id: 'fear_follow_2', text: '等一下 那是什麼' },
      { id: 'fear_follow_3', text: '剛剛那個不是我' },
      { id: 'fear_follow_4', text: '我不太對勁' },
      { id: 'fear_follow_5', text: '好像有人在走' }
    ]
  }
};

function formatMissingAsset(asset: MissingRequiredAsset) {
  return `[${asset.type}] ${asset.name} | ${asset.relativePath} | ${asset.url} | ${asset.reason}`;
}

function isPassCommand(raw: string) {
  const normalized = raw.trim().toLowerCase();
  return normalized === 'pass' || raw.trim() === '跳過';
}

function nextLeaveDelayMs() {
  return randomInt(30_000, 45_000);
}

const DESKTOP_BREAKPOINT = 1024;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('BOOT_START');
  const [hasOptionalAssetWarning, setHasOptionalAssetWarning] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initStatusText, setInitStatusText] = useState('初始化中');
  const [requiredAssetErrors, setRequiredAssetErrors] = useState<MissingRequiredAsset[]>([]);
  const [chatAutoPaused, setChatAutoPaused] = useState(false);
  const [appStarted, setAppStarted] = useState(false);
  const [activeUser, setActiveUser] = useState('');
  const [startNameInput, setStartNameInput] = useState('');
  const [chatTickRestartKey, setChatTickRestartKey] = useState(0);
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
  const pendingReplyEventRef = useRef<{ key: StoryEventKey; target: string; expiresAt: number } | null>(null);
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

  const syncChatEngineDebug = () => {
    const engineDebug = chatEngineRef.current.getDebugState() as {
      lint?: { lastRejectedText?: string; lastRejectedReason?: string; rerollCount?: number };
    };
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      chat: {
        ...(window.__CHAT_DEBUG__?.chat ?? {}),
        lint: {
          lastRejectedText: engineDebug.lint?.lastRejectedText ?? '-',
          lastRejectedReason: engineDebug.lint?.lastRejectedReason ?? '-',
          rerollCount: engineDebug.lint?.rerollCount ?? 0
        }
      }
    };
  };

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

  const triggerReactionBurst = useCallback((topic: 'ghost' | 'footsteps' | 'light') => {
    markEventTopicBoost(12_000);
    if (reactionBurstTimerRef.current) {
      window.clearTimeout(reactionBurstTimerRef.current);
      reactionBurstTimerRef.current = null;
    }
    const durationMs = randomInt(10_000, 12_000);
    const fireAt = Date.now() + randomInt(300, 1200);
    reactionBurstTimerRef.current = window.setTimeout(() => {
      reactionBurstTimerRef.current = null;
      if (topic === 'ghost') {
        emitChatEvent({ type: 'SFX_START', sfxKey: 'ghost' });
      } else if (topic === 'footsteps') {
        emitChatEvent({ type: 'SFX_START', sfxKey: 'footsteps' });
      } else {
        emitChatEvent({ type: 'SCENE_SWITCH', toKey: currentVideoKeyRef.current });
      }
    }, Math.max(0, fireAt - Date.now()));
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        scheduler: { ...(window.__CHAT_DEBUG__?.event?.scheduler ?? {}), lastFiredAt: fireAt, nextDueAt: fireAt + durationMs },
        lastEvent: `reaction:${topic}`
      }
    });
  }, [emitChatEvent, markEventTopicBoost, updateEventDebug]);

  const pickEventLine = useCallback((eventKey: StoryEventKey, phase: EventLinePhase): { option: EventLineOption; repeatBlocked: boolean } => {
    const fallback = { id: `${eventKey.toLowerCase()}_${phase}_fallback`, text: '等一下' };
    const options = STORY_EVENT_CONTENT[eventKey][phase] ?? [];
    if (options.length === 0) return { option: fallback, repeatBlocked: false };

    const eventRecent = eventRecentContentIdsRef.current[eventKey].slice(-5);
    const globalRecent = globalRecentContentIdsRef.current.slice(-10);
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    let repeatBlocked = false;

    for (const candidate of shuffled) {
      const eventRepeated = eventRecent.includes(candidate.id);
      const globalRepeated = globalRecent.includes(candidate.id);
      if (eventRepeated || globalRepeated) {
        repeatBlocked = true;
        continue;
      }
      return { option: candidate, repeatBlocked };
    }

    return { option: shuffled[0] ?? fallback, repeatBlocked: true };
  }, []);

  const postEventLine = useCallback((target: string, eventKey: StoryEventKey, phase: EventLinePhase) => {
    markEventTopicBoost(phase === 'opener' ? 12_000 : 8_000);
    const picked = pickEventLine(eventKey, phase);
    const loreLevel = state.curse >= 70 ? 3 : state.curse >= 40 ? 2 : 1;
    const lore = ghostLoreRef.current.inject({
      fragment: picked.option.text,
      level: loreLevel,
      activeUser
    });
    const line = lore.fragment;
    eventRecentContentIdsRef.current[eventKey] = [...eventRecentContentIdsRef.current[eventKey], picked.option.id].slice(-5);
    globalRecentContentIdsRef.current = [...globalRecentContentIdsRef.current, picked.option.id].slice(-10);
    updateEventDebug({
      lastContentId: picked.option.id,
      lastNameInjected: lore.lastNameInjected,
      contentRepeatBlocked: picked.repeatBlocked,
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEvent: `event:${eventKey}:${phase}`
      }
    });
    dispatchAudienceMessage({
      id: crypto.randomUUID(),
      username: 'mod_live',
      type: 'chat',
      text: `@${target} ${line}`,
      language: 'zh',
      translation: `@${target} ${line}`,
      tagTarget: target
    });
  }, [activeUser, dispatchAudienceMessage, pickEventLine, state.curse, updateEventDebug]);

  const playSfx = useCallback((
    key: 'ghost_female' | 'footsteps' | 'low_rumble' | 'fan_loop',
    options: { reason: string; source: 'event' | 'system' | 'unknown'; delayMs?: number; startVolume?: number; endVolume?: number; rampSec?: number }
  ) => {
    const now = Date.now();
    const cooldownMin = key === 'ghost_female' ? 180_000 : key === 'footsteps' || key === 'low_rumble' ? 120_000 : 0;
    if (key !== 'fan_loop') {
      const cooldownUntil = cooldownsRef.current[key] ?? 0;
      if (cooldownUntil > now) return false;
      cooldownsRef.current[key] = now + cooldownMin;
    }
    const violation = key === 'ghost_female' && options.source !== 'event';
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
    updateEventDebug({
      lastSfxKey: key,
      lastSfxReason: options.reason,
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        scheduler: { ...(window.__CHAT_DEBUG__?.event?.scheduler ?? {}), cooldowns: { ...cooldownsRef.current } },
        lastEvent: options.reason
      },
      lastGhostSfxReason: key === 'ghost_female' ? options.reason : window.__CHAT_DEBUG__?.lastGhostSfxReason,
      violation: violation ? `ghost_female source=${options.source}` : window.__CHAT_DEBUG__?.violation
    } as Partial<NonNullable<Window['__CHAT_DEBUG__']>>);
    return true;
  }, [updateEventDebug]);

  const tryTriggerStoryEvent = useCallback((raw: string) => {
    const now = Date.now();
    const activeUsers = collectActiveUsers(state.messages);
    const target = activeUsers.length > 0 ? pickOne(activeUsers) : null;
    const pending = pendingReplyEventRef.current;
    const isLocked = lockStateRef.current.isLocked && Boolean(lockStateRef.current.target);

    if (!appStarted) return;

    if (pending && now <= pending.expiresAt) {
      const repliedYes = /有/.test(raw);
      const repliedNo = /沒有/.test(raw);
      const repliedBrave = /不怕/.test(raw);
      if (pending.key === 'VOICE_CONFIRM' && repliedYes) {
        postEventLine(pending.target, 'VOICE_CONFIRM', 'followUp');
        playSfx('ghost_female', { reason: 'event:VOICE_CONFIRM', source: 'event', delayMs: 2000, startVolume: 0, endVolume: 1, rampSec: 3 });
        triggerReactionBurst('ghost');
      }
      if (pending.key === 'GHOST_PING') {
        playSfx('ghost_female', { reason: 'event:GHOST_PING', source: 'event', delayMs: 3000, startVolume: 1, endVolume: 1, rampSec: 0 });
        postEventLine(pending.target, 'GHOST_PING', 'followUp');
        triggerReactionBurst('ghost');
        cooldownsRef.current.ghost_ping_actor = now + randomInt(8 * 60_000, 12 * 60_000);
        lockStateRef.current = { isLocked: false, target: null, startedAt: 0 };
      }
      if (pending.key === 'TV_EVENT' && repliedNo) {
        requestSceneAction({ type: 'REQUEST_SCENE_SWITCH', sceneKey: 'oldhouse_room_loop2', reason: 'event:TV_EVENT', delayMs: 2000 });
        postEventLine(pending.target, 'TV_EVENT', 'followUp');
        triggerReactionBurst(Math.random() < 0.5 ? 'light' : 'ghost');
        if (Math.random() < 0.5 && (cooldownsRef.current.ghost_female ?? 0) <= now) {
          playSfx('ghost_female', { reason: 'event:TV_EVENT_OPTIONAL_GHOST', source: 'event', delayMs: 200, startVolume: 0.9, endVolume: 1, rampSec: 0.4 });
        }
      }
      if (pending.key === 'NAME_CALL') {
        playSfx('ghost_female', { reason: 'event:NAME_CALL', source: 'event', delayMs: 2000, startVolume: 0.8, endVolume: 1, rampSec: 0.2 });
        triggerReactionBurst('ghost');
      }
      if (pending.key === 'VIEWER_SPIKE') {
        playSfx('footsteps', { reason: 'event:VIEWER_SPIKE', source: 'event' });
        triggerReactionBurst('footsteps');
      }
      if (pending.key === 'FEAR_CHALLENGE' && repliedBrave) {
        const chooseGhost = Math.random() < 0.5;
        const played = chooseGhost
          ? playSfx('ghost_female', { reason: 'event:FEAR_CHALLENGE_GHOST', source: 'event', delayMs: 2000, startVolume: 0.95, endVolume: 1, rampSec: 0.2 })
          : playSfx('footsteps', { reason: 'event:FEAR_CHALLENGE_FOOTSTEPS', source: 'event', delayMs: 2000 });
        if (played) {
          postEventLine(pending.target, 'FEAR_CHALLENGE', 'followUp');
          triggerReactionBurst(chooseGhost ? 'ghost' : 'footsteps');
        }
      }
      pendingReplyEventRef.current = null;
      return;
    }

    if (!target || isLocked) return;
    const can = (key: StoryEventKey, cooldownMs: number) => (eventCooldownsRef.current[key] ?? 0) <= now && (eventCooldownsRef.current[key] = now + cooldownMs, true);

    if (activeUsers.length >= 1 && Math.random() < 0.08 && can('VOICE_CONFIRM', 90_000)) {
      postEventLine(target, 'VOICE_CONFIRM', 'opener');
      pendingReplyEventRef.current = { key: 'VOICE_CONFIRM', target, expiresAt: now + 20_000 };
      return;
    }
    if (activeUsers.length >= 3 && (cooldownsRef.current.ghost_ping_actor ?? 0) <= now && Math.random() < 0.06 && can('GHOST_PING', 120_000)) {
      postEventLine(target, 'GHOST_PING', 'opener');
      lockStateRef.current = { isLocked: true, target, startedAt: now };
      pendingReplyEventRef.current = { key: 'GHOST_PING', target, expiresAt: now + 20_000 };
      return;
    }
    if (activeUsers.length >= 3 && (cooldownsRef.current.loop4 ?? 0) <= now && Math.random() < 0.07 && can('TV_EVENT', 90_000)) {
      postEventLine(target, 'TV_EVENT', 'opener');
      pendingReplyEventRef.current = { key: 'TV_EVENT', target, expiresAt: now + 20_000 };
      cooldownsRef.current.loop4 = now + 90_000;
      return;
    }
    if (Math.random() < 0.06 && can('NAME_CALL', 90_000)) {
      postEventLine(target, 'NAME_CALL', 'opener');
      pendingReplyEventRef.current = { key: 'NAME_CALL', target, expiresAt: now + 20_000 };
      return;
    }
    if (Math.random() < 0.06 && can('VIEWER_SPIKE', 90_000)) {
      postEventLine(target, 'VIEWER_SPIKE', 'opener');
      pendingReplyEventRef.current = { key: 'VIEWER_SPIKE', target, expiresAt: now + 20_000 };
      return;
    }
    if (Math.random() < 0.05 && can('LIGHT_GLITCH', 90_000)) {
      postEventLine(target, 'LIGHT_GLITCH', 'opener');
      requestSceneAction({ type: 'REQUEST_SCENE_SWITCH', sceneKey: Math.random() < 0.5 ? 'oldhouse_room_loop' : 'oldhouse_room_loop2', reason: 'event:LIGHT_GLITCH' });
      triggerReactionBurst('light');
      return;
    }
    if (Math.random() < 0.06 && can('FEAR_CHALLENGE', 90_000)) {
      postEventLine(target, 'FEAR_CHALLENGE', 'opener');
      pendingReplyEventRef.current = { key: 'FEAR_CHALLENGE', target, expiresAt: now + 20_000 };
    }
  }, [appStarted, playSfx, postEventLine, state.messages, triggerReactionBurst]);

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
    if (!isReady || chatAutoPaused || !appStarted) return;
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
      const lockScaled = lockStateRef.current.isLocked ? Math.floor(base * 2) : base;
      const scaled = mode === 'tag_slow' ? Math.floor(lockScaled * 2) : lockScaled;
      const transitionAt = mode === 'tag_slow' ? null : Math.min(pacingModeUntilRef.current, pacingNextModeFlipAtRef.current);
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
      const topicWeights = getCurrentTopicWeights(now);
      const timedChats = chatEngineRef.current.tick(now);
      dispatchTimedChats(timedChats);
      syncChatEngineDebug();
      emitChatEvent({ type: 'IDLE_TICK', topicWeights });
      if (Date.now() - lastChatMessageAtRef.current > 2500) {
        dispatchForcedBaseMessage();
      }
      timer = window.setTimeout(tick, nextInterval());
    };

    timer = window.setTimeout(tick, nextInterval());
    return () => window.clearTimeout(timer);
  }, [appStarted, chatAutoPaused, chatTickRestartKey, isReady]);

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
  const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
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
      tryTriggerStoryEvent(raw);
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
