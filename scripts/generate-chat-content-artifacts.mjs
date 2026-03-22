import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, '.tmp-chat-content-build');
const entry = path.join(repoRoot, 'src/content/chat-content/chatContentManifest.ts');
const editableDir = path.join(repoRoot, 'src/content/chat-content/editable');
const authoredContentPath = path.join(editableDir, 'authoredChatContent.json');

fs.rmSync(outDir, { recursive: true, force: true });
execFileSync('npx', [
  'tsc',
  entry,
  '--module', 'commonjs',
  '--target', 'es2022',
  '--moduleResolution', 'node',
  '--resolveJsonModule',
  '--esModuleInterop',
  '--skipLibCheck',
  '--outDir', outDir
], { cwd: repoRoot, stdio: 'inherit' });
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));

const compiledEntry = path.join(outDir, 'content/chat-content/chatContentManifest.js');
const require = createRequire(import.meta.url);
const mod = require(compiledEntry);
const manifest = mod.CHAT_CONTENT_MANIFEST;
if (!Array.isArray(manifest)) throw new Error('CHAT_CONTENT_MANIFEST missing');

const authoredContent = JSON.parse(fs.readFileSync(authoredContentPath, 'utf8'));
const directEditableKeys = new Set(Object.keys(authoredContent));
const modes = ['classic', 'sandbox', 'shared'];

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

const snapshotPath = path.join(repoRoot, 'src/content/chat-content/chatContentManifest.generated.json');
fs.writeFileSync(snapshotPath, `${JSON.stringify(manifest, null, 2)}\n`);
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

console.log(`generated ${snapshotPath}`);
console.log('generated editable drafts and preview docs');
