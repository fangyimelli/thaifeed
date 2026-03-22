import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const editableDir = path.join(repoRoot, 'src/content/chat-content/editable');
const writerWorkspacePath = path.join(editableDir, 'sandbox-chat-writer-workspace.json');

execFileSync('node', ['scripts/generate-chat-content-artifacts.mjs'], { cwd: repoRoot, stdio: 'inherit' });

const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/content/chat-content/chatContentManifest.generated.json'), 'utf8'));
const app = fs.readFileSync(path.join(repoRoot, 'src/app/App.tsx'), 'utf8');
const panel = fs.readFileSync(path.join(repoRoot, 'src/ui/chat/ChatPanel.tsx'), 'utf8');
const sandboxMode = fs.readFileSync(path.join(repoRoot, 'src/modes/sandbox_story/sandboxStoryMode.ts'), 'utf8');
const authored = JSON.parse(fs.readFileSync(path.join(editableDir, 'authoredChatContent.json'), 'utf8'));
const drafts = ['classic', 'sandbox', 'shared'].map((mode) => JSON.parse(fs.readFileSync(path.join(editableDir, `${mode}-chat-draft.json`), 'utf8')));
const draftEntries = drafts.flatMap((draft) => draft.categories.flatMap((category) => category.entries));
const editableImportableDraftEntries = drafts
  .flatMap((draft) => draft.categories.flatMap((category) => category.entries))
  .filter((entry) => entry.editable && entry.importTarget === 'src/content/chat-content/editable/authoredChatContent.json');
const manifestByKey = new Map(manifest.map((entry) => [entry.key, entry]));
const draftByKey = new Map(draftEntries.map((entry) => [entry.key, entry]));
const writerWorkspace = JSON.parse(fs.readFileSync(writerWorkspacePath, 'utf8'));
const workspaceEntries = writerWorkspace.batches.flatMap((batch) => batch.entries.map((entry) => ({ batch, entry })));
const workspaceKeys = new Set();

const mustHaveKeys = [
  'classic.pool.safe_fallback',
  'classic.event_dialog.voice_confirm.opener',
  'classic.event_reaction.ghost',
  'classic.qna.voice_confirm_flow.s1.prompt',
  'sandbox.preheat.1',
  'sandbox.vip_summary.1',
  'sandbox.glitch.answer_eval.1',
  'sandbox.prompt.tag_question',
  'sandbox.hint.help_fallback',
  'shared.hint.consonant_template'
];
for (const key of mustHaveKeys) {
  assert(manifest.some((entry) => entry.key === key), `manifest missing key ${key}`);
}

assert(manifest.some((entry) => entry.status === 'parallel'), 'manifest missing parallel status entries');
assert(manifest.some((entry) => entry.status === 'inferred_runtime_wrapper'), 'manifest missing inferred runtime wrapper entries');
assert(manifest.some((entry) => (entry.tokens || []).some((token) => token.token === '@activeUser')), 'missing @activeUser token metadata');
assert(manifest.some((entry) => (entry.tokens || []).some((token) => token.token === '{imageMemoryHint}')), 'missing imageMemoryHint token metadata');

for (const [key, value] of Object.entries(authored)) {
  const draftEntry = draftByKey.get(key);
  assert(draftEntry, `editable authored key missing from drafts: ${key}`);
  assert.equal(draftEntry.editable, true, `authored key must be editable in draft: ${key}`);
  assert.equal(draftEntry.importTarget, 'src/content/chat-content/editable/authoredChatContent.json', `authored key importTarget mismatch: ${key}`);
  assert.equal(draftEntry.currentText, value, `draft text drift for ${key}`);
}

for (const entry of draftEntries) {
  const manifestEntry = manifestByKey.get(entry.key);
  assert(manifestEntry, `draft key missing from manifest: ${entry.key}`);
  assert.equal(entry.category, manifestEntry.category, `category mismatch for ${entry.key}`);
  assert.deepEqual((entry.tokens || []).map((token) => token.token), (manifestEntry.tokens || []).map((token) => token.token), `token mismatch for ${entry.key}`);
  if (!entry.editable) {
    assert.notEqual(entry.importTarget, 'src/content/chat-content/editable/authoredChatContent.json', `non-editable key points to authored content: ${entry.key}`);
    if (entry.sourceOfTruth === 'runtime_wrapper' || entry.sourceOfTruth === 'legacy' || entry.sourceOfTruth === 'parallel') {
      assert.equal(entry.reviewStatus, 'locked', `non-editable ownership should be locked: ${entry.key}`);
    }
  }
}

const manifestTotalsByMode = manifest.reduce((acc, entry) => {
  acc[entry.mode] = (acc[entry.mode] || 0) + 1;
  return acc;
}, {});
for (const draft of drafts) {
  const total = draft.categories.reduce((sum, category) => sum + category.entries.length, 0);
  assert.equal(total, manifestTotalsByMode[draft.mode], `draft total mismatch for mode ${draft.mode}`);
}

assert.equal(writerWorkspace.importBoundary.workspaceImportsDirectly, false, 'workspace must not import directly');
assert.equal(writerWorkspace.importBoundary.runtimeImportReadsWorkspace, false, 'runtime import boundary drifted to workspace');
assert.equal(writerWorkspace.importBoundary.requiresDraftSync, true, 'workspace should require draft sync step');
assert(fs.existsSync(path.join(repoRoot, 'scripts/sync-chat-content-writer-workspace.mjs')), 'missing writer workspace sync script');
for (const { batch, entry } of workspaceEntries) {
  assert(!workspaceKeys.has(entry.key), `duplicate workspace key ${entry.key}`);
  workspaceKeys.add(entry.key);
  const draftEntry = draftByKey.get(entry.key);
  assert(draftEntry, `workspace key missing from drafts: ${entry.key}`);
  assert.equal(draftEntry.editable, true, `workspace must only include editable entries: ${entry.key}`);
  assert.equal(draftEntry.importTarget, 'src/content/chat-content/editable/authoredChatContent.json', `workspace entry must stay importable: ${entry.key}`);
  assert.notEqual(entry.mode, 'classic', `workspace cannot mix classic review-only entry: ${entry.key}`);
  assert.equal(entry.batchId, batch.batchId, `workspace batch mismatch: ${entry.key}`);
  assert.equal(entry.sourceOfTruth, draftEntry.sourceOfTruth, `workspace sourceOfTruth drift: ${entry.key}`);
  assert.equal(entry.importTarget, draftEntry.importTarget, `workspace importTarget drift: ${entry.key}`);
  assert.equal(entry.reviewStatus, draftEntry.reviewStatus, `workspace reviewStatus drift: ${entry.key}`);
  assert.equal(entry.currentText, authored[entry.key], `workspace currentText drift: ${entry.key}`);
  assert.deepEqual((entry.tokens || []).map((token) => token.token), (draftEntry.tokens || []).map((token) => token.token), `workspace token drift: ${entry.key}`);
  assert(typeof entry.usageContext === 'string' && entry.usageContext.trim(), `workspace usageContext missing: ${entry.key}`);
  assert(typeof entry.scenePurpose === 'string' && entry.scenePurpose.trim(), `workspace scenePurpose missing: ${entry.key}`);
  assert(typeof entry.constraints === 'string' && entry.constraints.trim(), `workspace constraints missing: ${entry.key}`);
  assert(Array.isArray(entry.altRewriteIdeas), `workspace altRewriteIdeas missing: ${entry.key}`);
  assert(Array.isArray(entry.bannedPatterns), `workspace bannedPatterns missing: ${entry.key}`);
}
assert.equal(workspaceKeys.size, editableImportableDraftEntries.length, 'workspace totals must match editable importable totals');
for (const entry of editableImportableDraftEntries) {
  assert(workspaceKeys.has(entry.key), `editable importable draft missing from workspace: ${entry.key}`);
}
assert.equal(writerWorkspace.summary.totalEditableEntries, editableImportableDraftEntries.length, 'workspace total editable mismatch');
assert.equal(writerWorkspace.summary.sandboxEditableEntries, editableImportableDraftEntries.filter((entry) => entry.mode === 'sandbox').length, 'workspace sandbox editable mismatch');
assert.equal(writerWorkspace.summary.sharedEditableEntries, editableImportableDraftEntries.filter((entry) => entry.mode === 'shared').length, 'workspace shared editable mismatch');
assert.deepEqual(writerWorkspace.summary.editableEntriesByMode, {
  sandbox: editableImportableDraftEntries.filter((entry) => entry.mode === 'sandbox').length,
  shared: editableImportableDraftEntries.filter((entry) => entry.mode === 'shared').length
}, 'workspace editableEntriesByMode mismatch');

const extractedStrings = [
  '今天怎麼這麼多人一起在線？',
  'VIP 總結：先把剛剛那個單字記住，下一步確認發音。',
  'VIP 總結：發音方向差不多了，最後確認這個詞在指誰。',
  '暖場測試回覆'
];
for (const text of extractedStrings) {
  assert(!app.includes(text), `App.tsx still hardcodes extracted chat text: ${text}`);
}
assert(!sandboxMode.includes('請讀出剛剛閃過的字：${nextNode.char}'), 'sandboxStoryMode still hardcodes reveal prompt');
assert(panel.includes('UI_TEXT.chatInputPlaceholder'), 'ChatPanel no longer uses extracted UI text registry');
assert(app.includes('SANDBOX_PREHEAT_CHAT_SEQUENCE'), 'App should consume sandbox preheat registry');
assert(app.includes('renderSandboxPromptTemplate(SANDBOX_PROMPT_TEMPLATES.tagQuestion'), 'App should use sandbox tag question template');
assert(app.includes('SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_1'), 'App should use sandbox VIP summary template');
assert(fs.existsSync(path.join(repoRoot, 'docs/chat-content-editing-guide.md')), 'missing editing guide');
assert(fs.existsSync(path.join(repoRoot, 'docs/chat-content-import-policy.md')), 'missing import policy guide');
assert(fs.existsSync(path.join(repoRoot, 'docs/chat-content-editable-preview.md')), 'missing editable preview');
assert(fs.existsSync(path.join(repoRoot, 'docs/classic-message-review.md')), 'missing classic category review packet');
assert(fs.existsSync(path.join(repoRoot, 'docs/classic-flow-message-review.md')), 'missing classic flow-first review packet');
assert(fs.existsSync(path.join(repoRoot, 'docs/classic-flow-table.md')), 'missing classic flow table');
assert(fs.existsSync(path.join(repoRoot, 'docs/sandbox-flow-table.md')), 'missing sandbox flow table');
assert(fs.existsSync(path.join(repoRoot, 'docs/mode-ownership-map.md')), 'missing mode ownership map');
assert(fs.existsSync(path.join(repoRoot, 'docs/sandbox-chat-writer-workspace.md')), 'missing writer workspace doc');
assert(fs.existsSync(path.join(repoRoot, 'docs/sandbox-shared-message-review.md')), 'missing per-message review packet');
assert(fs.existsSync(path.join(repoRoot, '.github/pull_request_template.md')), 'missing pull request template');
assert(fs.existsSync(path.join(repoRoot, 'PR_NOTES.md')), 'missing PR_NOTES');

execFileSync('node', ['scripts/sync-chat-content-writer-workspace.mjs'], { cwd: repoRoot, stdio: 'inherit' });
execFileSync('node', ['scripts/import-chat-content-editable.mjs'], { cwd: repoRoot, stdio: 'inherit' });
execFileSync('node', ['scripts/generate-chat-content-artifacts.mjs'], { cwd: repoRoot, stdio: 'inherit' });

console.log('chat content regression guards passed');


const classicFlowDefinitionPath = path.join(repoRoot, 'src/modes/classic/flow/classicFlowDefinition.ts');
const sandboxFlowDefinitionPath = path.join(repoRoot, 'src/modes/sandbox/flow/sandboxFlowDefinition.ts');
const classicContentMapPath = path.join(repoRoot, 'src/content/chat-content/maps/classicContentMap.ts');
const sandboxContentMapPath = path.join(repoRoot, 'src/content/chat-content/maps/sandboxContentMap.ts');
const classicFlowReviewPath = path.join(repoRoot, 'docs/classic-flow-message-review.md');
const classicCategoryReviewPath = path.join(repoRoot, 'docs/classic-message-review.md');
const sandboxReviewPath = path.join(repoRoot, 'docs/sandbox-shared-message-review.md');
assert(fs.existsSync(classicFlowDefinitionPath), 'classic flow definition file missing');
assert(fs.existsSync(sandboxFlowDefinitionPath), 'sandbox flow definition file missing');
assert(fs.existsSync(classicContentMapPath), 'classic content map file missing');
assert(fs.existsSync(sandboxContentMapPath), 'sandbox content map file missing');
assert(fs.existsSync(classicFlowReviewPath), 'classic flow review doc missing after artifact generation');
assert(fs.existsSync(classicCategoryReviewPath), 'classic category review doc missing after artifact generation');
assert(fs.existsSync(sandboxReviewPath), 'sandbox/shared review doc missing after artifact generation');
const classicFlowDefinition = fs.readFileSync(classicFlowDefinitionPath, 'utf8');
const sandboxFlowDefinition = fs.readFileSync(sandboxFlowDefinitionPath, 'utf8');
const classicContentMapSource = fs.readFileSync(classicContentMapPath, 'utf8');
const sandboxContentMapSource = fs.readFileSync(sandboxContentMapPath, 'utf8');
const classicFlowReview = fs.readFileSync(classicFlowReviewPath, 'utf8');
const classicCategoryReview = fs.readFileSync(classicCategoryReviewPath, 'utf8');
const sandboxReview = fs.readFileSync(sandboxReviewPath, 'utf8');
for (const stepId of ['EVENT_OPENER','EVENT_REACTION_WINDOW','QNA_ASKING','QNA_AWAITING_REPLY','QNA_RETRY_OR_UNKNOWN','QNA_RESOLVED','QNA_ABORTED','AMBIENT_ONLY','FALLBACK_ONLY']) {
  assert(classicFlowDefinition.includes(`stepId: '${stepId}'`), `classic step missing: ${stepId}`);
  const stepSectionPattern = new RegExp(`## ${stepId}[\\s\\S]*?- stepId: ${stepId}[\\s\\S]*?- allowedCategories: .+`, 'm');
  assert(stepSectionPattern.test(classicFlowReview), `classic flow review missing required metadata for ${stepId}`);
}
for (const stepId of ['PREHEAT_CHAT','REVEAL_PROMPT','WAIT_REPLY_x','HELP_HINT','ANSWER_EVAL','VIP_SUMMARY_POST_REVEAL','TAG_QUESTION','DEBUG_SMOKE']) {
  assert(sandboxFlowDefinition.includes(`stepId: '${stepId}'`), `sandbox step missing: ${stepId}`);
}
assert(classicFlowDefinition.includes("category: 'event_dialog'"), 'classic content map missing event_dialog');
assert(classicFlowDefinition.includes("category: 'fallback'"), 'classic content map missing fallback');
assert(sandboxFlowDefinition.includes("category: 'sandbox_preheat'"), 'sandbox content map missing sandbox_preheat');
assert(sandboxFlowDefinition.includes("category: 'sandbox_stub'"), 'sandbox content map missing sandbox_stub');
assert(!classicFlowDefinition.includes('sandbox_preheat'), 'classic flow definition must not own sandbox category');
assert(!sandboxFlowDefinition.includes("'event_dialog'"), 'sandbox flow definition must not own classic event_dialog');
assert(!sandboxContentMapSource.includes("category: 'ui_placeholder'"), 'sandbox content map must not claim shared ui_placeholder');
assert(classicFlowReview.includes('classic review-only / not importable'), 'classic flow review must keep review-only import boundary');
assert(classicCategoryReview.includes('classic review-only / not importable'), 'classic category review must keep review-only import boundary');
assert(classicFlowReview.includes('inferred_runtime_wrapper'), 'classic flow review must expose inferred runtime wrappers');
assert(classicFlowReview.includes('### Runtime wrapper review'), 'classic flow review must contain runtime wrapper section');
assert(sandboxReview.includes('Classic mode remains review-first'), 'sandbox/shared review packet must preserve classic exclusion boundary');
