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
