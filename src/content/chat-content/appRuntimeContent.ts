import type { ChatContentEntry, ChatContentToken } from './schema';

export type SandboxPreheatSequenceEntry = {
  user: string;
  text: string;
  role?: 'viewer' | 'vip' | 'mod';
  vip?: boolean;
  badge?: 'crown';
  kind: 'chat' | 'join';
};

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

export const SANDBOX_PREHEAT_CHAT_SEQUENCE: SandboxPreheatSequenceEntry[] = [
  { user: 'viewer_118', text: '今天怎麼這麼多人一起在線？', role: 'viewer', kind: 'chat' },
  { user: 'system', text: 'viewer_721 加入聊天室', kind: 'join' },
  { user: 'viewer_203', text: '我有點懷疑這台是真的假的直播…', role: 'viewer', kind: 'chat' },
  { user: '{sandboxVipHandle}', text: '上次這間真的很多人說看到鬼影。', role: 'vip', vip: true, badge: 'crown', kind: 'chat' },
  { user: 'system', text: 'viewer_823 加入聊天室', kind: 'join' },
  { user: '{sandboxVipHandle}', text: '@activeUser 你是第一次看這個台嗎？', role: 'vip', vip: true, badge: 'crown', kind: 'chat' },
  { user: 'viewer_409', text: '剛剛鏡頭邊緣是不是有東西飄過去？', role: 'viewer', kind: 'chat' },
  { user: 'system', text: 'viewer_477 加入聊天室', kind: 'join' },
  { user: 'mod_live', text: '先暖場聊天，等等再看後面有沒有異常。', role: 'mod', kind: 'chat' }
];

export const SANDBOX_GLITCH_BURST_LINES = [
  { username: 'viewer_118', line: '我這邊送出一直失敗' },
  { username: 'viewer_203', line: '聊天室是不是延遲了' },
  { username: 'viewer_409', line: '網路怪怪的，剛剛卡一下' }
] as const;

export const SANDBOX_VIP_SUMMARY_LINES = {
  VIP_SUMMARY_1: 'VIP 總結：先把剛剛那個單字記住，下一步確認發音。',
  VIP_SUMMARY_2: 'VIP 總結：發音方向差不多了，最後確認這個詞在指誰。'
} as const;

export const SANDBOX_PROMPT_TEMPLATES = {
  revealPrompt: '請讀出剛剛閃過的字：{consonant}',
  tagQuestion: '@{activeUser} 第 {index} 題，請直接回答你看到的子音。',
  helpHintWithMemory: '想一下{imageMemoryHint}那個。',
  helpHintFallback: '先想一下圖像記憶那個關鍵字。'
} as const;

export const SANDBOX_DEBUG_TEXT = {
  warmupReply: '暖場測試回覆'
} as const;

export const UI_TEXT = {
  chatInputPlaceholder: '傳送訊息',
  sendInitializing: '初始化中…',
  sendSending: '送出中…',
  sendReady: '送出',
  latestMessage: '最新訊息',
  latestMentionMessage: '@你・跳到最新',
  pinnedMissingSource: '（原始訊息已不存在）',
  pinnedHighlightOnly: '（highlight only：未 armed，不能正式回覆）'
} as const;

export const APP_RUNTIME_CHAT_CONTENT: ChatContentEntry[] = [
  ...SANDBOX_PREHEAT_CHAT_SEQUENCE.map((entry, index) => ({
    mode: 'sandbox',
    category: 'sandbox_preheat',
    key: `sandbox.preheat.${index + 1}`,
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_PREHEAT_CHAT_SEQUENCE',
    text: entry.text,
    tokens: [
      ...(entry.text.includes('@activeUser') ? [ACTIVE_USER_TOKEN] : []),
      ...(entry.user === '{sandboxVipHandle}' ? [{ token: '{sandboxVipHandle}', description: 'Resolved sandbox VIP handle.', runtimeSource: 'SANDBOX_VIP.handle' }] : [])
    ],
    flowStep: 'PREHEAT_CHAT',
    status: 'active',
    notes: entry.kind === 'join' ? 'Preheat system join line dispatched from App runtime.' : 'Preheat ambient chat line dispatched from App runtime.'
  })),
  ...SANDBOX_GLITCH_BURST_LINES.map((entry, index) => ({
    mode: 'sandbox',
    category: 'sandbox_glitch',
    key: `sandbox.glitch.answer_eval.${index + 1}`,
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_GLITCH_BURST_LINES',
    text: entry.line,
    flowStep: 'ANSWER_EVAL',
    status: 'active',
    notes: `Glitch burst line emitted by ${entry.username} during ANSWER_EVAL.`
  })),
  {
    mode: 'sandbox',
    category: 'sandbox_vip_summary',
    key: 'sandbox.vip_summary.1',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_1',
    text: SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_1,
    flowStep: 'VIP_SUMMARY_1',
    status: 'active',
    notes: 'VIP summary line dispatched during sandbox word-reveal sequence.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_vip_summary',
    key: 'sandbox.vip_summary.2',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_2',
    text: SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_2,
    flowStep: 'VIP_SUMMARY_2',
    status: 'active',
    notes: 'Second VIP summary line dispatched during sandbox word-reveal sequence.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_prompt',
    key: 'sandbox.prompt.reveal_prompt',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_PROMPT_TEMPLATES.revealPrompt',
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
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_PROMPT_TEMPLATES.tagQuestion',
    text: SANDBOX_PROMPT_TEMPLATES.tagQuestion,
    tokens: [ACTIVE_USER_TOKEN, DYNAMIC_INDEX_TOKEN],
    flowStep: 'TAG_PLAYER_{index}',
    gateType: 'consonant_answer',
    status: 'active',
    notes: 'Runtime wrapper for dynamic tag question lines emitted by App.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_help_hint',
    key: 'sandbox.hint.help_memory',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_PROMPT_TEMPLATES.helpHintWithMemory',
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
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_PROMPT_TEMPLATES.helpHintFallback',
    text: SANDBOX_PROMPT_TEMPLATES.helpHintFallback,
    gateType: 'consonant_answer',
    status: 'active',
    notes: 'Fallback help hint when shared memory hint is unavailable.'
  },
  {
    mode: 'sandbox',
    category: 'debug_text',
    key: 'sandbox.debug.warmup_reply',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_DEBUG_TEXT.warmupReply',
    text: SANDBOX_DEBUG_TEXT.warmupReply,
    flowStep: 'WAIT_WARMUP_REPLY',
    status: 'active',
    notes: 'Debug smoke-test text for sandbox warmup reply simulation.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.placeholder',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.chatInputPlaceholder',
    text: UI_TEXT.chatInputPlaceholder,
    status: 'active',
    notes: 'Chat input placeholder shown in ChatPanel.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.send.initializing',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.sendInitializing',
    text: UI_TEXT.sendInitializing,
    status: 'active',
    notes: 'Chat send button label while app is booting.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.send.sending',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.sendSending',
    text: UI_TEXT.sendSending,
    status: 'active',
    notes: 'Chat send button label while sending.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.send.ready',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.sendReady',
    text: UI_TEXT.sendReady,
    status: 'active',
    notes: 'Default chat send button label.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.latest.default',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.latestMessage',
    text: UI_TEXT.latestMessage,
    status: 'active',
    notes: 'Jump-to-latest button label.'
  },
  {
    mode: 'shared',
    category: 'ui_placeholder',
    key: 'ui.chat.latest.mention',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.latestMentionMessage',
    text: UI_TEXT.latestMentionMessage,
    status: 'active',
    notes: 'Jump-to-latest mention button label.'
  },
  {
    mode: 'shared',
    category: 'fallback',
    key: 'ui.chat.pinned.missing_source',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.pinnedMissingSource',
    text: UI_TEXT.pinnedMissingSource,
    status: 'active',
    notes: 'Pinned preview fallback when original source message is gone.'
  },
  {
    mode: 'shared',
    category: 'debug_text',
    key: 'ui.chat.pinned.highlight_only',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'UI_TEXT.pinnedHighlightOnly',
    text: UI_TEXT.pinnedHighlightOnly,
    status: 'active',
    notes: 'Debug note when pinned sandbox content is highlight-only.'
  }
];

export function renderSandboxPromptTemplate(template: string, params: Record<string, string | number>) {
  return template.replace(/\{([^}]+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}
