import donatePools from '../pools/donatePools.json';
import fakeAiReplies from '../fakeAI/replies.json';
import { SAFE_FALLBACK_POOL, SYSTEM_POOLS, TYPE_FALLBACK_POOLS, PERSONA_POOLS } from '../../chat/ChatPools';
import { ChatMessageType } from '../../chat/ChatTypes';
import { EVENT_DIALOGS } from '../../core/events/eventDialogs';
import { EVENT_REACTION_POOL } from '../../core/events/eventReactions';
import { QNA_FLOWS } from '../../game/qna/qnaFlows';
import { SANDBOX_CONSONANT_WORD_MAP } from '../../modes/sandbox_story/sandboxConsonantWordMap';
import { AUTHORITATIVE_CONSONANT_BANK } from '../../shared/consonant-engine/consonantBank';
import { SHARED_CONSONANT_QUESTION_BANK } from '../../shared/consonant-engine/questionBank';
import { buildConsonantHint } from '../../shared/hints/consonantHint';
import { SANDBOX_CHAT_ENGINE_STUB_LINES } from '../../sandbox/chat/chat_engine';
import { APP_RUNTIME_CHAT_CONTENT, SANDBOX_PROMPT_TEMPLATES } from './appRuntimeContent';
import { CLASSIC_CONTENT_MAP } from './maps/classicContentMap';
import { SANDBOX_CONTENT_MAP } from './maps/sandboxContentMap';
import type { ChatContentEntry } from './schema';


const CATEGORY_OWNERSHIP = new Map(
  [...CLASSIC_CONTENT_MAP.categories, ...SANDBOX_CONTENT_MAP.categories].map((entry) => [entry.category, entry])
);

function withOwnership(entry: ChatContentEntry): ChatContentEntry {
  const ownership = CATEGORY_OWNERSHIP.get(entry.category);
  if (!ownership) return entry;
  return {
    ...entry,
    ownerMode: ownership.mode,
    ownership: ownership.ownership,
    messagePurpose: entry.messagePurpose ?? ownership.messagePurpose,
    tonePack: entry.tonePack ?? ownership.tonePack?.[0] ?? null,
    intensity: entry.intensity ?? ownership.intensity?.[0] ?? null,
    styleConstraints: entry.styleConstraints ?? ownership.styleConstraints,
    selectionPolicy: entry.selectionPolicy ?? ownership.selectionPolicy ?? null
  };
}

const typeCategoryMap: Partial<Record<ChatMessageType, ChatContentEntry['category']>> = {
  [ChatMessageType.SYSTEM_PROMPT]: 'ambient_chat',
  [ChatMessageType.FEAR_SELF_DOUBT]: 'ambient_chat',
  [ChatMessageType.DREAD_BUILDUP]: 'ambient_chat',
  [ChatMessageType.SOCIAL_REPLY]: 'ambient_chat',
  [ChatMessageType.UI_STATUS]: 'ui_placeholder',
  [ChatMessageType.IDLE_BORING]: 'ambient_chat',
  [ChatMessageType.SFX_REACT_FAN]: 'ambient_chat',
  [ChatMessageType.SFX_REACT_FOOTSTEPS]: 'ambient_chat',
  [ChatMessageType.SFX_REACT_GHOST]: 'ambient_chat',
  [ChatMessageType.SCENE_FLICKER_REACT]: 'ambient_chat'
};

const typeKeyMap = Object.entries(TYPE_FALLBACK_POOLS).reduce<Record<string, string>>((acc, [key]) => {
  acc[key] = String(key).toLowerCase();
  return acc;
}, {});

const classicPoolEntries: ChatContentEntry[] = [
  ...Object.entries(SYSTEM_POOLS).map(([poolKey, variants]) => ({
    mode: 'classic',
    category: poolKey === 'ui_status' ? 'ui_placeholder' : 'ambient_chat',
    key: `classic.system.${poolKey}`,
    sourceFile: 'src/chat/ChatPools.ts',
    sourceSymbol: `SYSTEM_POOLS.${poolKey}`,
    textVariants: variants,
    status: 'active',
    notes: 'Classic system/UI pool stored in ChatPools.'
  })),
  ...Object.entries(TYPE_FALLBACK_POOLS).map(([typeKey, variants]) => ({
    mode: 'classic',
    category: typeCategoryMap[typeKey as ChatMessageType] ?? 'ambient_chat',
    key: `classic.pool.${typeKeyMap[typeKey]}`,
    sourceFile: 'src/chat/ChatPools.ts',
    sourceSymbol: `TYPE_FALLBACK_POOLS.${typeKey}`,
    textVariants: variants,
    status: 'active',
    notes: 'Classic fallback pool by chat message type.'
  })),
  {
    mode: 'classic',
    category: 'fallback',
    key: 'classic.pool.safe_fallback',
    sourceFile: 'src/chat/ChatPools.ts',
    sourceSymbol: 'SAFE_FALLBACK_POOL',
    textVariants: SAFE_FALLBACK_POOL,
    status: 'active',
    notes: 'Shared safe fallback pool used by classic engine and App lint rerolls.'
  },
  ...Object.entries(PERSONA_POOLS).flatMap(([persona, pools]) =>
    Object.entries(pools).map(([typeKey, variants]) => ({
      mode: 'classic',
      category: 'ambient_chat',
      key: `classic.persona.${persona}.${String(typeKey).toLowerCase()}`,
      sourceFile: 'src/chat/ChatPools.ts',
      sourceSymbol: `PERSONA_POOLS.${persona}.${typeKey}`,
      textVariants: variants,
      status: 'active',
      notes: 'Classic persona-specific chat pool.'
    }))
  )
];

const eventDialogEntries: ChatContentEntry[] = Object.entries(EVENT_DIALOGS).flatMap(([eventKey, dialog]) =>
  Object.entries(dialog).map(([phase, variants]) => ({
    mode: 'classic',
    category: 'event_dialog',
    key: `classic.event_dialog.${eventKey.toLowerCase()}.${phase}`,
    sourceFile: 'src/core/events/eventDialogs.ts',
    sourceSymbol: `EVENT_DIALOGS.${eventKey}.${phase}`,
    textVariants: variants.map((variant) => variant.text),
    tokens: [{ token: '${activeUser}', description: 'Injected active user handle.', runtimeSource: 'pickDialog(..., activeUser, ...)' }],
    eventKey,
    status: 'active',
    notes: 'Classic event dialogue variants selected by event phase.'
  }))
);

const eventReactionEntries: ChatContentEntry[] = Object.entries(EVENT_REACTION_POOL).map(([topic, variants]) => ({
  mode: 'classic',
  category: 'event_reaction',
  key: `classic.event_reaction.${topic}`,
  sourceFile: 'src/core/events/eventReactions.ts',
  sourceSymbol: `EVENT_REACTION_POOL.${topic}`,
  textVariants: variants.map((variant) => variant.text),
  eventKey: topic.toUpperCase(),
  status: 'active',
  notes: 'Classic event reaction wave lines.'
}));

const qnaEntries: ChatContentEntry[] = Object.values(QNA_FLOWS).flatMap((flow) => flow.steps.flatMap((step) => {
  const entries: ChatContentEntry[] = [
    {
      mode: 'classic',
      category: 'qna_prompt',
      key: `classic.qna.${flow.id}.${step.id}.prompt`,
      sourceFile: 'src/game/qna/qnaFlows.ts',
      sourceSymbol: `QNA_FLOWS.${flow.id}.steps.${step.id}.questionVariants`,
      textVariants: step.questionVariants,
      eventKey: flow.eventKey,
      qnaFlowId: flow.id,
      questionId: step.id,
      status: 'active',
      notes: 'Classic QnA question variants.'
    }
  ];
  if (step.retryPromptVariants?.length) {
    entries.push({
      mode: 'classic',
      category: 'qna_retry',
      key: `classic.qna.${flow.id}.${step.id}.retry`,
      sourceFile: 'src/game/qna/qnaFlows.ts',
      sourceSymbol: `QNA_FLOWS.${flow.id}.steps.${step.id}.retryPromptVariants`,
      textVariants: step.retryPromptVariants,
      eventKey: flow.eventKey,
      qnaFlowId: flow.id,
      questionId: step.id,
      status: 'active',
      notes: 'Classic QnA retry prompt variants.'
    });
  }
  if (step.unknownPromptVariants?.length) {
    entries.push({
      mode: 'classic',
      category: 'qna_unknown',
      key: `classic.qna.${flow.id}.${step.id}.unknown`,
      sourceFile: 'src/game/qna/qnaFlows.ts',
      sourceSymbol: `QNA_FLOWS.${flow.id}.steps.${step.id}.unknownPromptVariants`,
      textVariants: step.unknownPromptVariants,
      eventKey: flow.eventKey,
      qnaFlowId: flow.id,
      questionId: step.id,
      status: 'active',
      notes: 'Classic QnA unknown/help prompt variants.'
    });
  }
  entries.push({
    mode: 'classic',
    category: 'qna_prompt',
    key: `classic.qna.${flow.id}.${step.id}.runtime_wrapper`,
    sourceFile: 'src/app/App.tsx',
    sourceSymbol: 'line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`',
    text: '@{taggedUser} {question}（選項：{optionLabels}）',
    tokens: [
      { token: '@{taggedUser}', description: 'Tagged player mention wrapper.', runtimeSource: 'qnaStateRef.current.active.taggedUserHandle' },
      { token: '{question}', description: 'Picked QnA question variant.', runtimeSource: 'askCurrentQuestion(...).text' },
      { token: '{optionLabels}', description: 'Joined option labels.', runtimeSource: 'asked.options.map(...).join(" / ")' }
    ],
    eventKey: flow.eventKey,
    qnaFlowId: flow.id,
    questionId: step.id,
    status: 'inferred_runtime_wrapper',
    notes: 'Actual classic chat line wrapper assembled in App before dispatch.'
  });
  return entries;
}));

const donateEntries: ChatContentEntry[] = donatePools.messages.map((message, index) => ({
  mode: 'classic',
  category: 'donate',
  key: `classic.donate.${index + 1}`,
  sourceFile: 'src/content/pools/donatePools.json',
  sourceSymbol: 'donatePools.messages',
  text: message.zh,
  textVariants: [message.th, message.zh],
  status: 'active',
  notes: 'Donate pool entry with Thai/Chinese variants.'
}));

const fakeAiEntries: ChatContentEntry[] = [
  ...Object.entries(fakeAiReplies.anchors).map(([anchorKey, value]) => ({
    mode: 'classic',
    category: 'fake_ai',
    key: `classic.fake_ai.anchor.${anchorKey}`,
    sourceFile: 'src/content/fakeAI/replies.json',
    sourceSymbol: `replies.anchors.${anchorKey}.zhOnly`,
    textVariants: value.zhOnly,
    status: 'active',
    notes: 'Anchor-specific fake AI zh-only lines.'
  })),
  {
    mode: 'classic',
    category: 'fake_ai',
    key: 'classic.fake_ai.urban_legend.zh',
    sourceFile: 'src/content/fakeAI/replies.json',
    sourceSymbol: 'replies.urbanLegend_zh',
    textVariants: fakeAiReplies.urbanLegend_zh,
    status: 'active',
    notes: 'Urban legend Chinese fake AI lines.'
  },
  {
    mode: 'classic',
    category: 'fake_ai',
    key: 'classic.fake_ai.urban_legend.th',
    sourceFile: 'src/content/fakeAI/replies.json',
    sourceSymbol: 'replies.urbanLegend_th',
    textVariants: fakeAiReplies.urbanLegend_th,
    status: 'active',
    notes: 'Urban legend Thai fake AI lines.'
  },
  {
    mode: 'classic',
    category: 'fake_ai',
    key: 'classic.fake_ai.thai_flood',
    sourceFile: 'src/content/fakeAI/replies.json',
    sourceSymbol: 'replies.thaiFlood',
    textVariants: fakeAiReplies.thaiFlood,
    status: 'active',
    notes: 'Thai flood fake AI lines.'
  }
];

const sandboxEntries: ChatContentEntry[] = [
  ...APP_RUNTIME_CHAT_CONTENT,
  {
    mode: 'sandbox',
    category: 'sandbox_crowd_reaction',
    key: 'sandbox.prompt.stub.crowd_react_word',
    sourceFile: 'src/sandbox/chat/chat_engine.ts',
    sourceSymbol: 'SANDBOX_CHAT_ENGINE_STUB_LINES.crowdReactWord',
    text: SANDBOX_CHAT_ENGINE_STUB_LINES.crowdReactWord,
    flowStep: 'CROWD_REACT_WORD',
    status: 'parallel',
    notes: 'Sandbox chat engine stub line; placeholder until full crowd-react registry exists.'
  },
  {
    mode: 'sandbox',
    category: 'sandbox_stub',
    key: 'sandbox.prompt.stub.reasoning_wave',
    sourceFile: 'src/sandbox/chat/chat_engine.ts',
    sourceSymbol: 'SANDBOX_CHAT_ENGINE_STUB_LINES.reasoningWave',
    text: SANDBOX_CHAT_ENGINE_STUB_LINES.reasoningWave,
    flowStep: 'DISCUSS_PRONOUNCE',
    status: 'parallel',
    notes: 'Sandbox chat engine stub reasoning line.'
  },
  ...SANDBOX_CONSONANT_WORD_MAP.map((entry) => ({
    mode: 'sandbox',
    category: 'sandbox_prompt',
    key: `sandbox.word_map.${entry.questionId}`,
    sourceFile: 'src/modes/sandbox_story/sandboxConsonantWordMap.ts',
    sourceSymbol: 'SANDBOX_CONSONANT_WORD_MAP',
    text: `${entry.thaiWord} / ${entry.translationZh}`,
    questionId: entry.questionId,
    status: 'parallel',
    notes: 'Legacy/parallel sandbox word map retained for compatibility with night content.'
  }))
];

const sharedEntries: ChatContentEntry[] = [
  ...AUTHORITATIVE_CONSONANT_BANK.map((entry) => ({
    mode: 'shared',
    category: 'sandbox_help_hint',
    key: `shared.consonant.${entry.consonant}`,
    sourceFile: 'src/shared/consonant-engine/consonantBank.ts',
    sourceSymbol: 'AUTHORITATIVE_CONSONANT_BANK',
    text: entry.imageMemoryHint,
    questionId: entry.consonant,
    status: 'active',
    notes: 'Shared consonant memory hint used by sandbox help hint composition.'
  })),
  ...SHARED_CONSONANT_QUESTION_BANK.map((question) => ({
    mode: 'shared',
    category: 'sandbox_prompt',
    key: `shared.question.${question.questionId}`,
    sourceFile: 'src/shared/consonant-engine/questionBank.ts',
    sourceSymbol: 'SHARED_CONSONANT_QUESTION_BANK',
    text: question.promptText,
    questionId: question.questionId,
    status: 'active',
    notes: 'Shared consonant prompt bank used by classic adapter and import audit.'
  })),
  {
    mode: 'shared',
    category: 'sandbox_help_hint',
    key: 'shared.hint.consonant_template',
    sourceFile: 'src/shared/hints/consonantHint.ts',
    sourceSymbol: 'buildConsonantHint',
    text: buildConsonantHint({ expected: '{expected}', aliases: ['{alias1}', '{alias2}'] }),
    tokens: [
      { token: '{expected}', description: 'Expected consonant injected by caller.' },
      { token: '{alias1}', description: 'Optional accepted alias token 1.' },
      { token: '{alias2}', description: 'Optional accepted alias token 2.' }
    ],
    status: 'active',
    notes: 'Shared hint template builder rendered with placeholder tokens for audit visibility.'
  },
  {
    mode: 'shared',
    category: 'sandbox_prompt',
    key: 'shared.runtime.sandbox_prompt_template',
    sourceFile: 'src/content/chat-content/appRuntimeContent.ts',
    sourceSymbol: 'SANDBOX_PROMPT_TEMPLATES.revealPrompt',
    text: SANDBOX_PROMPT_TEMPLATES.revealPrompt,
    status: 'active',
    notes: 'Shared prompt template consumed by sandboxStoryMode and App.'
  },
  {
    mode: 'shared',
    category: 'fallback',
    key: 'shared.classic.safe_fallback',
    sourceFile: 'src/chat/ChatPools.ts',
    sourceSymbol: 'SAFE_FALLBACK_POOL',
    textVariants: SAFE_FALLBACK_POOL,
    status: 'parallel',
    notes: 'Fallback pool remains shared across classic runtime, App lint reroll, and legacy v2 engine.'
  }
];

export const CHAT_CONTENT_MANIFEST: ChatContentEntry[] = [
  ...classicPoolEntries,
  ...eventDialogEntries,
  ...eventReactionEntries,
  ...qnaEntries,
  ...donateEntries,
  ...fakeAiEntries,
  ...sandboxEntries,
  ...sharedEntries
].map(withOwnership).sort((a, b) => a.key.localeCompare(b.key));

export function getChatContentEntriesByMode(mode: ChatContentEntry['mode']) {
  return CHAT_CONTENT_MANIFEST.filter((entry) => entry.mode === mode);
}

export function getChatContentEntriesByCategory(category: ChatContentEntry['category']) {
  return CHAT_CONTENT_MANIFEST.filter((entry) => entry.category === category);
}
