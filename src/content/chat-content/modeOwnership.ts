import { CLASSIC_CONTENT_MAP } from './maps/classicContentMap';
import { SANDBOX_CONTENT_MAP } from './maps/sandboxContentMap';
import { CLASSIC_FLOW_DEFINITION } from '../../modes/classic/flow/classicFlowDefinition';
import { SANDBOX_FLOW_DEFINITION } from '../../modes/sandbox/flow/sandboxFlowDefinition';

export const SHARED_FRAMEWORK_OWNERSHIP = {
  framework: [
    'src/content/chat-content/schema.ts',
    'src/content/chat-content/appRuntimeContent.ts',
    'scripts/generate-chat-content-artifacts.mjs',
    'scripts/import-chat-content-editable.mjs',
    'src/ui/chat/ChatPanel.tsx'
  ],
  rules: [
    'Shared schema/tooling/UI shell may describe tokens, import policy, and rendering surfaces.',
    'Shared files must not become the owner of classic/sandbox experiential copy.',
    'Shared consonant bank/question tooling remains data/tooling only, not mode-authored dialogue.'
  ]
} as const;

export const LEGACY_COMPATIBILITY_LAYER = {
  runtimeWrappers: [
    'classic qna wrapper record in src/app/App.tsx',
    'sandbox tag/prompt runtime adapters in src/content/chat-content/appRuntimeContent.ts'
  ],
  parallelSources: [
    'src/sandbox/chat/chat_engine.ts stub lines',
    'sandbox word map / shared question bank audit-only entries',
    'shared safe fallback pool reused by classic tooling'
  ],
  futureEntrypoints: {
    addFlowStep: ['mode flow definition file', 'mode content map file', 'generator docs output', 'regression guards'],
    addTonePack: ['mode flow route tonePack fields', 'mode category ownership tonePackSupport/tonePack', 'writer/review docs if directly editable']
  }
} as const;

export const MODE_OWNERSHIP_MAP = {
  classic: {
    flowDefinition: CLASSIC_FLOW_DEFINITION,
    contentMap: CLASSIC_CONTENT_MAP,
    futureEditEntrypoints: {
      flow: 'src/modes/classic/flow/classicFlowDefinition.ts',
      content: 'src/content/chat-content/maps/classicContentMap.ts'
    }
  },
  sandbox: {
    flowDefinition: SANDBOX_FLOW_DEFINITION,
    contentMap: SANDBOX_CONTENT_MAP,
    futureEditEntrypoints: {
      flow: 'src/modes/sandbox/flow/sandboxFlowDefinition.ts',
      content: 'src/content/chat-content/maps/sandboxContentMap.ts'
    }
  },
  shared: SHARED_FRAMEWORK_OWNERSHIP,
  legacy: LEGACY_COMPATIBILITY_LAYER
} as const;

export function getModeFlowDefinition(mode: 'classic' | 'sandbox') {
  return mode === 'classic' ? CLASSIC_FLOW_DEFINITION : SANDBOX_FLOW_DEFINITION;
}

export function getModeContentMap(mode: 'classic' | 'sandbox') {
  return mode === 'classic' ? CLASSIC_CONTENT_MAP : SANDBOX_CONTENT_MAP;
}

export function getModeFlowStep(mode: 'classic' | 'sandbox', stepId: string) {
  return getModeFlowDefinition(mode).find((step) => step.stepId === stepId) ?? null;
}

export function getModeFlowRoute(mode: 'classic' | 'sandbox', stepId: string) {
  return getModeContentMap(mode).steps.find((route) => route.stepId === stepId) ?? null;
}
