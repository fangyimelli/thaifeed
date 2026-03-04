export type ComprehensionOption = {
  id: string;
  text: string;
};

export type ComprehensionQuestion = {
  text: string;
  options: ComprehensionOption[];
  correctOptionId: string;
  keyword: string;
  unknownKeyword: string;
};

export type TalkSeeds = {
  related: string[];
  surprise: string[];
  guess: string[];
};

export type WordNode = {
  id: string;
  char: string;
  correctKeywords: string[];
  unknownKeywords: string[];
  word: string;
  wordText: string;
  highlightChar: string;
  audioKey: string;
  comprehensionQuestion: ComprehensionQuestion;
  talkSeeds: TalkSeeds;
};

export type ChatTemplates = {
  relatedTalk: string[];
  surprise: string[];
  guess: string[];
};

export type NightScript = {
  meta: {
    id: string;
    label: string;
    version: string;
    locale: 'zh-TW';
  };
  nodes: WordNode[];
  chatTemplates: ChatTemplates;
};

export type GhostMotionPack = {
  id: string;
  description: string;
  motionKeys: string[];
};
