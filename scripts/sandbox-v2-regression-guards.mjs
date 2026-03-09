import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const mode = fs.readFileSync(new URL('../src/modes/sandbox_story/sandboxStoryMode.ts', import.meta.url), 'utf8');

const checks = [
  {
    name: 'mode entry starts sandbox v2 runtime',
    run() {
      if (!app.includes("ensureSandboxRuntimeStarted('mode_switch_bootstrap')")) {
        throw new Error('sandbox_story mode entry does not call runtime starter');
      }
      if (!app.includes("setFlowStep('BOOT', 'ENTER_BOOT'")) {
        throw new Error('runtime starter does not enter BOOT explicitly');
      }
      if (!app.includes("setFlowStep('PREHEAT', 'ENTER_PREHEAT_CHAT'")) {
        throw new Error('runtime starter does not transition to PREHEAT_CHAT');
      }
    }
  },
  {
    name: 'flow.step initialized',
    run() {
      if (!mode.includes("flow: { step: 'BOOT'")) {
        throw new Error('flow.step is not initialized to BOOT in v2 root state');
      }
      if (!mode.includes("questionIndex: 0")) {
        throw new Error('flow.questionIndex=0 is missing from v2 initialization');
      }
    }
  },
  {
    name: 'scheduler.phase initialized',
    run() {
      if (!mode.includes("scheduler: { phase: 'BOOTSTRAP', blockedReason: '' }")) {
        throw new Error('scheduler.phase bootstrap default missing');
      }
      if (!mode.includes('setSchedulerPhase: (phase: string')) {
        throw new Error('scheduler phase setter missing');
      }
      if (!app.includes("setSchedulerPhase?.('preheat'")) {
        throw new Error('runtime starter does not enter preheat scheduler phase');
      }
    }
  },
  {
    name: 'introGate preheat initialization',
    run() {
      if (!app.includes('setIntroGate({ startedAt: preheatStartedAt, minDurationMs: 30_000, passed: false, remainingMs: 30_000 })')) {
        throw new Error('introGate preheat initialization is missing or incomplete');
      }
    }
  },
  {
    name: 'questionIndex initialized to 0',
    run() {
      if (!app.includes('setSandboxFlow({ questionIndex: 0 })')) {
        throw new Error('runtime starter does not normalize questionIndex=0');
      }
    }
  },
  {
    name: 'transition log not empty after sandbox mode entry',
    run() {
      if (!mode.includes("{ event: 'INIT_SANDBOX_V2'")) {
        throw new Error('initial transition INIT_SANDBOX_V2 missing');
      }
      if (!mode.includes("{ event: 'ENTER_BOOT'")) {
        throw new Error('initial transition ENTER_BOOT missing');
      }
      if (!app.includes("'ENTER_PREHEAT_CHAT'")) {
        throw new Error('ENTER_PREHEAT_CHAT transition is not emitted');
      }
    }
  }
];

for (const check of checks) {
  check.run();
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
