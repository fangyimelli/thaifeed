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
  | 'sandbox_debug_text'
  | 'sandbox_crowd_reaction'
  | 'sandbox_stub'
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
  ownerMode?: 'classic' | 'sandbox' | 'shared' | 'legacy';
  ownership?: 'mode_specific' | 'shared_ui' | 'shared_tooling' | 'legacy_adapter' | 'runtime_wrapper';
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
  messagePurpose?: string;
  tonePack?: string | null;
  intensity?: string | null;
  styleConstraints?: string[];
  selectionPolicy?: string | null;
  notes?: string;
};


export type ChatContentSourceOfTruth = 'registry' | 'runtime_wrapper' | 'legacy' | 'parallel';

export type ChatContentReviewStatus = 'draft' | 'approved' | 'locked';

export type ChatContentImportTarget =
  | 'src/content/chat-content/editable/authoredChatContent.json'
  | 'manual_review_required'
  | 'runtime_wrapper_only'
  | 'legacy_reference_only'
  | 'parallel_reference_only'
  | (string & {});

export type EditableChatDraftEntry = ChatContentEntry & {
  currentText?: string;
  currentVariants?: string[];
  editable: boolean;
  sourceOfTruth: ChatContentSourceOfTruth;
  importTarget: ChatContentImportTarget;
  reviewStatus: ChatContentReviewStatus;
};

export type EditableChatDraftCategory = {
  category: ChatContentCategory;
  entries: EditableChatDraftEntry[];
};

export type EditableChatDraftDocument = {
  mode: ChatContentMode;
  generatedAt: string;
  summary: {
    totalEntries: number;
    editableEntries: number;
    lockedEntries: number;
  };
  categories: EditableChatDraftCategory[];
};
