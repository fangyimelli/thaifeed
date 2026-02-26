import { useEffect, useReducer, useRef, useState } from 'react';
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
import LoadingOverlay from '../ui/hud/LoadingOverlay';
import { preloadAssets } from '../utils/preload';
import { Renderer2D } from '../renderer/renderer-2d/Renderer2D';
import { pickOne } from '../utils/random';
import { collectActiveUsers } from '../core/systems/mentionV2';

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
  const [isReady, setIsReady] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [hasOptionalAssetWarning, setHasOptionalAssetWarning] = useState(false);
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

      const loadingStart = performance.now();
      const result = await preloadAssets(ASSET_MANIFEST, {
        onProgress: () => undefined
      });

      if (isCancelled) return;

      const renderer = new Renderer2D();
      renderer.mount();
      setIsRendererReady(true);

      const elapsed = performance.now() - loadingStart;
      const minimumLoadingMs = 800;
      if (elapsed < minimumLoadingMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minimumLoadingMs - elapsed));
      }

      if (isCancelled) return;

      if (result.requiredErrors.length === 0) {
        setHasOptionalAssetWarning(result.optionalErrors.length > 0);
        setIsReady(true);
      }
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
        activeUsers
      ));
      timer = window.setTimeout(tick, getAudienceIntervalMs(state.curse));
    };

    timer = window.setTimeout(tick, getAudienceIntervalMs(state.curse));
    return () => window.clearTimeout(timer);
  }, [state.curse, state.currentConsonant.letter, state.currentAnchor, isReady, chatAutoPaused]);

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
  }, [isReady]);

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
  }, [isReady]);

  useEffect(() => {
    if (!isReady || postedInitMessages.current) return;
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
      text: '系統初始化完成',
      language: 'zh'
    });
  }, [isReady]);

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


  const isLoading = !isReady || !isRendererReady;

  const submit = () => {
    if (!isReady) return;
    const raw = input.trim();
    if (!raw || chatAutoPaused) return;
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
      activeUsers
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
  };

  return (
    <div className="app-shell">
      <LoadingOverlay visible={isLoading} />
      <main className="app-layout">
        <div className="live-top">
          <div className="mobile-frame">
            <LiveHeader viewerCountLabel={formatViewerCount(viewerCount)} />
            <div className="video-stage">
              <div className="video-container">
                <SceneView
                  targetConsonant={state.currentConsonant.letter}
                  curse={state.curse}
                  anchor={state.currentAnchor}
                />
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
          />
        </div>
      </main>
    </div>
  );
}
