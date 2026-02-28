import { pickWithoutRecent } from './dedupe';
import type { EventTopic } from './eventTypes';

const reactionPool: Record<EventTopic, Array<{ id: string; text: string }>> = {
  ghost: [
    { id: 'ghost_react_1', text: '我耳朵整個麻掉' },
    { id: 'ghost_react_2', text: '剛剛那聲超近' },
    { id: 'ghost_react_3', text: '我真的不敢回頭了' },
    { id: 'ghost_react_4', text: '這不是錯覺吧' },
    { id: 'ghost_react_5', text: '背後一陣涼' },
    { id: 'ghost_react_6', text: '有人也聽到了嗎' },
    { id: 'ghost_react_7', text: '聊天室先別亂跑' },
    { id: 'ghost_react_8', text: '這波我心跳直接爆掉' },
    { id: 'ghost_react_9', text: '太貼臉了吧' },
    { id: 'ghost_react_10', text: '我手都在抖了' }
  ],
  footsteps: [
    { id: 'step_react_1', text: '腳步聲越來越近了' },
    { id: 'step_react_2', text: '我聽到有人在走' },
    { id: 'step_react_3', text: '那個節奏超像在靠近' },
    { id: 'step_react_4', text: '這下我完全不敢眨眼' },
    { id: 'step_react_5', text: '是不是停在門口了' },
    { id: 'step_react_6', text: '我雞皮疙瘩整排起來' },
    { id: 'step_react_7', text: '這聲音太真了吧' },
    { id: 'step_react_8', text: '感覺下一步就進來' },
    { id: 'step_react_9', text: '我先把音量調低一點' },
    { id: 'step_react_10', text: '別突然衝出來拜託' }
  ],
  light: [
    { id: 'light_react_1', text: '燈又跳了 我頭皮發麻' },
    { id: 'light_react_2', text: '那個亮暗切換太怪' },
    { id: 'light_react_3', text: '我盯著看又閃一下' },
    { id: 'light_react_4', text: '這種光線超不舒服' },
    { id: 'light_react_5', text: '像有人在摸開關' },
    { id: 'light_react_6', text: '畫面整個變得更冷了' },
    { id: 'light_react_7', text: '聊天室先別刷太快' },
    { id: 'light_react_8', text: '這裡真的越看越毛' },
    { id: 'light_react_9', text: '我現在超怕突然全黑' },
    { id: 'light_react_10', text: '燈一抖我心也跟著抖' }
  ]
};

export function pickReactionLines(topic: EventTopic, count: number, recentIds: string[]): Array<{ id: string; text: string }> {
  const pool = reactionPool[topic];
  const picked: Array<{ id: string; text: string }> = [];
  const localRecent = [...recentIds];
  for (let i = 0; i < count; i += 1) {
    const { option } = pickWithoutRecent(pool, localRecent, 8);
    picked.push(option);
    localRecent.push(option.id);
  }
  return picked;
}
