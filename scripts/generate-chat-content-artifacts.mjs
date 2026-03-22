import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  authoredContentPath,
  editableDir,
  generatedManifestPath,
  loadManifest,
  repoRoot,
  writerWorkspacePath
} from './chat-content-artifacts-lib.mjs';

const manifest = loadManifest();
const authoredContent = JSON.parse(fs.readFileSync(authoredContentPath, 'utf8'));
const directEditableKeys = new Set(Object.keys(authoredContent));
const modes = ['classic', 'sandbox', 'shared'];
const writerDocPath = path.join(repoRoot, 'docs/sandbox-chat-writer-workspace.md');

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
    if (!last || last.category !== entry.category) {
      categories.push({ category: entry.category, entries: [entry] });
    } else {
      last.entries.push(entry);
    }
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
  md += '| key | category | status | source | flow/gate | text / variants | notes |\n';
  md += '| --- | --- | --- | --- | --- | --- | --- |\n';
  for (const entry of entries) {
    const flowGate = [entry.flowStep, entry.gateType, entry.eventKey, entry.qnaFlowId, entry.questionId].filter(Boolean).join(' · ');
    md += `| ${escapePipes(entry.key)} | ${escapePipes(entry.category)} | ${escapePipes(entry.status)} | ${escapePipes(`${entry.sourceFile}#${entry.sourceSymbol}`)} | ${escapePipes(flowGate)} | ${escapePipes(previewText(entry))} | ${escapePipes(entry.notes || '')} |\n`;
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
for (const entry of editableDraftEntries) {
  assert(workspaceKeys.has(entry.key), `editable draft key missing from workspace: ${entry.key}`);
}
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
  writerDoc += '| key | current text | tokens | flow step / gate | UI surface | editable | writer notes | suggested direction | hard limits |\n';
  writerDoc += '| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  for (const entry of batch.entries) {
    const flowGate = [entry.relatedFlowStep, entry.relatedGateType].filter(Boolean).join(' / ');
    const tokens = (entry.tokens || []).map((token) => token.token).join(', ');
    const currentText = entry.currentText || (entry.currentVariants?.join(' / ') ?? '');
    writerDoc += `| ${escapePipes(entry.key)} | ${escapePipes(currentText)} | ${escapePipes(tokens)} | ${escapePipes(flowGate)} | ${escapePipes(entry.relatedUiSurface)} | ${entry.reviewStatus === 'approved' ? 'yes' : 'no'} | ${escapePipes(entry.notesForWriter)} | ${escapePipes(entry.toneGoal)} | ${escapePipes(entry.constraints)} |\n`;
  }
  writerDoc += '\n';
  for (const entry of batch.entries) {
    writerDoc += `#### ${entry.key}\n\n`;
    writerDoc += `- Current text: ${entry.currentText ? `\`${entry.currentText}\`` : escapePipes(entry.currentVariants?.join(' / ') ?? '')}\n`;
    writerDoc += `- Tokens: ${(entry.tokens || []).map((token) => `\`${token.token}\``).join(', ') || 'none'}\n`;
    writerDoc += `- Flow step: ${entry.relatedFlowStep}\n`;
    writerDoc += `- Gate type: ${entry.relatedGateType}\n`;
    writerDoc += `- UI surface: ${entry.relatedUiSurface}\n`;
    writerDoc += `- Text function: ${entry.textFunction}\n`;
    writerDoc += `- Sentence shape: ${entry.sentenceShape}\n`;
    writerDoc += `- Atmosphere focus: ${entry.atmosphereFocus.join(' / ')}\n`;
    writerDoc += `- Usage context: ${entry.usageContext}\n`;
    writerDoc += `- Scene purpose: ${entry.scenePurpose}\n`;
    writerDoc += `- Writer notes: ${entry.notesForWriter}\n`;
    writerDoc += `- Suggested writing direction: ${entry.toneGoal}\n`;
    writerDoc += `- Non-negotiable constraints: ${entry.constraints}\n`;
    writerDoc += `- Suggested length: ${entry.suggestedLength}\n`;
    writerDoc += `- Proposed rewrite slot: ${entry.proposedRewrite ? `\`${entry.proposedRewrite}\`` : '(empty)' }\n`;
    writerDoc += `- Alt rewrite ideas: ${(entry.altRewriteIdeas || []).map((idea) => `\`${idea}\``).join('；') || 'none'}\n`;
    writerDoc += `- Avoid / banned patterns: ${(entry.bannedPatterns || []).map((idea) => `\`${idea}\``).join('；') || 'none'}\n\n`;
  }
}
fs.writeFileSync(writerDocPath, writerDoc);

console.log(`generated ${generatedManifestPath}`);
console.log('generated editable drafts, preview docs, and writer workspace doc');
