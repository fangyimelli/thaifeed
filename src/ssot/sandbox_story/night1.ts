import type { NightScript } from './types';

export const NIGHT1: NightScript = {
  meta: {
    id: 'night1',
    label: 'Night 1 - Intro Corridor',
    locale: 'zh-TW'
  },
  nodes: [
    {
      id: 'n1-node-001',
      char: 'ก',
      word: 'ไก่',
      highlightChar: 'ก',
      audioKey: 'thai_char_ko_kai',
      story: {
        identity: 'oldhouse_caretaker',
        emotion: 'curious',
        hintZH: '守夜人低聲提醒：先記住第一個字母。'
      },
      relatedTalk: ['這個字像門口的鉤子', '先聽發音再跟著唸一次'],
      comprehensionQuestion: {
        text: '這一節的主字母是哪一個？',
        options: [
          { id: 'A', text: 'ก' },
          { id: 'B', text: 'ข' },
          { id: 'C', text: 'ค' }
        ],
        correctOptionId: 'A',
        ghostMotionOnCorrect: 'ghost_nod_soft'
      }
    },
    {
      id: 'n1-node-002',
      char: 'ข',
      word: 'ไข่',
      highlightChar: 'ข',
      audioKey: 'thai_char_kho_khai',
      story: {
        identity: 'oldhouse_caretaker',
        emotion: 'focused',
        hintZH: '牆上的影子在「蛋」字停留，暗示你注意口型。'
      },
      relatedTalk: ['發音比上一個更有氣流感', '嘴型要更開一些'],
      comprehensionQuestion: {
        text: '哪個詞和這個字母一起練習？',
        options: [
          { id: 'A', text: 'ไก่' },
          { id: 'B', text: 'ไข่' },
          { id: 'C', text: 'ควาย' }
        ],
        correctOptionId: 'B',
        ghostMotionOnCorrect: 'ghost_point_chalk'
      }
    },
    {
      id: 'n1-node-003',
      char: 'ค',
      word: 'ควาย',
      highlightChar: 'ค',
      audioKey: 'thai_char_kho_khwai',
      story: {
        identity: 'oldhouse_caretaker',
        emotion: 'encouraging',
        hintZH: '走廊盡頭傳來低音，提示這個字更沉。'
      },
      relatedTalk: ['試著把聲音壓低一點', '記得這個詞是水牛'],
      comprehensionQuestion: {
        text: '答對後會觸發哪個幽靈動作包？',
        options: [
          { id: 'A', text: 'ghost_nod_soft' },
          { id: 'B', text: 'ghost_drift_back' },
          { id: 'C', text: 'ghost_point_chalk' }
        ],
        correctOptionId: 'B',
        ghostMotionOnCorrect: 'ghost_drift_back'
      }
    }
  ],
  ghostMotions: [
    { id: 'ghost_nod_soft', description: '輕點頭', motionKeys: ['head_nod_small'] },
    { id: 'ghost_point_chalk', description: '手指粉筆字', motionKeys: ['arm_point_wall'] },
    { id: 'ghost_drift_back', description: '向後飄退', motionKeys: ['body_drift_back'] }
  ],
  chatTemplates: {
    relatedTalkLead: ['聊天室開始聯想這個字', '觀眾在討論發音重點'],
    comprehensionPrompt: ['回答理解題後才能進入下一個字'],
    onCorrect: ['答對了，影子變淡了一些'],
    onWrong: ['答錯了，再聽一次提示音']
  }
};
