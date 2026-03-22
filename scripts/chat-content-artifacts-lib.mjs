import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '..');
export const editableDir = path.join(repoRoot, 'src/content/chat-content/editable');
export const authoredContentPath = path.join(editableDir, 'authoredChatContent.json');
export const writerWorkspacePath = path.join(editableDir, 'sandbox-chat-writer-workspace.json');
export const generatedManifestPath = path.join(repoRoot, 'src/content/chat-content/chatContentManifest.generated.json');
const outDir = path.join(repoRoot, '.tmp-chat-content-build');
const entry = path.join(repoRoot, 'src/content/chat-content/chatContentManifest.ts');

export function loadManifest() {
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
  return manifest;
}
