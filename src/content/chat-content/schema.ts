export type ChatContentMode = 'classic' | 'sandbox' | 'shared' | (string & {});

export type ChatContentCategory =
  | 'ambient_chat'
  | 'event_dialog'
  | 'event_reaction'
  | 'qna_prompt'
  | 'qna_retry'
  | 'qna_unknown'
  | 'donate'
  | 'fake_ai'
  | 'sandbox_preheat'
  | 'sandbox_prompt'
  | 'sandbox_vip_summary'
  | 'sandbox_glitch'
  | 'sandbox_tag_question'
  | 'sandbox_help_hint'
  | 'debug_text'
  | 'ui_placeholder'
  | 'fallback'
  | (string & {});

export type ChatContentStatus = 'active' | 'legacy' | 'parallel' | 'inferred_runtime_wrapper' | (string & {});

export type ChatContentToken = {
  token: string;
  description: string;
  runtimeSource?: string;
};

export type ChatContentEntry = {
  mode: ChatContentMode;
  category: ChatContentCategory;
  key: string;
  sourceFile: string;
  sourceSymbol: string;
  text?: string;
  textVariants?: string[];
  tokens?: ChatContentToken[];
  flowStep?: string;
  gateType?: string;
  eventKey?: string;
  qnaFlowId?: string;
  questionId?: string;
  status: ChatContentStatus;
  notes?: string;
};
