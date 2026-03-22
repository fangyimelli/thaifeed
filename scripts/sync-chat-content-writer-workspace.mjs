import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  editableDir,
  repoRoot,
  writerWorkspacePath,
  generatedManifestPath
} from './chat-content-artifacts-lib.mjs';

const authoredTarget = 'src/content/chat-content/editable/authoredChatContent.json';
const workspace = JSON.parse(fs.readFileSync(writerWorkspacePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(generatedManifestPath, 'utf8'));
const manifestByKey = new Map(manifest.map((entry) => [entry.key, entry]));
const drafts = new Map(['sandbox', 'shared'].map((mode) => [mode, JSON.parse(fs.readFileSync(path.join(editableDir, `${mode}-chat-draft.json`), 'utf8'))]));
const draftByKey = new Map();
for (const [mode, draft] of drafts) {
  for (const category of draft.categories || []) {
    for (const entry of category.entries || []) {
      if (entry.editable && entry.importTarget === authoredTarget) draftByKey.set(entry.key, { mode, entry });
    }
  }
}

const workspaceEntries = workspace.batches.flatMap((batch) => batch.entries);
const seenKeys = new Set();
for (const entry of workspaceEntries) {
  assert(!seenKeys.has(entry.key), `duplicate workspace key ${entry.key}`);
  seenKeys.add(entry.key);
  const draftRef = draftByKey.get(entry.key);
  const manifestEntry = manifestByKey.get(entry.key);
  assert(draftRef, `workspace key missing from editable drafts: ${entry.key}`);
  assert(manifestEntry, `workspace key missing from manifest: ${entry.key}`);
  assert.equal(entry.mode, draftRef.mode, `workspace mode mismatch for ${entry.key}`);
  assert.equal(entry.importTarget, authoredTarget, `workspace importTarget mismatch for ${entry.key}`);
  assert.equal(entry.sourceOfTruth, 'registry', `workspace sourceOfTruth mismatch for ${entry.key}`);
  assert.notEqual(entry.mode, 'classic', `classic key cannot enter writer workspace: ${entry.key}`);
  assert.deepEqual((entry.tokens || []).map((token) => token.token), (draftRef.entry.tokens || []).map((token) => token.token), `token drift for ${entry.key}`);
}
assert.equal(seenKeys.size, draftByKey.size, 'workspace editable total must match editable drafts');

const updates = [];
for (const entry of workspaceEntries) {
  const draftRef = draftByKey.get(entry.key);
  const nextText = typeof entry.proposedRewrite === 'string' && entry.proposedRewrite.trim().length > 0
    ? entry.proposedRewrite
    : entry.currentText;
  assert.equal(typeof nextText, 'string', `next text missing for ${entry.key}`);
  draftRef.entry.currentText = nextText;
  updates.push({ key: entry.key, mode: entry.mode, appliedText: nextText, fromProposal: nextText === entry.proposedRewrite && nextText !== '' });
}

for (const [mode, draft] of drafts) {
  fs.writeFileSync(path.join(editableDir, `${mode}-chat-draft.json`), `${JSON.stringify(draft, null, 2)}\n`);
}

console.log(`synced ${updates.length} writer workspace entries into editable drafts`);
for (const update of updates) {
  console.log(`- ${update.key} [${update.mode}] <= ${update.fromProposal ? 'proposedRewrite' : 'currentText'}`);
}
console.log('next step: run node scripts/import-chat-content-editable.mjs when draft review is ready');
