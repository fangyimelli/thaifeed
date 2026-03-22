import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  authoredContentPath,
  editableDir,
  generatedManifestPath,
  loadManifest,
  loadTsModule,
  repoRoot,
  writerWorkspacePath
} from './chat-content-artifacts-lib.mjs';

const manifest = loadManifest();
const authoredContent = JSON.parse(fs.readFileSync(authoredContentPath, 'utf8'));
const directEditableKeys = new Set(Object.keys(authoredContent));
const modes = ['classic', 'sandbox', 'shared'];
const writerDocPath = path.join(repoRoot, 'docs/sandbox-chat-writer-workspace.md');
const reviewDocPath = path.join(repoRoot, 'docs/sandbox-shared-message-review.md');
const classicCategoryReviewDocPath = path.join(repoRoot, 'docs/classic-message-review.md');
const classicFlowReviewDocPath = path.join(repoRoot, 'docs/classic-flow-message-review.md');

const { CLASSIC_FLOW_DEFINITION, CLASSIC_FLOW_CONTENT_ROUTES, CLASSIC_CONTENT_OWNERSHIP } = loadTsModule(path.join(repoRoot, 'src/modes/classic/flow/classicFlowDefinition.ts'));
const { SANDBOX_FLOW_DEFINITION, SANDBOX_FLOW_CONTENT_ROUTES, SANDBOX_CONTENT_OWNERSHIP } = loadTsModule(path.join(repoRoot, 'src/modes/sandbox/flow/sandboxFlowDefinition.ts'));
const { MODE_OWNERSHIP_MAP, SHARED_FRAMEWORK_OWNERSHIP, LEGACY_COMPATIBILITY_LAYER } = loadTsModule(path.join(repoRoot, 'src/content/chat-content/modeOwnership.ts'));

function sourceOfTruthFor(entry) {
  if (entry.status === 'inferred_runtime_wrapper') return 'runtime_wrapper';
  if (entry.status === 'legacy') return 'legacy';
  if (entry.status === 'parallel') return 'parallel';
  return 'registry';
}

function importTargetFor(entry) {
  if (directEditableKeys.has(entry.key)) return 'src/content/chat-content/editable/authoredChatContent.json';
  if (entry.status === 'inferred_runtime_wrapper') return 'runtime_wrapper_only';
  if (entry.status === 'legacy') return 'legacy_reference_only';
  if (entry.status === 'parallel') return 'parallel_reference_only';
  return 'manual_review_required';
}

function editableFor(entry) {
  return directEditableKeys.has(entry.key);
}

function reviewStatusFor(entry) {
  if (editableFor(entry)) return 'approved';
  if (entry.status === 'inferred_runtime_wrapper' || entry.status === 'legacy' || entry.status === 'parallel') return 'locked';
  return 'draft';
}

function previewText(entry) {
  if (entry.text) return entry.text;
  if (entry.textVariants?.length) return entry.textVariants.join(' / ');
  return '';
}

function formatList(items) {
  return items?.length ? items.join(', ') : 'none';
}

function formatTokens(tokens) {
  return tokens?.length ? tokens.map((token) => `${token.token} (${token.description})`).join('; ') : 'none';
}

function reviewImportabilityFor(entry) {
  return entry.mode === 'classic'
    ? 'classic review-only / not importable'
    : editableFor(entry)
      ? 'editable / importable via authoredChatContent.json'
      : 'review-only / not importable';
}

function reviewRuntimeWrapperFor(entry) {
  if (entry.status !== 'inferred_runtime_wrapper') return 'none';
  return `inferred_runtime_wrapper :: ${entry.sourceSymbol}`;
}

function stepUsageContext(step, route, entry) {
  const scope = entry.status === 'inferred_runtime_wrapper' ? 'runtime adapter visibility' : 'player-facing message content';
  return `${step.stepId} (${route.primaryCategory} primary; allowed ${formatList(route.allowedCategories)}) → ${scope}.`;
}

function stepConstraints(step, route, entry) {
  const constraints = [
    ...(step.styleConstraints || []).map((item) => typeof item === 'string' ? item : item.description),
    ...(route.styleConstraints || []),
    entry.status === 'inferred_runtime_wrapper'
      ? 'Review template tone + token framing only; do not treat wrapper as editable import source.'
      : 'Keep flow intent, category ownership, and existing runtime selection assumptions intact.'
  ];
  return Array.from(new Set(constraints)).join(' | ');
}

function buildDraftEntry(entry) {
  return {
    ...entry,
    currentText: entry.text,
    currentVariants: entry.textVariants,
    editable: editableFor(entry),
    sourceOfTruth: sourceOfTruthFor(entry),
    importTarget: importTargetFor(entry),
    reviewStatus: reviewStatusFor(entry)
  };
}

const drafts = new Map();
for (const mode of modes) {
  const entries = manifest
    .filter((entry) => entry.mode === mode)
    .map(buildDraftEntry)
    .sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key));
  const categories = [];
  for (const entry of entries) {
    const last = categories[categories.length - 1];
    if (!last || last.category !== entry.category) categories.push({ category: entry.category, entries: [entry] });
    else last.entries.push(entry);
  }
  drafts.set(mode, {
    mode,
    generatedAt: new Date().toISOString(),
    summary: {
      totalEntries: entries.length,
      editableEntries: entries.filter((entry) => entry.editable).length,
      lockedEntries: entries.filter((entry) => !entry.editable).length
    },
    categories
  });
}

fs.writeFileSync(generatedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
for (const mode of modes) {
  fs.writeFileSync(path.join(editableDir, `${mode}-chat-draft.json`), `${JSON.stringify(drafts.get(mode), null, 2)}\n`);
}

const byMode = manifest.reduce((acc, entry) => {
  acc[entry.mode] = acc[entry.mode] || [];
  acc[entry.mode].push(entry);
  return acc;
}, {});
const countByCategory = manifest.reduce((acc, entry) => {
  acc[entry.category] = (acc[entry.category] || 0) + 1;
  return acc;
}, {});

const escapePipes = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
let md = '# Chat Content Audit Manifest\n\n';
md += 'This document is generated from `src/content/chat-content/chatContentManifest.ts`.\n\n';
md += '## Counts by mode\n\n';
for (const mode of modes) md += `- ${mode}: ${(byMode[mode] || []).length}\n`;
md += '\n## Counts by category\n\n';
for (const [category, count] of Object.entries(countByCategory).sort((a, b) => a[0].localeCompare(b[0]))) md += `- ${category}: ${count}\n`;
for (const mode of modes) {
  const entries = (byMode[mode] || []).slice().sort((a, b) => a.key.localeCompare(b.key));
  md += `\n## ${mode}\n\n`;
  md += '| key | category | owner | ownership | status | source | flow/gate | text / variants | notes |\n';
  md += '| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  for (const entry of entries) {
    const flowGate = [entry.flowStep, entry.gateType, entry.eventKey, entry.qnaFlowId, entry.questionId].filter(Boolean).join(' · ');
    md += `| ${escapePipes(entry.key)} | ${escapePipes(entry.category)} | ${escapePipes(entry.ownerMode || entry.mode)} | ${escapePipes(entry.ownership || '-')} | ${escapePipes(entry.status)} | ${escapePipes(`${entry.sourceFile}#${entry.sourceSymbol}`)} | ${escapePipes(flowGate)} | ${escapePipes(previewText(entry))} | ${escapePipes(entry.notes || '')} |\n`;
  }
}
fs.writeFileSync(path.join(repoRoot, 'docs/chat-content-audit-manifest.md'), md);

let preview = '# Chat Content Editable Preview\n\n';
preview += 'Generated from the manifest plus editable ownership classification.\n\n';
for (const mode of modes) {
  const draft = drafts.get(mode);
  preview += `## ${mode}\n\n`;
  preview += `- totalEntries: ${draft.summary.totalEntries}\n`;
  preview += `- editableEntries: ${draft.summary.editableEntries}\n`;
  preview += `- lockedEntries: ${draft.summary.lockedEntries}\n\n`;
  preview += '| category | key | current editable text | tokens | sourceOfTruth | importTarget | editable | reviewStatus |\n';
  preview += '| --- | --- | --- | --- | --- | --- | --- | --- |\n';
  for (const category of draft.categories) {
    for (const entry of category.entries) {
      const text = entry.currentText || (entry.currentVariants?.join(' / ') ?? '');
      const tokens = (entry.tokens || []).map((token) => token.token).join(', ');
      preview += `| ${escapePipes(category.category)} | ${escapePipes(entry.key)} | ${escapePipes(text)} | ${escapePipes(tokens)} | ${escapePipes(entry.sourceOfTruth)} | ${escapePipes(entry.importTarget)} | ${entry.editable ? 'yes' : 'no'} | ${escapePipes(entry.reviewStatus)} |\n`;
    }
  }
  preview += '\n';
}
fs.writeFileSync(path.join(repoRoot, 'docs/chat-content-editable-preview.md'), preview);

function buildFlowDoc({ title, mode, definition, routes, ownership }) {
  let out = `# ${title}\n\n`;
  out += `Generated from mode-specific flow definition and content map for **${mode}** mode.\n\n`;
  if (mode === 'classic') out += '- Companion review packet: `docs/classic-flow-message-review.md` (flow-first) and `docs/classic-message-review.md` (category-first).\n\n';
  if (mode === 'sandbox') out += '- Companion review packet: `docs/sandbox-shared-message-review.md` for editable sandbox/shared review.\n\n';
  out += '## Flow definition\n\n';
  out += '| stepId | purpose | canReply | gateType | uiSurface | allowed categories | next steps | blocked reasons | notes |\n';
  out += '| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  for (const step of definition) {
    out += `| ${step.stepId} | ${escapePipes(step.stepPurpose)} | ${step.canReply ? 'yes' : 'no'} | ${step.gateType} | ${escapePipes(step.uiSurface.join(', '))} | ${escapePipes(step.allowedMessageCategories.join(', '))} | ${escapePipes(step.nextStepCandidates.join(', '))} | ${escapePipes(step.blockedReasons.join(', '))} | ${escapePipes(step.notes || '')} |\n`;
  }
  out += '\n## Step -> categories\n\n';
  out += '| stepId | primaryCategory | optionalCategories | messagePurpose | tonePackSupport | runtimeSelectionPolicy | notes |\n';
  out += '| --- | --- | --- | --- | --- | --- | --- |\n';
  for (const route of routes) {
    out += `| ${route.stepId} | ${route.primaryCategory} | ${escapePipes((route.optionalCategories || []).join(', '))} | ${escapePipes(route.messagePurpose)} | ${route.tonePackSupport ? 'true' : 'false'} | ${route.runtimeSelectionPolicy} | ${escapePipes(route.notes || '')} |\n`;
  }
  out += '\n## Category ownership\n\n';
  out += '| category | ownership | sourceStatus | allowedStepIds | messagePurpose | tonePackSupport | notes |\n';
  out += '| --- | --- | --- | --- | --- | --- | --- |\n';
  for (const row of ownership) {
    out += `| ${row.category} | ${row.ownership} | ${row.sourceStatus} | ${escapePipes(row.allowedStepIds.join(', '))} | ${escapePipes(row.messagePurpose)} | ${row.tonePackSupport ? 'true' : 'false'} | ${escapePipes(row.notes || '')} |\n`;
  }
  return out;
}

const CLASSIC_STEP_REVIEW_GUIDANCE = {
  EVENT_OPENER: {
    playerExperienceSummary: '玩家通常先看到事件開場白，以被點名或被針對的方式進入事件主題。主聲音是 NPC / 系統導向的事件台詞，目的是立刻建立情境與壓力。',
    reviewNotesForStep: '最不能破壞的是事件鉤子、被點名感與短聊天節奏；若 opener 不清楚，後續 reaction / QnA 會失去上下文。'
  },
  EVENT_REACTION_WINDOW: {
    playerExperienceSummary: '玩家看到的是事件開場後的群眾回應波，可能混入環境聊天、贊助或假 AI 的陪襯聲音，但主聲音仍是觀眾反應。',
    reviewNotesForStep: '最不能破壞的是「這是開場後的反應窗」而不是新事件；核心 reaction 要短、快、能補強剛剛發生的事。'
  },
  QNA_ASKING: {
    playerExperienceSummary: '玩家在這一步會看到題目被正式送進聊天室，常帶有 @taggedUser 與選項包裝。主聲音是題目提示 / 系統引導，有時會被 fake AI 陪襯。',
    reviewNotesForStep: '最不能破壞的是提問本體、選項包裝與 tagged-user 結構；這一步定義玩家接下來要回答什麼。'
  },
  QNA_AWAITING_REPLY: {
    playerExperienceSummary: '玩家已看到問題並且能回覆。主聲音仍是題目提示，但背景可穿插環境聊天或 donate，以維持聊天室仍在流動。',
    reviewNotesForStep: '最不能破壞的是「玩家仍在回答同一題」的專注感；任何陪襯內容都不能蓋過 active QnA prompt。'
  },
  QNA_RETRY_OR_UNKNOWN: {
    playerExperienceSummary: '玩家剛給了模糊、錯誤或需要重試的回答，因此看到 retry / unknown 類的提醒。主聲音是題目提示的糾正或引導。',
    reviewNotesForStep: '最不能破壞的是重試導向與問題範圍；文案必須把玩家帶回原題，而不是開新話題。'
  },
  QNA_RESOLVED: {
    playerExperienceSummary: '玩家完成回答後，聊天室回到收束與放鬆狀態。主聲音多半回到觀眾 / 環境 / donate / fake AI 的後續餘波，而不是正式題目提示。',
    reviewNotesForStep: '最不能破壞的是「題目已結束」的感受；不得讓玩家誤以為 reply gate 仍然開著。若目前只有 wrapper-level runtime 收束，也要明說缺少顯式池。'
  },
  QNA_ABORTED: {
    playerExperienceSummary: '玩家這一步感受到題目被中止、超時或放棄，聊天室應迅速回到安全 fallback 或環境聊天。主聲音是短恢復語氣，不再繼續考問。',
    reviewNotesForStep: '最不能破壞的是快速脫離失敗分支；不能留下半題、半包裝、半開啟的 reply gate 錯覺。'
  },
  AMBIENT_ONLY: {
    playerExperienceSummary: '玩家只看到自由流動的聊天室，主聲音是觀眾 / 假 AI / donate 等背景 chatter，沒有事件或題目主線搶焦點。',
    reviewNotesForStep: '最不能破壞的是「純環境」感；內容可以豐富，但不能像新事件 opener 或新題目 prompt。'
  },
  FALLBACK_ONLY: {
    playerExperienceSummary: '玩家看到的是安全保底訊息，通常發生在其他來源不可用或被 guard 擋下時。主聲音偏系統安全網，不追求戲劇性。',
    reviewNotesForStep: '最不能破壞的是安全、簡短、可無縫接回正常流程；此處不應承擔事件或 QnA 的主要敘事工作。'
  }
};

const CLASSIC_WRAPPER_STEP_LINKS = {
  QNA_ASKING: true,
  QNA_AWAITING_REPLY: true,
  QNA_RETRY_OR_UNKNOWN: true,
  QNA_RESOLVED: true,
  QNA_ABORTED: true
};

function buildClassicReviewEntry(step, route, entry) {
  const currentField = entry.currentText
    ? `- currentText: ${entry.currentText}`
    : `- currentVariants: ${formatList(entry.currentVariants)}`;
  return [
    `#### ${entry.key}`,
    '',
    `- key: ${entry.key}`,
    `- category: ${entry.category}`,
    currentField,
    `- sourceFile: ${entry.sourceFile}`,
    `- sourceSymbol: ${entry.sourceSymbol}`,
    `- sourceOfTruth: ${entry.sourceOfTruth}`,
    `- ownership: ${entry.ownership ?? 'unset'}`,
    `- ownerMode: ${entry.ownerMode ?? entry.mode}`,
    `- status: ${entry.status}`,
    `- eventKey: ${entry.eventKey ?? 'n/a'}`,
    `- qnaFlowId: ${entry.qnaFlowId ?? 'n/a'}`,
    `- questionId: ${entry.questionId ?? 'n/a'}`,
    `- tokens: ${formatTokens(entry.tokens)}`,
    `- messagePurpose: ${entry.messagePurpose ?? 'unset'}`,
    `- tonePack: ${entry.tonePack ?? '未設定'}`,
    `- runtimeWrapper: ${reviewRuntimeWrapperFor(entry)}`,
    `- importability: ${reviewImportabilityFor(entry)}`,
    `- usageContext: ${stepUsageContext(step, route, entry)}`,
    `- constraints: ${stepConstraints(step, route, entry)}`,
    `- reviewSlot: pending`,
    ''
  ].join('\n');
}

function buildClassicCategoryReviewDoc(classicDraft) {
  let out = '# Classic Message Review Packet\n\n';
  out += 'This document is generated for classic **source/category review**. It is a review packet only and is **not** an import source.\n\n';
  out += '## Purpose split\n\n';
  out += '- `docs/classic-message-review.md`: source/category-first review for auditors who want to inspect content pools by category.\n';
  out += '- `docs/classic-flow-message-review.md`: flow/player-experience-first review for auditors who want to inspect what the player sees step by step.\n';
  out += '- Classic remains review-first; neither packet creates an editable import path.\n\n';
  for (const category of classicDraft.categories) {
    out += `## ${category.category}\n\n`;
    out += `- totalEntries: ${category.entries.length}\n`;
    out += `- importability: classic review-only / not importable\n\n`;
    for (const entry of category.entries) {
      out += `### ${entry.key}\n\n`;
      out += `- status: ${entry.status}\n`;
      out += `- sourceFile: ${entry.sourceFile}\n`;
      out += `- sourceSymbol: ${entry.sourceSymbol}\n`;
      out += `- sourceOfTruth: ${entry.sourceOfTruth}\n`;
      out += `- ownership: ${entry.ownership ?? 'unset'} / ownerMode: ${entry.ownerMode ?? entry.mode}\n`;
      out += entry.currentText
        ? `- currentText: ${entry.currentText}\n`
        : `- currentVariants: ${formatList(entry.currentVariants)}\n`;
      out += `- tokens: ${formatTokens(entry.tokens)}\n`;
      out += `- runtimeWrapper: ${reviewRuntimeWrapperFor(entry)}\n`;
      out += `- reviewSlot: pending\n\n`;
    }
  }
  return out;
}

function buildClassicFlowReviewDoc({ classicDraft, manifest, definition, routes, ownership }) {
  const classicEntries = manifest
    .filter((entry) => entry.mode === 'classic')
    .map(buildDraftEntry);
  const routeByStepId = new Map(routes.map((route) => [route.stepId, route]));
  const ownershipByCategory = new Map(ownership.map((row) => [row.category, row]));
  const qnaWrappers = classicEntries.filter((entry) => entry.status === 'inferred_runtime_wrapper');

  let out = '# Classic Flow Message Review Packet\n\n';
  out += 'This document is generated for **flow-first classic review**. It is for human review only, follows player-facing step order, and must **not** be used as an import source.\n\n';
  out += '## Review boundary\n\n';
  out += '- Classic mode remains review-first.\n';
  out += '- Importability for every classic entry is locked to `classic review-only / not importable`.\n';
  out += '- Step grouping comes from `classicFlowDefinition.ts` + `classicContentMap.ts`; this packet does not redefine runtime ownership.\n';
  out += '- Runtime wrappers are shown explicitly when present or when a step depends on them, but they remain non-editable runtime/inferred references.\n\n';
  out += '## Purpose split\n\n';
  out += '- `docs/classic-flow-message-review.md`: flow/player-experience-first packet.\n';
  out += '- `docs/classic-message-review.md`: source/category-first packet.\n\n';
  out += '## Totals\n\n';
  out += `- classic draft entries: ${classicEntries.length}\n`;
  out += `- classic runtime wrapper entries: ${qnaWrappers.length}\n`;
  out += `- classic editable entries: 0\n`;
  out += `- import boundary: classic review-only / not importable\n\n`;

  for (const step of definition) {
    const route = routeByStepId.get(step.stepId);
    assert(route, `missing classic route for ${step.stepId}`);
    const baseEntries = classicEntries.filter((entry) => route.allowedCategories.includes(entry.category));
    const relatedWrappers = CLASSIC_WRAPPER_STEP_LINKS[step.stepId] ? qnaWrappers : [];
    const stepEntries = Array.from(new Map([...baseEntries, ...relatedWrappers].map((entry) => [entry.key, entry])).values())
      .sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key));
    const sourceFiles = Array.from(new Set(stepEntries.map((entry) => entry.sourceFile))).sort();
    const stepStatuses = Array.from(new Set(stepEntries.map((entry) => entry.status))).sort();
    const guidance = CLASSIC_STEP_REVIEW_GUIDANCE[step.stepId] ?? {
      playerExperienceSummary: step.stepPurpose,
      reviewNotesForStep: step.notes || 'Keep flow semantics intact.'
    };

    out += `## ${step.stepId}\n\n`;
    out += `- stepId: ${step.stepId}\n`;
    out += `- stepPurpose: ${step.stepPurpose}\n`;
    out += `- canReply: ${step.canReply ? 'yes' : 'no'}\n`;
    out += `- gateType: ${step.gateType}\n`;
    out += `- allowedCategories: ${formatList(route.allowedCategories)}\n`;
    out += `- primaryCategory: ${route.primaryCategory}\n`;
    out += `- optionalCategories: ${formatList(route.optionalCategories)}\n`;
    out += `- runtimeSelectionPolicy: ${route.runtimeSelectionPolicy}\n`;
    out += `- playerExperienceSummary: ${guidance.playerExperienceSummary}\n`;
    out += `- reviewNotesForStep: ${guidance.reviewNotesForStep}\n`;
    out += `- sourceFilesInStep: ${formatList(sourceFiles)}\n`;
    out += `- stepEntryCount: ${stepEntries.length}\n`;
    out += `- stepStatuses: ${formatList(stepStatuses)}\n`;
    out += `- categoryOwnershipSummary:\n`;
    for (const category of route.allowedCategories) {
      const ownershipRow = ownershipByCategory.get(category);
      out += `  - ${category}: ${ownershipRow ? `${ownershipRow.ownership} / ${ownershipRow.sourceStatus} / allowedStepIds=${formatList(ownershipRow.allowedStepIds)}` : 'missing ownership metadata'}\n`;
    }
    if (CLASSIC_WRAPPER_STEP_LINKS[step.stepId]) {
      out += `- runtimeWrapperVisibility: related qna prompt wrappers stay visible because this step either emits, reuses, or exits a wrapped classic prompt.\n`;
    } else {
      out += `- runtimeWrapperVisibility: no inferred wrapper is primary for this step.\n`;
    }
    out += '\n';

    out += '### Review framing\n\n';
    out += `- 玩家通常看到什麼：${guidance.playerExperienceSummary}\n`;
    out += `- 主要聲音：${route.primaryCategory === 'event_dialog' ? '事件 / NPC / 系統事件台詞' : route.primaryCategory === 'event_reaction' ? '觀眾反應' : route.primaryCategory.startsWith('qna_') ? '題目提示 / 引導' : route.primaryCategory === 'ambient_chat' ? '觀眾 / 環境聊天' : '安全 fallback / 系統保底'}\n`;
    out += `- 體驗目的：${route.messagePurpose}\n`;
    out += `- 最不能破壞：${guidance.reviewNotesForStep}\n\n`;

    out += '### Message entries\n\n';
    if (!stepEntries.length) {
      out += '- No explicit manifest entries map to this step yet. Reviewers should treat this as runtime-wrapper-only / ownership-only metadata.\n\n';
    } else {
      for (const entry of stepEntries) out += `${buildClassicReviewEntry(step, route, entry)}\n`;
    }

    const wrappersForStep = stepEntries.filter((entry) => entry.status === 'inferred_runtime_wrapper');
    out += '### Runtime wrapper review\n\n';
    if (!wrappersForStep.length) {
      out += '- No dedicated inferred runtime wrapper entry is emitted directly in this step. If the runtime still assembles a closing / abort / resolved line, that behavior remains runtime-owned and non-importable.\n\n';
    } else {
      for (const wrapper of wrappersForStep) {
        const baseKey = wrapper.key.replace(/\.runtime_wrapper$/, '.prompt');
        out += `- wrapper key: ${wrapper.key}\n`;
        out += `  - wraps base content: ${baseKey}\n`;
        out += `  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）\n`;
        out += `  - dynamic tokens / options / labels: ${formatTokens(wrapper.tokens)}\n`;
        out += `  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.\n`;
        out += `  - importability: classic review-only / not importable\n`;
        out += `  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.\n`;
      }
      out += '\n';
    }
  }
  return out;
}

fs.writeFileSync(path.join(repoRoot, 'docs/classic-flow-table.md'), buildFlowDoc({
  title: 'Classic Flow Table',
  mode: 'classic',
  definition: CLASSIC_FLOW_DEFINITION,
  routes: CLASSIC_FLOW_CONTENT_ROUTES,
  ownership: CLASSIC_CONTENT_OWNERSHIP
}));

fs.writeFileSync(path.join(repoRoot, 'docs/sandbox-flow-table.md'), buildFlowDoc({
  title: 'Sandbox Flow Table',
  mode: 'sandbox',
  definition: SANDBOX_FLOW_DEFINITION,
  routes: SANDBOX_FLOW_CONTENT_ROUTES,
  ownership: SANDBOX_CONTENT_OWNERSHIP
}));

const classicDraft = drafts.get('classic');
fs.writeFileSync(classicCategoryReviewDocPath, buildClassicCategoryReviewDoc(classicDraft));
fs.writeFileSync(classicFlowReviewDocPath, buildClassicFlowReviewDoc({
  classicDraft,
  manifest,
  definition: CLASSIC_FLOW_DEFINITION,
  routes: CLASSIC_FLOW_CONTENT_ROUTES,
  ownership: CLASSIC_CONTENT_OWNERSHIP
}));

let ownershipDoc = '# Mode Ownership Map\n\n';
ownershipDoc += 'Generated from the mode ownership metadata used by runtime/docs/tooling adapters.\n\n';
ownershipDoc += '## Shared framework\n\n';
ownershipDoc += SHARED_FRAMEWORK_OWNERSHIP.framework.map((file) => `- ${file}`).join('\n') + '\n\n';
ownershipDoc += SHARED_FRAMEWORK_OWNERSHIP.rules.map((rule) => `- ${rule}`).join('\n') + '\n\n';
ownershipDoc += '## Future entrypoints\n\n';
ownershipDoc += `- Classic flow: ${MODE_OWNERSHIP_MAP.classic.futureEditEntrypoints.flow}\n`;
ownershipDoc += `- Classic content: ${MODE_OWNERSHIP_MAP.classic.futureEditEntrypoints.content}\n`;
ownershipDoc += `- Sandbox flow: ${MODE_OWNERSHIP_MAP.sandbox.futureEditEntrypoints.flow}\n`;
ownershipDoc += `- Sandbox content: ${MODE_OWNERSHIP_MAP.sandbox.futureEditEntrypoints.content}\n\n`;
ownershipDoc += '## Legacy / parallel compatibility layer\n\n';
ownershipDoc += LEGACY_COMPATIBILITY_LAYER.runtimeWrappers.map((item) => `- runtime_wrapper: ${item}`).join('\n') + '\n';
ownershipDoc += LEGACY_COMPATIBILITY_LAYER.parallelSources.map((item) => `- parallel: ${item}`).join('\n') + '\n\n';
ownershipDoc += '## Ownership matrix\n\n';
ownershipDoc += '| scope | owner | future changes go to |\n';
ownershipDoc += '| --- | --- | --- |\n';
ownershipDoc += `| classic flow/content | classic mode | ${MODE_OWNERSHIP_MAP.classic.futureEditEntrypoints.flow} / ${MODE_OWNERSHIP_MAP.classic.futureEditEntrypoints.content} |\n`;
ownershipDoc += `| sandbox flow/content | sandbox mode | ${MODE_OWNERSHIP_MAP.sandbox.futureEditEntrypoints.flow} / ${MODE_OWNERSHIP_MAP.sandbox.futureEditEntrypoints.content} |\n`;
ownershipDoc += '| shared schema/ui/tooling | shared framework | schema / tooling files listed above only |\n';
ownershipDoc += '| legacy / parallel adapters | compatibility layer | dedicated migration patch before promotion |\n';
fs.writeFileSync(path.join(repoRoot, 'docs/mode-ownership-map.md'), ownershipDoc);

const workspace = JSON.parse(fs.readFileSync(writerWorkspacePath, 'utf8'));
assert.equal(workspace.importBoundary?.workspaceImportsDirectly, false, 'writer workspace must not import directly');
assert.equal(workspace.importBoundary?.runtimeImportReadsWorkspace, false, 'runtime import boundary drifted');
assert.equal(workspace.importBoundary?.requiresDraftSync, true, 'writer workspace must sync through drafts');

const manifestByKey = new Map(manifest.map((entry) => [entry.key, entry]));
const editableDraftEntries = ['sandbox', 'shared']
  .flatMap((mode) => drafts.get(mode).categories.flatMap((category) => category.entries))
  .filter((entry) => entry.editable && entry.importTarget === 'src/content/chat-content/editable/authoredChatContent.json');
const editableDraftByKey = new Map(editableDraftEntries.map((entry) => [entry.key, entry]));
const workspaceEntries = workspace.batches.flatMap((batch) => batch.entries.map((entry) => ({ batch, entry })));
const workspaceKeys = new Set();
const workspaceCountsByMode = {};

for (const { batch, entry } of workspaceEntries) {
  assert(!workspaceKeys.has(entry.key), `duplicate workspace key ${entry.key}`);
  workspaceKeys.add(entry.key);
  const draftEntry = editableDraftByKey.get(entry.key);
  const manifestEntry = manifestByKey.get(entry.key);
  assert(draftEntry, `workspace key missing from editable drafts: ${entry.key}`);
  assert(manifestEntry, `workspace key missing from manifest: ${entry.key}`);
  assert.equal(entry.mode, draftEntry.mode, `workspace mode mismatch for ${entry.key}`);
  assert.notEqual(entry.mode, 'classic', `workspace must not include classic keys: ${entry.key}`);
  assert.equal(entry.category, draftEntry.category, `workspace category mismatch for ${entry.key}`);
  assert.equal(entry.sourceOfTruth, draftEntry.sourceOfTruth, `workspace sourceOfTruth drift for ${entry.key}`);
  assert.equal(entry.importTarget, draftEntry.importTarget, `workspace importTarget drift for ${entry.key}`);
  assert.equal(entry.reviewStatus, draftEntry.reviewStatus, `workspace reviewStatus drift for ${entry.key}`);
  assert.equal(entry.currentText, authoredContent[entry.key], `workspace currentText drift for ${entry.key}`);
  assert.deepEqual((entry.tokens || []).map((token) => token.token), (draftEntry.tokens || []).map((token) => token.token), `workspace token drift for ${entry.key}`);
  assert.equal(entry.batchId, batch.batchId, `workspace batchId mismatch for ${entry.key}`);
  assert(typeof entry.usageContext === 'string' && entry.usageContext.trim().length > 0, `workspace usageContext missing for ${entry.key}`);
  assert(typeof entry.scenePurpose === 'string' && entry.scenePurpose.trim().length > 0, `workspace scenePurpose missing for ${entry.key}`);
  assert(typeof entry.constraints === 'string' && entry.constraints.trim().length > 0, `workspace constraints missing for ${entry.key}`);
  assert(Array.isArray(entry.altRewriteIdeas), `workspace altRewriteIdeas missing for ${entry.key}`);
  assert(Array.isArray(entry.bannedPatterns), `workspace bannedPatterns missing for ${entry.key}`);
  workspaceCountsByMode[entry.mode] = (workspaceCountsByMode[entry.mode] || 0) + 1;
}

assert.equal(workspaceKeys.size, editableDraftEntries.length, 'workspace editable totals must match editable drafts');
for (const entry of editableDraftEntries) assert(workspaceKeys.has(entry.key), `editable draft key missing from workspace: ${entry.key}`);
assert.deepEqual(workspace.summary.editableEntriesByMode, workspaceCountsByMode, 'workspace mode totals drift');
assert.equal(workspace.summary.totalEditableEntries, editableDraftEntries.length, 'workspace totalEditableEntries drift');
assert.equal(workspace.summary.sandboxEditableEntries, editableDraftEntries.filter((entry) => entry.mode === 'sandbox').length, 'workspace sandbox total drift');
assert.equal(workspace.summary.sharedEditableEntries, editableDraftEntries.filter((entry) => entry.mode === 'shared').length, 'workspace shared total drift');

let writerDoc = '# Sandbox / Shared Chat Writer Workspace\n\n';
writerDoc += 'This document is generated from `src/content/chat-content/editable/sandbox-chat-writer-workspace.json`. Edit the workspace JSON for creative planning, then sync approved rewrites into the editable drafts before import.\n\n';
writerDoc += '## Import boundary\n\n';
writerDoc += '- Writer workspace is planning-only metadata and proposal storage.\n';
writerDoc += '- Runtime import still reads `sandbox-chat-draft.json` / `shared-chat-draft.json`, never this workspace file.\n';
writerDoc += '- Preserve all listed tokens, flow order hints, and UI limits when drafting rewrites.\n\n';
writerDoc += '## Totals\n\n';
writerDoc += `- totalEditableEntries: ${workspace.summary.totalEditableEntries}\n`;
writerDoc += `- sandboxEditableEntries: ${workspace.summary.sandboxEditableEntries}\n`;
writerDoc += `- sharedEditableEntries: ${workspace.summary.sharedEditableEntries}\n\n`;
writerDoc += '## Batch grouping\n\n';
for (const batch of workspace.batches) {
  writerDoc += `### ${batch.batchId}\n\n`;
  writerDoc += `- Trigger window: ${batch.triggerWindow}\n`;
  writerDoc += `- Player activity: ${batch.playerActivity}\n`;
  writerDoc += `- Tone function: ${batch.toneFunction}\n`;
  writerDoc += `- Must keep tokens: ${(batch.mustKeepTokens || []).join(', ') || 'none'}\n`;
  writerDoc += `- Length caution: ${batch.lengthCaution}\n`;
  writerDoc += `- Keys: ${batch.entries.map((entry) => `\`${entry.key}\``).join(', ')}\n\n`;
}
fs.writeFileSync(writerDocPath, writerDoc);

const reviewEntries = workspace.batches.flatMap((batch) => batch.entries.map((entry) => ({ batch, entry })));
const proposedCount = reviewEntries.filter(({ entry }) => typeof entry.proposedRewrite === 'string' && entry.proposedRewrite.trim().length > 0).length;
let reviewDoc = '# Sandbox / Shared Message Review Packet\n\n';
reviewDoc += 'This document is generated for per-message review only. It does **not** sync or import rewrites into runtime content. Approved changes should still go through `workspace -> draft sync -> import` after review.\n\n';
reviewDoc += '## Review boundary\n\n';
reviewDoc += '- Scope: sandbox mode + shared content layer only.\n';
reviewDoc += '- Classic mode remains review-first and is intentionally excluded from this packet.\n';
reviewDoc += '- `reviewCandidate` below is for human review readability only; it is not an import source.\n\n';
reviewDoc += '## Totals\n\n';
reviewDoc += `- total messages in packet: ${reviewEntries.length}\n`;
reviewDoc += `- sandbox messages: ${workspace.summary.sandboxEditableEntries}\n`;
reviewDoc += `- shared messages: ${workspace.summary.sharedEditableEntries}\n`;
reviewDoc += `- messages with proposed rewrite filled: ${proposedCount}\n`;
reviewDoc += `- messages still pending rewrite: ${reviewEntries.length - proposedCount}\n\n`;
fs.writeFileSync(reviewDocPath, reviewDoc);
