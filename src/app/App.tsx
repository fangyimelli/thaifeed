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
import { EventEngine } from '../director/EventEngine';
import { ChatEngine } from '../chat/ChatEngine';

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
  const chatEngineRef = useRef(new ChatEngine());
  const eventEngineRef = useRef(new EventEngine({
    playSfx: (sfxKey, reason, delayMs) => requestSceneAction({ type: 'REQUEST_SFX', sfxKey, reason, delayMs }),
    requestSceneSwitch: (sceneKey, reason, delayMs) => requestSceneAction({ type: 'REQUEST_SCENE_SWITCH', sceneKey, reason, delayMs })
  }));


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
    dispatch({ type: 'AUDIENCE_MESSAGE', payload: message });
  };

  const emitChatEvent = (event: Parameters<ChatEngine['emit']>[0]) => {
    const chats = chatEngineRef.current.emit(event, Date.now());
    chats.forEach(dispatchAudienceMessage);
  };

  const emitEvent = (eventKey: string, context: { tagTarget?: string; lockTarget?: string } = {}) => {
    eventEngineRef.current.trigger(eventKey, { messages: state.messages, ...context });
    const pendingContent = eventEngineRef.current.drainPendingContent();
    pendingContent.forEach((payload) => chatEngineRef.current.enqueueContent(payload));
    const eventDebug = eventEngineRef.current.getDebugState() as unknown as Window['__CHAT_DEBUG__'];
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      ...eventDebug,
      ui: window.__CHAT_DEBUG__?.ui
    };
  };

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
    if (!isReady || chatAutoPaused) return;
    let timer = 0;
    const nextInterval = () => {
      const low = Math.max(900, 2200 - Math.floor(state.curse * 7));
      const high = Math.max(1800, 5200 - Math.floor(state.curse * 20));
      return randomInt(low, high);
    };
    const tick = () => {
      const timedChats = chatEngineRef.current.tick(Date.now());
      timedChats.forEach(dispatchAudienceMessage);
      emitChatEvent({ type: 'IDLE_TICK' });
      emitEvent('IDLE_TICK');
      timer = window.setTimeout(tick, nextInterval());
    };
    timer = window.setTimeout(tick, nextInterval());
    return () => window.clearTimeout(timer);
  }, [isReady, chatAutoPaused, state.curse, state.messages]);

  useEffect(() => {
    const unsubscribe = onSceneEvent((event) => {
      if (event.type === 'VIDEO_ACTIVE') {
        currentVideoKeyRef.current = event.key;
        emitChatEvent({ type: 'SCENE_SWITCH', toKey: event.key });
        emitEvent('SCENE_SWITCH_REACT');
      }
      if (event.type === 'SFX_START') {
        const sfxKey = event.sfxKey === 'fan_loop' ? 'fan' : event.sfxKey === 'footsteps' ? 'footsteps' : 'ghost';
        emitChatEvent({ type: 'SFX_START', sfxKey });
        const eventMap: Record<string, string> = {
          fan_loop: 'SFX_FAN_REACT',
          footsteps: 'SFX_FOOTSTEPS_REACT',
          ghost_female: 'SFX_GHOST_REACT'
        };
        emitEvent(eventMap[event.sfxKey] ?? 'IDLE_TICK');
      }
    });

    return () => unsubscribe();
  }, [state.messages]);

  useEffect(() => {
    if (!isReady) return;

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
  }, [state.curse, isReady]);

  useEffect(() => {
    if (!isReady) return;

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
  }, [loadingState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isReady) return;
      const now = Date.now();
      if (now - lastInputTimestamp.current <= 15_000) return;
      if (now - lastIdleCurseAt.current < 10_000) return;
      lastIdleCurseAt.current = now;
      dispatch({ type: 'INCREASE_CURSE_IDLE', payload: { amount: 2 } });
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [loadingState]);


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
    if (!isReady || !hasOptionalAssetWarning || postedOptionalAssetWarningMessage.current) return;
    postedOptionalAssetWarningMessage.current = true;
    dispatchAudienceMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '部分非必要素材載入失敗，遊戲可正常進行。',
      language: 'zh'
    });
  }, [hasOptionalAssetWarning, isReady]);


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
            canSendComputed: isReady && !isSending && input.trim().length > 0 && !chatAutoPaused && !(debugComposingOverride ?? isComposing)
          }
        }
      }
    });
  }, [chatAutoPaused, debugComposingOverride, input, isComposing, isReady, isSending, mentionTarget, replyTarget, sendDebug, updateChatDebug]);

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
    if (chatAutoPaused) return markBlocked('chat_auto_paused');
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
        const next = { ...attemptDebug, lastResult: 'sent' as const };
        setSendDebug(next);
        logSendDebug('sent', { source, mode: 'pass' });
        return { ok: true, status: 'sent' };
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
        const next = { ...attemptDebug, lastResult: 'sent' as const };
        setSendDebug(next);
        logSendDebug('sent', { source, mode: 'hint' });
        return { ok: true, status: 'sent' };
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
        const next = { ...attemptDebug, lastResult: 'sent' as const };
        setSendDebug(next);
        logSendDebug('sent', { source, mode: 'answer_correct' });
        return { ok: true, status: 'sent' };
      }

      const speechHit = parsePlayerSpeech(raw);
      const now = Date.now();
      const canTriggerSpeech = Boolean(speechHit) && now >= speechCooldownUntil.current;
      if (canTriggerSpeech) {
        speechCooldownUntil.current = now + 10_000;
      }

      const tagTarget = raw.match(/@([\w_]+)/)?.[1];
      if (tagTarget) emitEvent('LOCK_START', { tagTarget, lockTarget: tagTarget });
      emitEvent('USER_SENT', { tagTarget });
      const chats = chatEngineRef.current.emit({ type: 'USER_SENT', text: raw, user: 'you' }, Date.now());
      const wrongMessage = chats[0] ?? { id: crypto.randomUUID(), username: 'chat_mod', text: '這下壓力又上來了', language: 'zh', translation: '這下壓力又上來了' };
      dispatch({
        type: 'ANSWER_WRONG',
        payload: { message: wrongMessage }
      });
      setInput('');
      sendCooldownUntil.current = Date.now() + 350;
      const next = { ...attemptDebug, lastResult: 'sent' as const };
      setSendDebug(next);
      logSendDebug('sent', { source, mode: 'answer_wrong' });
      return { ok: true, status: 'sent' };
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
  }, [chatAutoPaused, debugComposingOverride, emitEvent, isComposing, isReady, isSending, logSendDebug, mentionTarget, replyTarget, sendDebug, state, updateChatDebug]);

  const submit = useCallback((source: SendSource) => {
    if (source === 'submit') {
      setSendDebug((prev) => ({ ...prev, lastSubmitAt: Date.now() }));
      logSendDebug('submit', { source });
    }
    return submitChat(input, source);
  }, [input, logSendDebug, submitChat]);

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
        <section ref={videoRef} className={`video-area video-container ${isDesktopLayout ? 'videoViewportDesktop' : 'videoViewportMobile'}`}>
          {!hasFatalInitError ? (
            <SceneView
              targetConsonant={state.currentConsonant.letter}
              curse={state.curse}
              anchor={state.currentAnchor}
              isDesktopLayout={isDesktopLayout}
            />
          ) : (
            <div className="asset-warning scene-placeholder">
              初始化失敗：必要素材缺失（素材未加入專案或 base path 設定錯誤），請開啟 Console 檢查 missing 清單。
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
