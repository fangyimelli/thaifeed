export type ComprehensionOption = {
  id: string;
  text: string;
};

export type ComprehensionQuestion = {
  text: string;
  options: ComprehensionOption[];
  correctOptionId: string;
  ghostMotionOnCorrect: string;
};

export type WordNode = {
  id: string;
  char: string;
  word: string;
  highlightChar: string;
  audioKey: string;
  story: {
    identity: string;
    emotion: string;
    hintZH: string;
  };
  relatedTalk: string[];
  comprehensionQuestion: ComprehensionQuestion;
};

export type GhostMotionPack = {
  id: string;
  description: string;
  motionKeys: string[];
};

export type ChatTemplates = {
  relatedTalkLead: string[];
  comprehensionPrompt: string[];
  onCorrect: string[];
  onWrong: string[];
};

export type NightScript = {
  meta: {
    id: string;
    label: string;
    locale: 'zh-TW';
  };
  nodes: WordNode[];
  ghostMotions: GhostMotionPack[];
  chatTemplates: ChatTemplates;
};
