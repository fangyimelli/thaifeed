export type NightNode = {
  id: string;
  char: string;
  wordText: string;
  word?: string;
  expectedConsonant?: string;
  revealWord?: string;
  acceptedCandidates?: string[];
  translationZh: string;
  audioKey: string;
  correctKeywords: string[];
  unknownKeywords: string[];
};

export type NightScript = {
  meta: {
    id: string;
    title: string;
    version: string;
  };
  nodes: NightNode[];
};

export type GhostMotionPack = {
  id: string;
};
