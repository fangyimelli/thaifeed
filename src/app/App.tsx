import { useEffect, useReducer, useState } from 'react';
import { gameReducer, initialState } from '../core/state/reducer';
import { isAnswerCorrect } from '../core/systems/answerParser';
import { createAudienceMessage, createSuccessMessage, createWrongMessage } from '../core/systems/chatSystem';
import { createVipAiReply, maybeCreateVipNormalMessage } from '../core/systems/vipSystem';
import donatePools from '../content/pools/donatePools.json';
import usernames from '../content/pools/usernames.json';
import { createRandomInterval } from '../utils/timing';
import { pickOne } from '../utils/random';
import SceneView from '../ui/scene/SceneView';
import ChatPanel from '../ui/chat/ChatPanel';
import DonateToast from '../ui/donate/DonateToast';
import type { DonateMessage } from '../core/state/types';

const sfx = {
  typing: new Audio('/assets/sfx/sfx_typing.wav'),
  send: new Audio('/assets/sfx/sfx_send.wav'),
  success: new Audio('/assets/sfx/sfx_success.wav'),
  error: new Audio('/assets/sfx/sfx_error.wav'),
  glitch: new Audio('/assets/sfx/sfx_glitch.wav')
};

Object.values(sfx).forEach((audio) => {
  audio.volume = 0.6;
});

function playSound(sound: HTMLAudioElement) {
  sound.currentTime = 0;
  void sound.play().catch(() => undefined);
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [input, setInput] = useState('');

  useEffect(() => {
    const stop = createRandomInterval(() => {
      dispatch({ type: 'AUDIENCE_MESSAGE', payload: createAudienceMessage(state.curse) });
      const vipNormal = maybeCreateVipNormalMessage(input, state.curse, state.targetConsonant);
      if (vipNormal) dispatch({ type: 'AUDIENCE_MESSAGE', payload: vipNormal });
    }, 2500, 4000);

    return stop;
  }, [state.curse, state.targetConsonant, input]);

  useEffect(() => {
    if (state.curse > 80) playSound(sfx.glitch);
  }, [state.curse]);

  const submit = () => {
    const raw = input.trim();
    if (!raw) return;

    playSound(sfx.send);

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
      playSound(sfx.success);
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
      playSound(sfx.error);
    }

    setInput('');
  };

  return (
    <div className="app-layout">
      <SceneView roomName={state.roomName} targetConsonant={state.targetConsonant} curse={state.curse} />
      <ChatPanel
        messages={state.messages}
        input={input}
        onChange={(value) => {
          setInput(value);
          playSound(sfx.typing);
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
