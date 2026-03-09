import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const mode = fs.readFileSync(new URL('../src/modes/sandbox_story/sandboxStoryMode.ts', import.meta.url), 'utf8');

const requiredModeFields = [
  'reveal',
  'replyGate',
  'lastReplyEval',
  'techBacklog',
  'theory',
  'transitions'
];

for (const field of requiredModeFields) {
  if (!mode.includes(field)) {
    throw new Error(`missing required sandbox v2 mode field: ${field}`);
  }
}

const requiredAppDebugFields = [
  'currentPrompt',
  'blockedReason'
];

for (const field of requiredAppDebugFields) {
  if (!app.includes(field)) {
    throw new Error(`missing required sandbox v2 debug field in app: ${field}`);
  }
}

const forbiddenLegacyAccess = [
  'st.mismatch.promptVsReveal',
  'sandboxState.mismatch.promptVsReveal',
  'sandbox.prompt.overlay',
  'sandbox.prompt.pinned',
  'sandbox.prompt.mismatch'
];

for (const legacy of forbiddenLegacyAccess) {
  if (app.includes(legacy)) {
    throw new Error(`legacy sandbox debug access still exists: ${legacy}`);
  }
}

if (!app.includes('isSandboxPromptRevealMismatch')) {
  throw new Error('missing safe mismatch guard helper');
}

if (!app.includes('?.sandbox?.currentPrompt?.id ??')) {
  throw new Error('debug panel no longer uses safe fallback for currentPrompt');
}

console.log('sandbox v2 regression guards passed');
