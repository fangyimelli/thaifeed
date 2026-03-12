import { AUTHORITATIVE_CONSONANT_BANK, SANDBOX_NIGHT_CONSONANT_POOLS } from '../../shared/consonant-engine';
import type { NightNode, NightScript } from './types';

type PoolEntry = {
  questionId: string;
  expectedConsonant: string;
  revealWord: string;
  acceptedCandidates: string[];
};

const UNKNOWN_KEYWORDS = ['不知道', '不會', '不懂', '提示', 'hint', 'help', '?', '？？？', '???', '看不懂', '我不會', '我不知道'];

const POOL_BY_CONSONANT = new Map(AUTHORITATIVE_CONSONANT_BANK.map((entry) => [entry.consonant, entry]));

const QUESTION_IDS: Record<string, string[]> = {
  NIGHT_01: ['n01_q01_wait', 'n01_q02_house', 'n01_q03_child', 'n01_q04_night', 'n01_q05_door', 'n01_q06_sound', 'n01_q07_wind', 'n01_q08_return', 'n01_q09_why', 'n01_q10_turn'],
  NIGHT_02: ['n02_q01_side', 'n02_q02_i', 'n02_q03_cave', 'n02_q04_ghost', 'n02_q05_rain', 'n02_q06_meet', 'n02_q07_eye', 'n02_q08_out', 'n02_q09_person', 'n02_q10_snake'],
  NIGHT_03: ['n03_q01_slow', 'n03_q02_hide', 'n03_q03_sleep', 'n03_q04_take', 'n03_q05_listen', 'n03_q06_look', 'n03_q07_stay', 'n03_q08_run', 'n03_q09_room', 'n03_q10_lula']
};

function buildPoolForNight(nightId: string): PoolEntry[] {
  const consonants = SANDBOX_NIGHT_CONSONANT_POOLS[nightId] ?? [];
  const ids = QUESTION_IDS[nightId] ?? [];
  return consonants.map((consonant, index) => {
    const entry = POOL_BY_CONSONANT.get(consonant);
    if (!entry) {
      throw new Error(`missing authoritative consonant entry: ${consonant}`);
    }
    return {
      questionId: ids[index] ?? `${nightId.toLowerCase()}_${index + 1}`,
      expectedConsonant: entry.consonant,
      revealWord: entry.revealWord,
      acceptedCandidates: entry.acceptedCandidates
    };
  });
}

export const SANDBOX_NIGHT_QUESTION_POOLS: Record<string, PoolEntry[]> = {
  NIGHT_01: buildPoolForNight('NIGHT_01'),
  NIGHT_02: buildPoolForNight('NIGHT_02'),
  NIGHT_03: buildPoolForNight('NIGHT_03')
};

export function buildNightScriptFromPool(meta: NightScript['meta']): NightScript {
  const pool = SANDBOX_NIGHT_QUESTION_POOLS[meta.id] ?? [];
  const nodes: NightNode[] = pool.map((entry) => ({
    id: entry.questionId,
    char: entry.expectedConsonant,
    wordText: entry.revealWord,
    word: entry.revealWord,
    translationZh: entry.revealWord,
    audioKey: entry.questionId,
    correctKeywords: entry.acceptedCandidates,
    unknownKeywords: UNKNOWN_KEYWORDS,
    acceptedCandidates: entry.acceptedCandidates,
    expectedConsonant: entry.expectedConsonant,
    revealWord: entry.revealWord
  }));
  return { meta, nodes };
}
