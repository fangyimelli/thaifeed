import { SANDBOX_CONTENT_OWNERSHIP, SANDBOX_FLOW_CONTENT_ROUTES } from '../../../modes/sandbox/flow/sandboxFlowDefinition';

export { SANDBOX_CONTENT_OWNERSHIP, SANDBOX_FLOW_CONTENT_ROUTES };

export const SANDBOX_CONTENT_MAP = {
  mode: 'sandbox' as const,
  steps: SANDBOX_FLOW_CONTENT_ROUTES,
  categories: SANDBOX_CONTENT_OWNERSHIP,
  notes: [
    'Sandbox authored prompt/help/vip/glitch/tag/debug copy now has a mode-owned routing map.',
    'Shared consonant schema/tooling remains shared-only and must not become sandbox-authored narrative copy.',
    'Legacy stubs / parallel crowd reactions stay explicitly marked as compatibility layer.'
  ]
};
