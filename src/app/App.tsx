import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ASSET_MANIFEST } from '../config/assetManifest';
import { gameReducer, initialState } from '../core/state/reducer';
import { isAnswerCorrect } from '../core/systems/answerParser';
import { resolvePlayableConsonant } from '../core/systems/consonantSelector';
import { parsePlayerSpeech } from '../core/systems/playerSpeechParser';
import {
  createAudienceMessage,
  createDonateChatMessage,
  createFakeAiAudienceMessage,
  createPlayerMessage,
  createSuccessMessage,
  createWrongMessage,
  createPlayerSpeechResponses,
  getAudienceIntervalMs,
  hardenMentionsBeforeRender
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
import { collectActiveUsers } from '../core/systems/mentionV2';
import { MAIN_LOOP } from '../config/oldhousePlayback';
import { onSceneEvent } from '../core/systems/sceneEvents';
import type { ChatTopicContext } from '../core/systems/chatSystem';

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
  const burstCooldownUntil = useRef(0);
  const speechCooldownUntil = useRef(0);
  const lastInputTimestamp = useRef(Date.now());
  const lastIdleCurseAt = useRef(0);
  const postedInitMessages = useRef(false);
  const postedOptionalAssetWarningMessage = useRef(false);
  const soundUnlocked = useRef(false);
  const nonVipMessagesSinceLastVip = useRef(2);
  const currentVideoKeyRef = useRef<string>(MAIN_LOOP);
  const topicModeRef = useRef<ChatTopicContext['topicMode']>('CALM_PARANOIA');
  const lightFearTimerRef = useRef<number | null>(null);
  const fearEndTimerRef = useRef<number | null>(null);

  const clearLightFearTimer = useCallback(() => {
    if (lightFearTimerRef.current) {
      window.clearTimeout(lightFearTimerRef.current);
      lightFearTimerRef.current = null;
    }
  }, []);

  const clearFearEndTimer = useCallback(() => {
    if (fearEndTimerRef.current) {
      window.clearTimeout(fearEndTimerRef.current);
      fearEndTimerRef.current = null;
    }
  }, []);

  const getTopicContext = useCallback((): ChatTopicContext => ({
    currentVideoKey: currentVideoKeyRef.current,
    topicMode: topicModeRef.current
  }), []);

  const getActiveUsersSnapshot = () => collectActiveUsers(state.messages);

  const dispatchAudienceMessage = (message: ChatMessage) => {
    const activeUsers = getActiveUsersSnapshot();
    dispatch({ type: 'AUDIENCE_MESSAGE', payload: hardenMentionsBeforeRender(message, activeUsers) });
  };

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
        console.error('[asset-required] 素材未加入專案或 base path 解析錯誤', missingRequired);
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
      const minimumLoadingMs = 800;
      if (elapsed < minimumLoadingMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minimumLoadingMs - elapsed));
      }

      if (isCancelled) return;

      setHasOptionalAssetWarning(result.optionalErrors.length > 0);
      if (result.requiredErrors.length > 0) {
        const preloadMissing = result.requiredErrors.map((url) => ({
          name: 'preload_failure',
          type: 'video' as const,
          relativePath: 'unknown',
          url,
          reason: 'preload failed after required-asset verification'
        }));
        setRequiredAssetErrors(preloadMissing);
        console.error('[asset-required] 預載失敗', preloadMissing);
        setInitStatusText('必要素材預載失敗，請檢查 Console');
        return;
      }

      setInitStatusText('初始化完成');
      setIsReady(true);
    };

    void runSetup();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || chatAutoPaused) return;

    let timer = 0;
    const tick = () => {
      const activeUsers = getActiveUsersSnapshot();
      dispatchAudienceMessage(createAudienceMessage(
        state.curse,
        state.currentAnchor,
        state.messages.slice(-12).map((message) => message.translation ?? message.text),
        activeUsers,
        getTopicContext()
      ));
      timer = window.setTimeout(tick, getAudienceIntervalMs(state.curse, topicModeRef.current));
    };

    timer = window.setTimeout(tick, getAudienceIntervalMs(state.curse, topicModeRef.current));
    return () => window.clearTimeout(timer);
  }, [state.curse, state.currentConsonant.letter, state.currentAnchor, isReady, chatAutoPaused, getTopicContext]);

  useEffect(() => {
    const enterFearMode = () => {
      topicModeRef.current = 'LIGHT_FLICKER_FEAR';
      clearFearEndTimer();
      const fearDurationMs = randomInt(10_000, 12_000);
      fearEndTimerRef.current = window.setTimeout(() => {
        const currentKey = currentVideoKeyRef.current;
        topicModeRef.current = currentKey === MAIN_LOOP ? 'CALM_PARANOIA' : 'NORMAL';
        fearEndTimerRef.current = null;
      }, fearDurationMs);
    };

    const stopFearAndReset = () => {
      clearLightFearTimer();
      clearFearEndTimer();
      topicModeRef.current = 'CALM_PARANOIA';
    };

    const unsubscribe = onSceneEvent((event) => {
      if (event.type !== 'VIDEO_ACTIVE') return;
      currentVideoKeyRef.current = event.key;

      if (event.key === MAIN_LOOP) {
        stopFearAndReset();
        return;
      }

      if (event.key === 'oldhouse_room_loop' || event.key === 'oldhouse_room_loop2') {
        clearLightFearTimer();
        clearFearEndTimer();
        topicModeRef.current = 'NORMAL';
        lightFearTimerRef.current = window.setTimeout(() => {
          const currentKey = currentVideoKeyRef.current;
          const isInsertLoop = currentKey === 'oldhouse_room_loop' || currentKey === 'oldhouse_room_loop2';
          if (!isInsertLoop) return;
          enterFearMode();
          lightFearTimerRef.current = null;
        }, 5_000);
      }
    });

    return () => {
      unsubscribe();
      clearLightFearTimer();
      clearFearEndTimer();
    };
  }, [clearFearEndTimer, clearLightFearTimer]);

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


  const isLoading = !isReady || !isRendererReady || requiredAssetErrors.length > 0;
  const hasFatalInitError = requiredAssetErrors.length > 0;
  const shouldShowMainContent = isRendererReady || hasFatalInitError;

  const loadingErrorTitle = useMemo(() => {
    if (!hasFatalInitError) return undefined;
    return '初始化失敗：素材未加入專案或 base path 設定錯誤';
  }, [hasFatalInitError]);

  const submitChat = useCallback(async (rawText: string) => {
    if (!isReady || isSending) return;

    const raw = rawText.trim();
    if (!raw || chatAutoPaused) return;

    setIsSending(true);
    const submitDelayMs = randomInt(1000, 5000);

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
        return;
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
        return;
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

        dispatch({
          type: 'ANSWER_CORRECT',
          payload: {
            message: createSuccessMessage(state.currentAnchor, getActiveUsersSnapshot()),
            donateMessage: createDonateChatMessage(donate)
          }
        });
        setInput('');
        return;
      }

      const speechHit = parsePlayerSpeech(raw);
      const now = Date.now();
      const canTriggerSpeech = Boolean(speechHit) && now >= speechCooldownUntil.current;
      if (canTriggerSpeech) {
        speechCooldownUntil.current = now + 10_000;
        const activeUsers = getActiveUsersSnapshot();
        const speechResponses = createPlayerSpeechResponses(
          state.currentAnchor,
          state.messages.slice(-20).map((message) => message.translation ?? message.text),
          activeUsers
        );
        speechResponses.forEach((message) => {
          dispatchAudienceMessage(message);
        });
        setInput('');
        return;
      }

      const activeUsers = getActiveUsersSnapshot();
      const fakeAiBatch = createFakeAiAudienceMessage({
        playerInput: raw,
        targetConsonant: playableConsonant.letter,
        curse: state.curse,
        anchor: state.currentAnchor,
        recentHistory: state.messages.slice(-12).map((message) => message.translation ?? message.text),
        activeUsers,
        topicContext: getTopicContext()
      });

      fakeAiBatch.messages.forEach((message) => {
        dispatchAudienceMessage(message);
      });

      if (fakeAiBatch.pauseMs) {
        setChatAutoPaused(true);
        window.setTimeout(() => setChatAutoPaused(false), fakeAiBatch.pauseMs);
        setInput('');
        return;
      }

      const wrongMessage = createWrongMessage(state.curse, state.currentAnchor, getActiveUsersSnapshot());
      dispatch({
        type: 'ANSWER_WRONG',
        payload: {
          message: wrongMessage
        }
      });
      setInput('');
    } finally {
      setIsSending(false);
    }
  }, [chatAutoPaused, isReady, isSending, state, getTopicContext]);

  const submit = useCallback(() => {
    void submitChat(input);
  }, [input, submitChat]);

  return (
    <div className="app-shell">
      <LoadingOverlay
        visible={isLoading}
        progress={loadingProgress}
        statusText={initStatusText}
        errorTitle={loadingErrorTitle}
        errors={requiredAssetErrors.map(formatMissingAsset)}
      />
      {shouldShowMainContent && (
      <main className="app-layout">
        <div className="live-top">
          <div className="mobile-frame">
            <LiveHeader viewerCountLabel={formatViewerCount(viewerCount)} />
            <div className="video-stage">
              <div className="video-container">
                {!hasFatalInitError ? (
                  <SceneView
                    targetConsonant={state.currentConsonant.letter}
                    curse={state.curse}
                    anchor={state.currentAnchor}
                  />
                ) : (
                  <div className="asset-warning scene-placeholder">
                    初始化失敗：必要素材缺失（素材未加入專案或 base path 設定錯誤），請開啟 Console 檢查 missing 清單。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="chat-container">
          <ChatPanel
            messages={state.messages}
            input={input}
            onChange={(value) => {
              setInput(value);
            }}
            onSubmit={submit}
            onToggleTranslation={(id) => dispatch({ type: 'TOGGLE_CHAT_TRANSLATION', payload: { id } })}
            onAutoPauseChange={setChatAutoPaused}
            isSending={isSending}
          />
        </div>
      </main>
      )}
    </div>
  );
}
