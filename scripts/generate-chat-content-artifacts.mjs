import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, '.tmp-chat-content-build');
const entry = path.join(repoRoot, 'src/content/chat-content/chatContentManifest.ts');

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

const snapshotPath = path.join(repoRoot, 'src/content/chat-content/chatContentManifest.generated.json');
fs.writeFileSync(snapshotPath, `${JSON.stringify(manifest, null, 2)}\n`);

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
const previewText = (entry) => {
  if (entry.text) return entry.text;
  if (entry.textVariants?.length) return entry.textVariants.join(' / ');
  return '';
};

let md = '# Chat Content Audit Manifest\n\n';
md += 'This document is generated from `src/content/chat-content/chatContentManifest.ts`.\n\n';
md += '## Counts by mode\n\n';
for (const mode of ['classic', 'sandbox', 'shared']) {
  md += `- ${mode}: ${(byMode[mode] || []).length}\n`;
}
md += '\n## Counts by category\n\n';
for (const [category, count] of Object.entries(countByCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
  md += `- ${category}: ${count}\n`;
}

for (const mode of ['classic', 'sandbox', 'shared']) {
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
console.log(`generated ${snapshotPath}`);
console.log(`generated docs/chat-content-audit-manifest.md with ${manifest.length} entries`);
