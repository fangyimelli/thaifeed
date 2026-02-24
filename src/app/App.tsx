import { useEffect, useReducer, useState } from 'react';
import { ASSET_MANIFEST } from '../config/assetManifest';
import { gameReducer, initialState } from '../core/state/reducer';
import { isAnswerCorrect } from '../core/systems/answerParser';
import {
  createAudienceMessage,
  createFakeAiAudienceMessage,
  createPlayerMessage,
  createSuccessMessage,
  createWrongMessage,
  getAudienceIntervalMs
} from '../core/systems/chatSystem';
import { createVipAiReply, maybeCreateVipNormalMessage } from '../core/systems/vipSystem';
import type { DonateMessage } from '../core/state/types';
import donatePools from '../content/pools/donatePools.json';
import usernames from '../content/pools/usernames.json';
import LoadingScreen from '../ui/loading/LoadingScreen';
import ChatPanel from '../ui/chat/ChatPanel';
import DonateToast from '../ui/donate/DonateToast';
import SceneView from '../ui/scene/SceneView';
import { getCachedAsset, preloadAssets } from '../utils/preload';
import { pickOne } from '../utils/random';

const SFX_SRC = {
  typing: '/assets/sfx/sfx_typing.wav',
  send: '/assets/sfx/sfx_send.wav',
  success: '/assets/sfx/sfx_success.wav',
  error: '/assets/sfx/sfx_error.wav',
  glitch: '/assets/sfx/sfx_glitch.wav'
} as const;

function getSfxAudio(src: string) {
  const cached = getCachedAsset(src);
  if (cached instanceof HTMLAudioElement) return cached;

  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
}

function playSound(src: string) {
  const sound = getSfxAudio(src);
  sound.volume = 0.6;
  sound.currentTime = 0;
  void sound.play().catch(() => undefined);
}

function formatViewerCount(value: number) {
  if (value < 1000) return `${value}`;
  if (value < 10_000) return `${(value / 1000).toFixed(1)}K`;
  return `${Math.floor(value / 1000)}K`;
}

function computeViewerCount(curse: number) {
  const baseViewers = 600;
  const randomPart = Math.floor(Math.random() * (curse * 10 + 1));
  const raw = baseViewers + curse * 35 + randomPart;
  return Math.max(100, Math.min(99_999, raw));
}

function nextJoinDelayMs() {
  return 8_000 + Math.floor(Math.random() * 7_001);
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [input, setInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [requiredErrors, setRequiredErrors] = useState<string[]>([]);
  const [optionalErrors, setOptionalErrors] = useState<string[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const [showOptionalWarning, setShowOptionalWarning] = useState(false);
  const [chatAutoPaused, setChatAutoPaused] = useState(false);
  const [viewerCount, setViewerCount] = useState(() => computeViewerCount(initialState.curse));

  useEffect(() => {
    let isCancelled = false;

    const runPreload = async () => {
      setIsReady(false);
      setProgress(0);
      setRequiredErrors([]);
      setOptionalErrors([]);

      const result = await preloadAssets(ASSET_MANIFEST, {
        onProgress: (snapshot) => {
          if (isCancelled) return;
          setProgress(snapshot.progress);
          setRequiredErrors(snapshot.requiredErrors);
          setOptionalErrors(snapshot.optionalErrors);
        }
      });

      if (isCancelled) return;

      setRequiredErrors(result.requiredErrors);
      setOptionalErrors(result.optionalErrors);
      if (result.requiredErrors.length === 0) {
        setShowOptionalWarning(result.optionalErrors.length > 0);
        setIsReady(true);
      }
    };

    void runPreload();

    return () => {
      isCancelled = true;
    };
  }, [retryToken]);

  useEffect(() => {
    if (!isReady || chatAutoPaused) return;

    let timer = 0;
    const tick = () => {
      dispatch({ type: 'AUDIENCE_MESSAGE', payload: createAudienceMessage(
        state.curse,
        state.currentAnchor,
        state.messages.slice(-12).map((message) => message.translation ?? message.text)
      ) });
      const vipNormal = maybeCreateVipNormalMessage(input, state.curse, state.targetConsonant);
      if (vipNormal) dispatch({ type: 'AUDIENCE_MESSAGE', payload: vipNormal });
      timer = window.setTimeout(tick, getAudienceIntervalMs(state.curse));
    };

    timer = window.setTimeout(tick, getAudienceIntervalMs(state.curse));
    return () => window.clearTimeout(timer);
  }, [state.curse, state.targetConsonant, state.currentAnchor, input, isReady, chatAutoPaused]);

  useEffect(() => {
    if (!isReady) return;

    setViewerCount(computeViewerCount(state.curse));
    const timer = window.setInterval(() => {
      setViewerCount(computeViewerCount(state.curse));
    }, 5000);

    return () => window.clearInterval(timer);
  }, [state.curse, isReady]);

  useEffect(() => {
    if (!isReady) return;

    let timer = 0;

    const tick = () => {
      const baseChance = 0.35;
      const boostedChance = state.curse > 50 ? Math.min(0.95, baseChance * 1.5) : baseChance;

      if (Math.random() < boostedChance) {
        const username = pickOne(usernames);
        dispatch({
          type: 'AUDIENCE_MESSAGE',
          payload: {
            id: crypto.randomUUID(),
            type: 'system',
            subtype: 'join',
            username: 'system',
            text: `${username} 加入聊天室`,
            language: 'zh'
          }
        });
      }

      timer = window.setTimeout(tick, nextJoinDelayMs());
    };

    timer = window.setTimeout(tick, nextJoinDelayMs());
    return () => window.clearTimeout(timer);
  }, [state.curse, isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (state.curse > 80) playSound(SFX_SRC.glitch);
  }, [state.curse, isReady]);

  const submit = () => {
    const raw = input.trim();
    if (!raw || chatAutoPaused) return;

    playSound(SFX_SRC.send);
    dispatch({ type: 'PLAYER_MESSAGE', payload: createPlayerMessage(raw) });

    const fakeAiBatch = createFakeAiAudienceMessage({
      playerInput: raw,
      targetConsonant: state.targetConsonant,
      curse: state.curse,
      anchor: state.currentAnchor,
      recentHistory: state.messages.slice(-12).map((message) => message.translation ?? message.text)
    });

    fakeAiBatch.messages.forEach((message) => {
      dispatch({ type: 'AUDIENCE_MESSAGE', payload: message });
    });

    if (fakeAiBatch.pauseMs) {
      setChatAutoPaused(true);
      window.setTimeout(() => setChatAutoPaused(false), fakeAiBatch.pauseMs);
      setInput('');
      return;
    }

    if (isAnswerCorrect(raw, state.targetConsonant)) {
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
          message: createSuccessMessage(),
          donate
        }
      });
      const aiVip = createVipAiReply({
        input: raw,
        curse: state.curse,
        isCorrect: true,
        target: state.targetConsonant,
        vipType: 'VIP_NORMAL'
      });
      dispatch({ type: 'AUDIENCE_MESSAGE', payload: aiVip });
      playSound(SFX_SRC.success);
    } else {
      const wrongMessage = createWrongMessage(state.curse);
      const shouldForceVip = state.wrongStreak + 1 >= 3 && !state.vipStillHereTriggered;
      dispatch({
        type: 'ANSWER_WRONG',
        payload: {
          message: wrongMessage,
          vipMessage: shouldForceVip
            ? createVipAiReply({
                input: raw,
                curse: state.curse,
                isCorrect: false,
                target: state.targetConsonant,
                vipType: 'VIP_STILL_HERE'
              })
            : undefined
        }
      });
      playSound(SFX_SRC.error);
    }

    setInput('');
  };

  if (!isReady) {
    return (
      <LoadingScreen
        progress={progress}
        requiredErrors={requiredErrors}
        optionalErrors={optionalErrors}
        onRetry={() => setRetryToken((value) => value + 1)}
      />
    );
  }

  return (
    <div className="app-layout">
      {showOptionalWarning && (
        <div className="optional-asset-warning" role="status">
          部分非必要素材載入失敗，遊戲可正常進行。
          <button type="button" onClick={() => setShowOptionalWarning(false)}>
            關閉
          </button>
        </div>
      )}
      <SceneView
        targetConsonant={state.targetConsonant}
        curse={state.curse}
        anchor={state.currentAnchor}
        viewerCountLabel={formatViewerCount(viewerCount)}
      />
      <ChatPanel
        messages={state.messages}
        input={input}
        onChange={(value) => {
          setInput(value);
          playSound(SFX_SRC.typing);
        }}
        onSubmit={submit}
        onToggleTranslation={(id) => dispatch({ type: 'TOGGLE_CHAT_TRANSLATION', payload: { id } })}
        onAutoPauseChange={setChatAutoPaused}
      />
      <DonateToast
        toasts={state.donateToasts}
        onToggleTranslation={(id) => dispatch({ type: 'TOGGLE_DONATE_TRANSLATION', payload: { id } })}
        onDismiss={(id) => dispatch({ type: 'DISMISS_DONATE', payload: { id } })}
      />
    </div>
  );
}
