export type SharedConsonantQuestion = {
  questionId: string;
  consonant: string;
  promptText: string;
  hint: string;
  acceptedAnswers?: string[];
  aliases?: string[];
  wrongFormatHint?: string;
  wrongAnswerHint?: string;
};

export type ConsonantParseResult = {
  normalized: string;
  parsed: boolean;
  matchedQuestionId: string | null;
  matchedConsonant: string | null;
  matchedAlias: string;
};

export type ConsonantJudgeResult = {
  type: 'correct' | 'wrong_format' | 'wrong_answer';
  parsed: ConsonantParseResult;
};
