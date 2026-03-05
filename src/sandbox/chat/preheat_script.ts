import { SANDBOX_VIP } from './vip_identity';

export type PreheatScriptSpeaker = 'system' | 'vip' | 'viewer' | 'mod';

export type PreheatScriptIdentitySpeaker = typeof SANDBOX_VIP;

export type PreheatScriptEvent = {
  atMs: number;
  speaker: PreheatScriptSpeaker | PreheatScriptIdentitySpeaker;
  text: string;
  poolHint?: string;
};

export const PREHEAT_SCRIPT: PreheatScriptEvent[] = [
  { atMs: 0, speaker: 'system', text: '系統：sandbox 已啟動，聊天室暖場中', poolHint: 'system' },
  { atMs: 900, speaker: SANDBOX_VIP, text: '@{{PLAYER}} 嗨嗨，第一次看嗎？', poolHint: 'vip_intro' },
  { atMs: 1900, speaker: 'viewer', text: '@behindyou 你又來了XD', poolHint: 'viewer_banter' },
  { atMs: 3000, speaker: 'viewer', text: 'behindyou 今天這麼早報到喔', poolHint: 'viewer_banter' },
  { atMs: 4200, speaker: SANDBOX_VIP, text: '我看這台很久了，上次那段超扯', poolHint: 'vip_memory' },
  { atMs: 5600, speaker: 'viewer', text: '我也記得那次，聊天室直接洗版', poolHint: 'viewer_banter' },
  { atMs: 7600, speaker: 'viewer', text: '我覺得應該是假的吧', poolHint: 'skeptic' },
  { atMs: 9300, speaker: 'mod', text: '先別急，等一下看細節再說', poolHint: 'mod_control' },
  { atMs: 11100, speaker: 'viewer', text: '@behindyou 你上次不是說真的有聽到聲音？', poolHint: 'viewer_followup' },
  { atMs: 13600, speaker: SANDBOX_VIP, text: '有啊，那段回放我重看三次還是毛毛的', poolHint: 'vip_followup' },
  { atMs: 16100, speaker: 'viewer', text: '聊天室老朋友都到齊了，氣氛對了', poolHint: 'viewer_banter' },
  { atMs: 18700, speaker: 'viewer', text: '@{{PLAYER}} 等等一起看，不要被嚇跑', poolHint: 'viewer_welcome' }
];
