export interface LineVariant {
  id: string;
  tone: string;
  persona: string;
  lines: string[];
}

export type LineKey = string;

const pack = (prefix: string, tone: string, persona: string, lines: string[]): LineVariant => ({
  id: prefix,
  tone,
  persona,
  lines
});

const FLICKER_LINES = [
  '畫面切換後我心臟漏了一拍。',
  '切過去那一下讓我整個發毛。',
  '剛剛切鏡像有人靠近。',
  '這個切換感覺不太對。',
  '一換畫面就有種被盯著的感覺。',
  '切進去那瞬間太陰了。'
];

const FAN_LINES = [
  '風扇聲是不是怪怪的。',
  '剛剛風扇聲好像變重了。',
  '你們有沒有覺得聲音不太一樣。',
  '可能我錯覺 但我聽了不舒服。',
  '我戴耳機整個毛起來。',
  '那個風扇聲忽然讓我心裡一沉。',
  '風扇聲忽遠忽近 聽了好不安。',
  '我一直覺得風扇聲在貼近。'
];

const STEP_LINES = [
  '我好像聽到腳步靠過來。',
  '那個腳步聲讓我不敢動。',
  '是不是有人在外面走動。',
  '腳步聲一出來我就僵住了。',
  '剛剛那下像踩在門口。',
  '我真的有聽到腳步拖過去。'
];

export const LINE_REGISTRY: Record<LineKey, LineVariant[]> = {
  idle_boring: [
    pack('idle_01','dry','observer',['這裡安靜得不太自然。']),
    pack('idle_02','uneasy','nervous',['我有種快出事的預感。']),
    pack('idle_03','calm','chill',['先盯著，別急著下結論。']),
    pack('idle_04','tense','detective',['角落亮度剛剛像跳了一下。']),
    pack('idle_05','meme','meme',['聊天室先別刷太快，我在看細節。']),
    pack('idle_06','supportive','caretaker',['大家先深呼吸，慢慢看。']),
    pack('idle_07','hype','hype',['氣氛開始拉高了。']),
    pack('idle_08','skeptic','skeptical',['會不會只是我自己嚇自己？']),
    pack('idle_09','quiet','quiet',['嗯，這裡怪怪的。']),
    pack('idle_10','story','storyteller',['像老屋在憋著一口氣。']),
    pack('idle_11','impatient','impatient',['快點給個明顯動靜吧。']),
    pack('idle_12','minimal','minimalist',['不對勁。'])
  ],
  social_reply: [
    pack('reply_01','direct','polite',['@{tag} 你剛剛看到哪個位置？']),
    pack('reply_02','teasing','troll',['@{tag} 你別突然沉默我會怕。']),
    pack('reply_03','caring','empath',['@{tag} 先穩住，慢慢描述就好。']),
    pack('reply_04','analysis','detective',['@{tag} 你說的是門邊那塊陰影嗎？']),
    pack('reply_05','hype','hype',['@{tag} 你這條線索很關鍵。']),
    pack('reply_06','dry','observer',['@{tag} 我也在看同一區。']),
    pack('reply_07','nervous','nervous',['@{tag} 你這句讓我更毛了。']),
    pack('reply_08','calm','chill',['@{tag} 我先把這點記住。']),
    pack('reply_09','meme','meme',['@{tag} 這個節奏太會了吧。']),
    pack('reply_10','sleepy','sleepy',['@{tag} 我剛清醒就被你嚇醒。']),
    pack('reply_11','chaotic','chaotic',['@{tag} 警報直接拉滿！']),
    pack('reply_12','quiet','quiet',['@{tag} 我在。'])
  ],
  scene_flicker: Array.from({ length: 12 }).map((_, i) => pack(`scene_${i+1}`, ['tense','alert','dry'][i%3], ['observer','detective','nervous','storyteller'][i%4], [FLICKER_LINES[i % FLICKER_LINES.length]])),
  sfx_fan: Array.from({ length: 12 }).map((_, i) => pack(`fan_${i+1}`, ['calm','dry','focus'][i%3], ['chill','observer','quiet'][i%3], [FAN_LINES[i % FAN_LINES.length]])),
  sfx_footsteps: Array.from({ length: 12 }).map((_, i) => pack(`steps_${i+1}`, ['alarm','uneasy','alert'][i%3], ['nervous','detective','hype'][i%3], [STEP_LINES[i % STEP_LINES.length]])),
  sfx_ghost: Array.from({ length: 12 }).map((_, i) => pack(`ghost_${i+1}`, ['panic','ritual','fear'][i%3], ['chaotic','storyteller','nervous'][i%3], ['เสียงนั้นมาอีกแล้ว หลอนมาก', '剛那個女聲我雞皮疙瘩起來了。'])),
  lock_start: Array.from({ length: 12 }).map((_, i) => pack(`lock_start_${i+1}`, ['command','strict','urgent'][i%3], ['mod_live','chat_mod','detective'][i%3], ['鎖定模式啟動，請只回覆指定對象。'])),
  lock_remind_20: Array.from({ length: 12 }).map((_, i) => pack(`lock_20_${i+1}`, ['warn','strict','cold'][i%3], ['chat_mod','polite','observer'][i%3], ['提醒：請持續回覆鎖定對象。'])),
  lock_remind_40: Array.from({ length: 12 }).map((_, i) => pack(`lock_40_${i+1}`, ['warn','urgent','tense'][i%3], ['chat_mod','impatient','detective'][i%3], ['提醒：偏離目標將延長壓力。'])),
  lock_escalate_60: Array.from({ length: 12 }).map((_, i) => pack(`lock_60_${i+1}`, ['escalate','panic','threat'][i%3], ['chaotic','nervous','storyteller'][i%3], ['未解鎖，壓迫升級中。'])),
  evt_tv_moved: Array.from({ length: 12 }).map((_, i) => pack(`tv_${i+1}`, ['shock','alert','tense'][i%3], ['observer','hype','detective'][i%3], ['電視畫面位置好像被動過。']))
};
