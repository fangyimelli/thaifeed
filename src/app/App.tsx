import { useEffect, useReducer, useState } from 'react';
import { ASSET_MANIFEST } from '../config/assetManifest';
import { gameReducer, initialState } from '../core/state/reducer';
import { isAnswerCorrect } from '../core/systems/answerParser';
import {
  createAudienceMessage,
  createPlayerMessage,
  createSuccessMessage,
  createWrongMessage
} from '../core/systems/chatSystem';
import { createVipAiReply, maybeCreateVipNormalMessage } from '../core/systems/vipSystem';
import type { DonateMessage } from '../core/state/types';
import donatePools from '../content/pools/donatePools.json';
import usernames from '../content/pools/usernames.json';
import LoadingScreen from '../ui/loading/LoadingScreen';
import ChatPanel, { type ChatPanelSettings } from '../ui/chat/ChatPanel';
import DonateToast from '../ui/donate/DonateToast';
import SceneView from '../ui/scene/SceneView';
import { getCachedAsset, preloadAssets } from '../utils/preload';
import { pickOne } from '../utils/random';
import { createRandomInterval } from '../utils/timing';

const SFX_SRC = {
  typing: '/assets/sfx/sfx_typing.wav',
  send: '/assets/sfx/sfx_send.wav',
  success: '/assets/sfx/sfx_success.wav',
  error: '/assets/sfx/sfx_error.wav',
  glitch: '/assets/sfx/sfx_glitch.wav'
} as const;

const CHAT_SETTINGS: ChatPanelSettings = {
  title: '聊天室',
  inputPlaceholder: '傳送訊息',
  submitLabel: '送出',
  jumpToLatestLabel: '最新訊息',
  maxRenderCount: 100,
  stickBottomThreshold: 24,
  audienceMinMs: 2500,
  audienceMaxMs: 4000
};

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

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [input, setInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const runPreload = async () => {
      setIsReady(false);
      setProgress(0);
      setErrors([]);

      const result = await preloadAssets(ASSET_MANIFEST, {
        onProgress: (snapshot) => {
          if (isCancelled) return;
          setProgress(snapshot.progress);
          setErrors(snapshot.errors);
        }
      });

      if (isCancelled) return;

      setErrors(result.errors);
      if (result.errors.length === 0) {
        setIsReady(true);
      }
    };

    void runPreload();

    return () => {
      isCancelled = true;
    };
  }, [retryToken]);

  useEffect(() => {
    if (!isReady) return;

    const stop = createRandomInterval(() => {
      dispatch({ type: 'AUDIENCE_MESSAGE', payload: createAudienceMessage(state.curse) });
      const vipNormal = maybeCreateVipNormalMessage(input, state.curse, state.targetConsonant);
      if (vipNormal) dispatch({ type: 'AUDIENCE_MESSAGE', payload: vipNormal });
    }, CHAT_SETTINGS.audienceMinMs, CHAT_SETTINGS.audienceMaxMs);

    return stop;
  }, [state.curse, state.targetConsonant, input, isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (state.curse > 80) playSound(SFX_SRC.glitch);
  }, [state.curse, isReady]);

  const submit = () => {
    const raw = input.trim();
    if (!raw) return;

    playSound(SFX_SRC.send);
    dispatch({ type: 'PLAYER_MESSAGE', payload: createPlayerMessage(raw) });

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
        errors={errors}
        onRetry={() => setRetryToken((value) => value + 1)}
      />
    );
  }

  return (
    <div className="app-layout">
      <SceneView roomName={state.roomName} targetConsonant={state.targetConsonant} curse={state.curse} />
      <ChatPanel
        settings={CHAT_SETTINGS}
        messages={state.messages}
        input={input}
        onChange={(value) => {
          setInput(value);
          playSound(SFX_SRC.typing);
        }}
        onSubmit={submit}
        onToggleTranslation={(id) => dispatch({ type: 'TOGGLE_CHAT_TRANSLATION', payload: { id } })}
      />
      <DonateToast
        toasts={state.donateToasts}
        onToggleTranslation={(id) => dispatch({ type: 'TOGGLE_DONATE_TRANSLATION', payload: { id } })}
        onDismiss={(id) => dispatch({ type: 'DISMISS_DONATE', payload: { id } })}
      />
    </div>
  );
}
