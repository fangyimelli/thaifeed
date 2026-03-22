import { CLASSIC_CONTENT_OWNERSHIP, CLASSIC_FLOW_CONTENT_ROUTES } from '../../../modes/classic/flow/classicFlowDefinition';

export { CLASSIC_CONTENT_OWNERSHIP, CLASSIC_FLOW_CONTENT_ROUTES };

export const CLASSIC_CONTENT_MAP = {
  mode: 'classic' as const,
  steps: CLASSIC_FLOW_CONTENT_ROUTES,
  categories: CLASSIC_CONTENT_OWNERSHIP,
  notes: [
    'Classic flow/content ownership is review-first. Active pools remain in their original classic registries.',
    'Runtime wrapper entries stay visible for audit but are not promoted to shared ownership.',
    'Shared fallback/UI/tooling may be consumed by classic runtime, but authored experience copy remains classic-owned.'
  ]
};
