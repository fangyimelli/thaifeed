import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const editableDir = path.join(repoRoot, 'src/content/chat-content/editable');
const authoredContentPath = path.join(editableDir, 'authoredChatContent.json');
const manifestPath = path.join(repoRoot, 'src/content/chat-content/chatContentManifest.generated.json');
const modes = ['classic', 'sandbox', 'shared'];

execFileSync('node', ['scripts/generate-chat-content-artifacts.mjs'], { cwd: repoRoot, stdio: 'inherit' });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestByKey = new Map(manifest.map((entry) => [entry.key, entry]));
const authoredContent = JSON.parse(fs.readFileSync(authoredContentPath, 'utf8'));
const nextAuthoredContent = { ...authoredContent };
const seenKeys = new Set();

function fail(message) {
  throw new Error(message);
}

for (const mode of modes) {
  const draftPath = path.join(editableDir, `${mode}-chat-draft.json`);
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  assert.equal(draft.mode, mode, `draft mode mismatch for ${draftPath}`);
  for (const category of draft.categories || []) {
    for (const entry of category.entries || []) {
      if (seenKeys.has(entry.key)) fail(`duplicate key across drafts: ${entry.key}`);
      seenKeys.add(entry.key);
      const manifestEntry = manifestByKey.get(entry.key);
      if (!manifestEntry) fail(`draft key missing from manifest: ${entry.key}`);
      if (manifestEntry.mode !== mode) fail(`mode mismatch for ${entry.key}`);
      if (manifestEntry.category !== entry.category) fail(`category mismatch for ${entry.key}`);
      const manifestTokens = JSON.stringify((manifestEntry.tokens || []).map((token) => token.token));
      const draftTokens = JSON.stringify((entry.tokens || []).map((token) => token.token));
      if (manifestTokens !== draftTokens) fail(`token mismatch for ${entry.key}`);
      if (entry.editable) {
        if (entry.reviewStatus === 'locked') fail(`editable key cannot be locked: ${entry.key}`);
        if (entry.importTarget !== 'src/content/chat-content/editable/authoredChatContent.json') fail(`unsupported import target for editable key: ${entry.key}`);
        if (typeof entry.currentText !== 'string') fail(`editable key missing currentText: ${entry.key}`);
        nextAuthoredContent[entry.key] = entry.currentText;
      } else {
        if (entry.reviewStatus !== 'locked' && entry.importTarget !== 'manual_review_required') {
          fail(`non-editable key must be locked or manual-review only: ${entry.key}`);
        }
        if (entry.importTarget === 'src/content/chat-content/editable/authoredChatContent.json') {
          fail(`non-editable key cannot target authored content: ${entry.key}`);
        }
      }
    }
  }
}

for (const key of Object.keys(authoredContent)) {
  if (!seenKeys.has(key)) fail(`editable source key missing from drafts: ${key}`);
}

fs.writeFileSync(authoredContentPath, `${JSON.stringify(nextAuthoredContent, null, 2)}\n`);
execFileSync('node', ['scripts/generate-chat-content-artifacts.mjs'], { cwd: repoRoot, stdio: 'inherit' });
console.log(`updated ${path.relative(repoRoot, authoredContentPath)} from editable drafts`);
