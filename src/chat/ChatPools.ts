import { ChatMessageType, type PersonaId } from './ChatTypes';

export const SYSTEM_POOLS: Record<string, string[]> = {
  system_prompt: ['先穩住 這間房的節奏又變了', '大家先別急 我們慢慢盯', '聊天室先安靜一下看畫面'],
  ui_status: ['聲音已啟用', '畫面已準備完成', '初始化完成', '部分非必要素材載入失敗 遊戲可正常進行']
};

export const THAI_TRANSLATIONS: Record<string, string> = {
  'ได้ยินพัดลมแล้วใจสั่นเลย': '一聽到風扇聲就開始心悸',
  'เสียงเท้ามาอีกแล้วเงียบเลย': '腳步聲又來了 整個安靜',
  'เหมือนมีคนยืนหลังกล้อง': '像有人站在鏡頭後面',
  'อย่าหันกลับนะ': '先不要回頭',
  'ไฟมันกระพริบอีกแล้ว': '燈又在閃了'
};

export const PERSONA_USERS: Record<PersonaId, string> = {
  chill: 'lilac52', nervous: 'bamboo77', troll: 'cocoa404', quiet: 'misty22', observer: 'pixel30',
  hype: 'rush999', skeptical: 'kilo18', empath: 'hana63', meme: 'lolcat88', foodie: 'toast11',
  gamer: 'combo71', sleepy: 'zzz010', detective: 'trace56', caretaker: 'warm20', chaotic: 'boom13',
  polite: 'momo08', impatient: 'fast66', storyteller: 'ink31', minimalist: 'dot2', latecomer: 'newbie95'
};

export const SAFE_FALLBACK_POOL = [
  '先等一下 我雞皮疙瘩起來了',
  '這氣氛讓我不敢眨眼',
  '我整個人僵住了',
  '有人也覺得心裡發毛嗎',
  '先別刷太快 我還在抖',
  '我剛剛差點把手機丟出去',
  '這種安靜最可怕',
  '我耳機戴著整個不舒服',
  '你們先講話 我有點不敢看',
  '我現在只想先深呼吸',
  '這畫面越看越不對',
  '我真的有被嚇到'
];

export const PERSONA_POOLS: Record<PersonaId, Partial<Record<ChatMessageType, string[]>>> = {
  chill: { [ChatMessageType.IDLE_BORING]: ['我先慢慢盯著看', '這氣氛越靜越怪'], [ChatMessageType.DREAD_BUILDUP]: ['安靜到我背脊發涼'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 先別慌 我也在看'] },
  nervous: { [ChatMessageType.IDLE_BORING]: ['我手心又出汗了', '現在這種沒事最可怕'], [ChatMessageType.DREAD_BUILDUP]: ['我腦袋一直補畫面'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 你有看到剛剛那下嗎'] },
  troll: { [ChatMessageType.IDLE_BORING]: ['這鏡頭很會折磨人', '欸這畫面是在釣人吧'], [ChatMessageType.DREAD_BUILDUP]: ['我看等等一定有事'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 先深呼吸 不然先關彈幕'] },
  quiet: { [ChatMessageType.IDLE_BORING]: ['嗯 我有感', '我會一直看著這裡'], [ChatMessageType.DREAD_BUILDUP]: ['這裡不太對勁'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 我也聽到了'] },
  observer: { [ChatMessageType.IDLE_BORING]: ['畫面邊緣有點飄', '亮度剛剛掉一拍'], [ChatMessageType.DREAD_BUILDUP]: ['前後看起來有落差'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 你講的點有對上'] },
  hype: { [ChatMessageType.IDLE_BORING]: ['欸我現在超清醒', '這氣氛直接拉滿'], [ChatMessageType.DREAD_BUILDUP]: ['感覺等等要爆開'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 別走 感覺要來了'] },
  skeptical: { [ChatMessageType.IDLE_BORING]: ['先不要太快下結論', '我想再看一次'], [ChatMessageType.DREAD_BUILDUP]: ['這感覺不像單純錯覺'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 先看前後反應再說'] },
  empath: { [ChatMessageType.IDLE_BORING]: ['大家先放慢呼吸', '看不下去就休息一下'], [ChatMessageType.DREAD_BUILDUP]: ['我知道這裡很壓'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 你先穩住 我在'] },
  meme: { [ChatMessageType.IDLE_BORING]: ['我腦內已經自動配音', '聊天室等下要炸'], [ChatMessageType.DREAD_BUILDUP]: ['這裡很像恐怖梗開場'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 你這句太真了'] },
  foodie: { [ChatMessageType.IDLE_BORING]: ['我零食差點掉地上', '這氣氛比辣鍋還衝'], [ChatMessageType.DREAD_BUILDUP]: ['胃突然縮一下'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 我連水都不敢喝'] },
  gamer: { [ChatMessageType.IDLE_BORING]: ['這像王前前搖', '警戒條快滿了'], [ChatMessageType.DREAD_BUILDUP]: ['感覺要觸發事件'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 我也覺得是陷阱'] },
  sleepy: { [ChatMessageType.IDLE_BORING]: ['我本來快睡著了', '現在眼睛直接張開'], [ChatMessageType.DREAD_BUILDUP]: ['這下把我嚇醒'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 我剛剛也抖一下'] },
  detective: { [ChatMessageType.IDLE_BORING]: ['先記這個位置', '這裡有可疑陰影'], [ChatMessageType.DREAD_BUILDUP]: ['像有人從暗處經過'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 你的線索有用'] },
  caretaker: { [ChatMessageType.IDLE_BORING]: ['太緊就先喝口水', '先別硬撐'], [ChatMessageType.DREAD_BUILDUP]: ['這裡壓力真的高'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 你先休息一下'] },
  chaotic: { [ChatMessageType.IDLE_BORING]: ['我腦內警報狂叫', '不行我要先尖叫'], [ChatMessageType.DREAD_BUILDUP]: ['這氣氛邪到爆'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 我跟你一起崩潰'] },
  polite: { [ChatMessageType.IDLE_BORING]: ['借過我補一句 這裡很冷', '請大家留意右下角'], [ChatMessageType.DREAD_BUILDUP]: ['失禮了 但真的怪'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 感謝提醒 我有看到'] },
  impatient: { [ChatMessageType.IDLE_BORING]: ['快回放剛剛那下', '我想直接看重點'], [ChatMessageType.DREAD_BUILDUP]: ['別拖 真的快出事'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 對 就是那裡'] },
  storyteller: { [ChatMessageType.IDLE_BORING]: ['這房間像在憋氣', '畫面像有人貼牆走'], [ChatMessageType.DREAD_BUILDUP]: ['節奏像在等人回頭'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 你那句很像前兆'] },
  minimalist: { [ChatMessageType.IDLE_BORING]: ['怪', '有感'], [ChatMessageType.DREAD_BUILDUP]: ['不妙'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 懂'] },
  latecomer: { [ChatMessageType.IDLE_BORING]: ['我剛進來就這麼硬', '有人補前情嗎'], [ChatMessageType.DREAD_BUILDUP]: ['我是不是錯過關鍵'], [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 可以幫我補一下嗎'] }
};

export const TYPE_FALLBACK_POOLS: Record<ChatMessageType, string[]> = {
  [ChatMessageType.SYSTEM_PROMPT]: ['先穩住', '大家慢慢看'],
  [ChatMessageType.FEAR_SELF_DOUBT]: ['我是不是自己嚇自己', '越看越懷疑是我腦補'],
  [ChatMessageType.DREAD_BUILDUP]: ['我背後開始發涼了', '這感覺越來越不對'],
  [ChatMessageType.SOCIAL_REPLY]: ['@{tag} 我也有同感', '@{tag} 你這句太關鍵'],
  [ChatMessageType.UI_STATUS]: ['系統已就緒'],
  [ChatMessageType.IDLE_BORING]: ['今天這裡就是一直吊著人', '我一直在等下一個動靜'],
  [ChatMessageType.SCENE_FLICKER_REACT]: ['切鏡後整個氣壓變了', '這一下切換太突兀了'],
  [ChatMessageType.SFX_REACT_FAN]: ['風扇聲是不是怪怪的', '剛剛風扇聲好像變重了', '你們有沒有覺得聲音不太一樣', '可能我錯覺 但我聽了不舒服', '我戴耳機整個毛起來'],
  [ChatMessageType.SFX_REACT_FOOTSTEPS]: ['我剛剛真的聽到腳步', '是不是有人在外面走動'],
  [ChatMessageType.SFX_REACT_GHOST]: ['เสียงนั้นมาอีกแล้วเงียบเลย', 'อย่าหันกลับนะ']
};
