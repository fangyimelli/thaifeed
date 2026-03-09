import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const mode = fs.readFileSync(new URL('../src/modes/sandbox_story/sandboxStoryMode.ts', import.meta.url), 'utf8');

const requiredInitialShape = [
  'ssot: { version:',
  'nightId:',
  "flow: { step: 'BOOT'",
  'scheduler: { phase: \'BOOTSTRAP\', blockedReason: \'\' }',
  'currentPrompt:',
  'replyGate:',
  'lastReplyEval:',
  'techBacklog:',
  'theory:',
  'unresolvedAmbient:',
  'ghostMotion:',
  'blockedReason:'
];

for (const field of requiredInitialShape) {
  if (!mode.includes(field)) throw new Error(`missing required sandbox v2 initial field: ${field}`);
}

if (!mode.includes('let state: any = createSandboxV2InitialState();')) {
  throw new Error('sandbox_story root runtime is not mounted from v2 initial state');
}

if (!app.includes('ssot: sandboxState.ssot')) {
  throw new Error('debug hydration is not mapped from real sandbox root state (ssot)');
}

if (!app.includes('flow: {\n          step: sandboxState.flow.step')) {
  throw new Error('debug hydration is not mapped from real sandbox flow state');
}

if (!app.includes('version: sandboxState.ssot?.version || sandboxSsotVersion')) {
  throw new Error('sandbox.ssot.version guard missing');
}

if (!app.includes('step: sandboxState.flow.step') || !app.includes('phase: sandboxState.scheduler.phase')) {
  throw new Error('flow.step/scheduler.phase should not rely on legacy fallback after mode entry');
}

console.log('sandbox v2 regression guards passed');
