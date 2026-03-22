import authoredChatContent from './editable/authoredChatContent.json';
import type { ChatContentEntry, ChatContentToken } from './schema';

export type SandboxPreheatSequenceEntry = {
  user: string;
  text: string;
  role?: 'viewer' | 'vip' | 'mod';
  vip?: boolean;
  badge?: 'crown';
  kind: 'chat' | 'join';
};

const AUTHORED_TEXT = authoredChatContent as Record<string, string>;

function getAuthoredText(key: string) {
  const value = AUTHORED_TEXT[key];
  if (typeof value !== 'string') {
    throw new Error(`Missing authored chat content for key: ${key}`);
  }
  return value;
}

const ACTIVE_USER_TOKEN: ChatContentToken = {
  token: '@activeUser',
  description: 'Active player handle mention injected at runtime.',
  runtimeSource: 'separateChatActorState(...).activeUser'
};

const DYNAMIC_INDEX_TOKEN: ChatContentToken = {
  token: '{index}',
  description: 'Dynamic sandbox tag question number.',
  runtimeSource: 'parseSandboxTagStepIndex(flow.step)'
};

const DYNAMIC_CONSONANT_TOKEN: ChatContentToken = {
  token: '{consonant}',
  description: 'Current consonant/prompt character.',
  runtimeSource: 'nextNode.char / node.char'
};

const MEMORY_HINT_TOKEN: ChatContentToken = {
  token: '{imageMemoryHint}',
  description: 'Shared consonant image-memory hint from consonant bank.',
  runtimeSource: 'CONSONANT_BANK_BY_CHAR.get(currentPrompt.consonant)?.imageMemoryHint'
};

export const SANDBOX_PREHEAT_JOIN_CAP = 4;

const SANDBOX_PREHEAT_META = [
  { key: 'sandbox.preheat.1', user: 'viewer_118', role: 'viewer', kind: 'chat' },
  { key: 'sandbox.preheat.2', user: 'system', kind: 'join' },
  { key: 'sandbox.preheat.3', user: 'viewer_203', role: 'viewer', kind: 'chat' },
  { key: 'sandbox.preheat.4', user: '{sandboxVipHandle}', role: 'vip', vip: true, badge: 'crown', kind: 'chat' },
  { key: 'sandbox.preheat.5', user: 'system', kind: 'join' },
  { key: 'sandbox.preheat.6', user: '{sandboxVipHandle}', role: 'vip', vip: true, badge: 'crown', kind: 'chat' },
  { key: 'sandbox.preheat.7', user: 'viewer_409', role: 'viewer', kind: 'chat' },
  { key: 'sandbox.preheat.8', user: 'system', kind: 'join' },
  { key: 'sandbox.preheat.9', user: 'mod_live', role: 'mod', kind: 'chat' }
] as const;

export const SANDBOX_PREHEAT_CHAT_SEQUENCE: SandboxPreheatSequenceEntry[] = SANDBOX_PREHEAT_META.map((entry) => ({
  ...entry,
  text: getAuthoredText(entry.key)
}));

const SANDBOX_GLITCH_META = [
  { key: 'sandbox.glitch.answer_eval.1', username: 'viewer_118' },
  { key: 'sandbox.glitch.answer_eval.2', username: 'viewer_203' },
  { key: 'sandbox.glitch.answer_eval.3', username: 'viewer_409' }
] as const;

export const SANDBOX_GLITCH_BURST_LINES = SANDBOX_GLITCH_META.map((entry) => ({
  username: entry.username,
  line: getAuthoredText(entry.key)
})) as ReadonlyArray<{ username: string; line: string }>;

export const SANDBOX_VIP_SUMMARY_LINES = {
  VIP_SUMMARY_1: getAuthoredText('sandbox.vip_summary.1'),
  VIP_SUMMARY_2: getAuthoredText('sandbox.vip_summary.2')
} as const;

export const SANDBOX_PROMPT_TEMPLATES = {
  revealPrompt: getAuthoredText('sandbox.prompt.reveal_prompt'),
  tagQuestion: getAuthoredText('sandbox.prompt.tag_question'),
  helpHintWithMemory: getAuthoredText('sandbox.hint.help_memory'),
  helpHintFallback: getAuthoredText('sandbox.hint.help_fallback')
} as const;

export const SANDBOX_DEBUG_TEXT = {
  warmupReply: getAuthoredText('sandbox.debug.warmup_reply')
} as const;

export const UI_TEXT = {
  chatInputPlaceholder: getAuthoredText('ui.chat.placeholder'),
  sendInitializing: getAuthoredText('ui.chat.send.initializing'),
  sendSending: getAuthoredText('ui.chat.send.sending'),
  sendReady: getAuthoredText('ui.chat.send.ready'),
  latestMessage: getAuthoredText('ui.chat.latest.default'),
  latestMentionMessage: getAuthoredText('ui.chat.latest.mention'),
  pinnedMissingSource: getAuthoredText('ui.chat.pinned.missing_source'),
  pinnedHighlightOnly: getAuthoredText('ui.chat.pinned.highlight_only')
} as const;

export const APP_RUNTIME_CHAT_CONTENT: ChatContentEntry[] = [
  ...SANDBOX_PREHEAT_CHAT_SEQUENCE.map((entry, index) => ({
    mode: 'sandbox',
    category: 'sandbox_preheat',
    key: `sandbox.preheat.${index + 1}`,
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: `authoredChatContent["sandbox.preheat.${index + 1}"]`,
    text: entry.text,
    tokens: [
      ...(entry.text.includes('@activeUser') ? [ACTIVE_USER_TOKEN] : []),
      ...(entry.user === '{sandboxVipHandle}' ? [{ token: '{sandboxVipHandle}', description: 'Resolved sandbox VIP handle.', runtimeSource: 'SANDBOX_VIP.handle' }] : [])
    ],
    flowStep: 'PREHEAT_CHAT',
    status: 'active',
    notes: entry.kind === 'join' ? 'Preheat system join line owned by editable content layer.' : 'Preheat ambient chat line owned by editable content layer.'
  })),
  ...SANDBOX_GLITCH_BURST_LINES.map((entry, index) => ({
    mode: 'sandbox',
    category: 'sandbox_glitch',
    key: `sandbox.glitch.answer_eval.${index + 1}`,
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: `authoredChatContent["sandbox.glitch.answer_eval.${index + 1}"]`,
    text: entry.line,
    flowStep: 'ANSWER_EVAL',
    status: 'active',
    notes: `Glitch burst line emitted by ${entry.username} during ANSWER_EVAL.`
  })),
  {
    mode: 'sandbox',
    category: 'sandbox_vip_summary',
    key: 'sandbox.vip_summary.1',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["sandbox.vip_summary.1"]',
    text: SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_1,
    flowStep: 'VIP_SUMMARY_1',
    status: 'active',
    notes: 'VIP summary line dispatched during sandbox word-reveal sequence.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_vip_summary',
    key: 'sandbox.vip_summary.2',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["sandbox.vip_summary.2"]',
    text: SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_2,
    flowStep: 'VIP_SUMMARY_2',
    status: 'active',
    notes: 'Second VIP summary line dispatched during sandbox word-reveal sequence.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_prompt',
    key: 'sandbox.prompt.reveal_prompt',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["sandbox.prompt.reveal_prompt"]',
    text: SANDBOX_PROMPT_TEMPLATES.revealPrompt,
    tokens: [DYNAMIC_CONSONANT_TOKEN],
    gateType: 'consonant_answer',
    status: 'active',
    notes: 'Prompt template shown before sandbox consonant reply gate opens.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_tag_question',
    key: 'sandbox.prompt.tag_question',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["sandbox.prompt.tag_question"]',
    text: SANDBOX_PROMPT_TEMPLATES.tagQuestion,
    tokens: [ACTIVE_USER_TOKEN, DYNAMIC_INDEX_TOKEN],
    flowStep: 'TAG_PLAYER_{index}',
    gateType: 'consonant_answer',
    status: 'active',
    notes: 'Dynamic tag question template owned by editable content layer; wrapper shape still runtime-bound.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_help_hint',
    key: 'sandbox.hint.help_memory',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["sandbox.hint.help_memory"]',
    text: SANDBOX_PROMPT_TEMPLATES.helpHintWithMemory,
    tokens: [MEMORY_HINT_TOKEN],
    gateType: 'consonant_answer',
    status: 'active',
    notes: 'Help hint template using shared image-memory hint token.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_help_hint',
    key: 'sandbox.hint.help_fallback',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["sandbox.hint.help_fallback"]',
    text: SANDBOX_PROMPT_TEMPLATES.helpHintFallback,
    gateType: 'consonant_answer',
    status: 'active',
    notes: 'Fallback help hint when shared memory hint is unavailable.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_debug_text',
    key: 'sandbox.debug.warmup_reply',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["sandbox.debug.warmup_reply"]',
    text: SANDBOX_DEBUG_TEXT.warmupReply,
    flowStep: 'WAIT_WARMUP_REPLY',
    status: 'active',
    notes: 'Debug smoke-test text for sandbox warmup reply simulation.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.placeholder',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.placeholder"]',
    text: UI_TEXT.chatInputPlaceholder,
    status: 'active',
    notes: 'Chat input placeholder shown in ChatPanel.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.send.initializing',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.send.initializing"]',
    text: UI_TEXT.sendInitializing,
    status: 'active',
    notes: 'Chat send button label while app is booting.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.send.sending',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.send.sending"]',
    text: UI_TEXT.sendSending,
    status: 'active',
    notes: 'Chat send button label while sending.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.send.ready',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.send.ready"]',
    text: UI_TEXT.sendReady,
    status: 'active',
    notes: 'Default chat send button label.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.latest.default',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.latest.default"]',
    text: UI_TEXT.latestMessage,
    status: 'active',
    notes: 'Jump-to-latest button label.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.latest.mention',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.latest.mention"]',
    text: UI_TEXT.latestMentionMessage,
    status: 'active',
    notes: 'Jump-to-latest mention button label.'
  },
  {
    mode: 'shared',
    category: 'fallback',
    key: 'ui.chat.pinned.missing_source',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.pinned.missing_source"]',
    text: UI_TEXT.pinnedMissingSource,
    status: 'active',
    notes: 'Pinned preview fallback when original source message is gone.'
  },
  {
    mode: 'shared',
    category: 'debug_text',
    key: 'ui.chat.pinned.highlight_only',
    sourceFile: 'src/content/chat-content/editable/authoredChatContent.json',
    sourceSymbol: 'authoredChatContent["ui.chat.pinned.highlight_only"]',
    text: UI_TEXT.pinnedHighlightOnly,
    status: 'active',
    notes: 'Debug note when pinned sandbox content is highlight-only.'
  }
];

export function renderSandboxPromptTemplate(template: string, params: Record<string, string | number>) {
  return template.replace(/\{([^}]+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}
