import type { StoryEventKey } from '../../core/events/eventTypes';
import type { QnaFlow } from './qnaTypes';

const flow = (id: string, eventKey: StoryEventKey, steps: QnaFlow['steps']): QnaFlow => ({
  id,
  eventKey,
  initialStepId: steps[0]?.id ?? 'step_1',
  steps
});

export const QNA_FLOWS: Record<string, QnaFlow> = {
  voice_confirm_flow: flow('voice_confirm_flow', 'VOICE_CONFIRM', [
    {
      id: 's1',
      questionVariants: ['你覺得那聲音是從門邊還是窗邊來的？', '你剛聽到的聲音比較像門口還是窗邊？'],
      retryPromptVariants: ['再選一次：門邊 或 窗邊。'],
      unknownPromptVariants: ['先不用急，想一下聲音比較靠哪邊。'],
      options: [
        { id: 'door', label: '門邊', keywords: ['門邊', '門口'], nextStepId: 's2' },
        { id: 'window', label: '窗邊', keywords: ['窗邊', '窗戶'], nextStepId: 's2' }
      ]
    },
    {
      id: 's2',
      questionVariants: ['你要我先追這條線索嗎？', '這條線索要繼續追嗎？'],
      options: [
        { id: 'yes', label: '要', keywords: ['要', '好'], nextEventKey: 'GHOST_PING', end: true },
        { id: 'no', label: '先不要', keywords: ['不要', '先不要'], end: true }
      ]
    }
  ]),
  ghost_ping_flow: flow('ghost_ping_flow', 'GHOST_PING', [
    {
      id: 's1',
      questionVariants: ['你要我現在回頭看畫面嗎？', '要不要立刻回看剛剛那一段？'],
      options: [
        { id: 'yes', label: '回看', keywords: ['回看', '要'], end: true },
        { id: 'no', label: '先不要', keywords: ['不要', '先不要'], end: true }
      ]
    }
  ]),
  tv_event_flow: flow('tv_event_flow', 'TV_EVENT', [
    {
      id: 's1',
      questionVariants: ['你剛剛有看到螢幕閃爍嗎？', '那一下你有看到畫面閃一下嗎？'],
      options: [
        { id: 'yes', label: '有', keywords: ['有', '看到了'], nextStepId: 's2' },
        { id: 'no', label: '沒有', keywords: ['沒有', '沒看到'], nextStepId: 's2' }
      ]
    },
    {
      id: 's2',
      questionVariants: ['要不要把燈光異常事件也叫出來？', '要不要連鎖觸發燈光事件？'],
      options: [
        { id: 'chain_light', label: '要', keywords: ['要', '觸發'], nextEventKey: 'LIGHT_GLITCH', end: true },
        { id: 'skip', label: '先不要', keywords: ['不要', '先不要'], end: true }
      ]
    }
  ]),
  name_call_flow: flow('name_call_flow', 'NAME_CALL', [
    {
      id: 's1',
      questionVariants: ['你要我直接喊回去嗎？', '要不要回應那個叫名聲？'],
      options: [
        { id: 'yes', label: '回應', keywords: ['回應', '要'], nextEventKey: 'VOICE_CONFIRM', end: true },
        { id: 'no', label: '不要', keywords: ['不要', '先不要'], end: true }
      ]
    }
  ]),
  viewer_spike_flow: flow('viewer_spike_flow', 'VIEWER_SPIKE', [
    {
      id: 's1',
      questionVariants: ['你要我先穩住聊天室節奏嗎？', '現在先控一下聊天室嗎？'],
      options: [
        { id: 'steady', label: '穩住', keywords: ['穩住', '控制'], nextStepId: 's2' },
        { id: 'rush', label: '衝', keywords: ['衝', '快點'], nextStepId: 's2' }
      ]
    },
    {
      id: 's2',
      questionVariants: ['要順便做恐懼挑戰嗎？', '要不要接續恐懼挑戰事件？'],
      options: [
        { id: 'yes', label: '要', keywords: ['要', '好'], nextEventKey: 'FEAR_CHALLENGE', end: true },
        { id: 'no', label: '不要', keywords: ['不要', '先不要'], end: true }
      ]
    }
  ]),
  light_glitch_flow: flow('light_glitch_flow', 'LIGHT_GLITCH', [
    {
      id: 's1',
      questionVariants: ['你要我追一下光源位置嗎？', '要不要先查燈光來源？'],
      options: [
        { id: 'yes', label: '追', keywords: ['追', '要'], end: true },
        { id: 'no', label: '不追', keywords: ['不', '不要'], end: true }
      ]
    }
  ]),
  fear_challenge_flow: flow('fear_challenge_flow', 'FEAR_CHALLENGE', [
    {
      id: 's1',
      questionVariants: ['你要硬撐還是先退一步？', '要不要先保守一點？'],
      options: [
        { id: 'brave', label: '硬撐', keywords: ['硬撐', '不怕'], end: true },
        { id: 'safe', label: '保守', keywords: ['保守', '先退'], end: true }
      ]
    }
  ])
};

export const QNA_FLOW_BY_EVENT: Partial<Record<StoryEventKey, string>> = {
  VOICE_CONFIRM: 'voice_confirm_flow',
  GHOST_PING: 'ghost_ping_flow',
  TV_EVENT: 'tv_event_flow',
  NAME_CALL: 'name_call_flow',
  VIEWER_SPIKE: 'viewer_spike_flow',
  LIGHT_GLITCH: 'light_glitch_flow',
  FEAR_CHALLENGE: 'fear_challenge_flow'
};
