export type SupportedModeId = 'classic' | 'sandbox';

export type FlowGateType =
  | 'event_gate'
  | 'qna_gate'
  | 'reply_gate'
  | 'post_reveal_gate'
  | 'ambient_gate'
  | 'debug_gate'
  | 'none'
  | (string & {});

export type FlowUiSurface =
  | 'chat_panel'
  | 'reply_bar'
  | 'pinned_reply'
  | 'scene_overlay'
  | 'debug_panel'
  | 'review_packet'
  | 'none'
  | (string & {});

export type FlowSelectionPolicy = 'single' | 'variant_pool' | 'priority_then_optional' | 'runtime_adapter' | 'debug_fixed' | (string & {});

export type StyleConstraint = {
  id: string;
  description: string;
};

export type ModeFlowStepDefinition = {
  mode: SupportedModeId;
  stepId: string;
  stepPurpose: string;
  enterConditions: string[];
  exitConditions: string[];
  canReply: boolean;
  gateType: FlowGateType;
  blockedReasons: string[];
  uiSurface: FlowUiSurface[];
  nextStepCandidates: string[];
  allowedMessageCategories: string[];
  messagePurpose?: string;
  tonePack?: string | null;
  intensity?: 'low' | 'medium' | 'high' | 'variable' | null;
  styleConstraints?: StyleConstraint[];
  selectionPolicy?: FlowSelectionPolicy;
  notes?: string;
  debugLabel?: string;
};

export type ModeContentCategoryOwnership = {
  mode: 'classic' | 'sandbox' | 'shared' | 'legacy';
  category: string;
  ownership: 'mode_specific' | 'shared_ui' | 'shared_tooling' | 'legacy_adapter' | 'runtime_wrapper';
  sourceStatus: 'active' | 'legacy' | 'parallel' | 'runtime_wrapper';
  messagePurpose: string;
  allowedStepIds: string[];
  tonePackSupport: boolean;
  tonePack?: string[];
  intensity?: string[];
  styleConstraints?: string[];
  selectionPolicy?: FlowSelectionPolicy;
  notes?: string;
};

export type FlowContentRoute = {
  mode: SupportedModeId;
  stepId: string;
  allowedCategories: string[];
  primaryCategory: string;
  optionalCategories?: string[];
  messagePurpose: string;
  tonePackSupport: boolean;
  tonePack?: string[];
  intensity?: string[];
  styleConstraints?: string[];
  runtimeSelectionPolicy: FlowSelectionPolicy;
  notes?: string;
};
