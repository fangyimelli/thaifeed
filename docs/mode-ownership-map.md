# Mode Ownership Map

Generated from the mode ownership metadata used by runtime/docs/tooling adapters.

## Shared framework

- src/content/chat-content/schema.ts
- src/content/chat-content/appRuntimeContent.ts
- scripts/generate-chat-content-artifacts.mjs
- scripts/import-chat-content-editable.mjs
- src/ui/chat/ChatPanel.tsx

- Shared schema/tooling/UI shell may describe tokens, import policy, and rendering surfaces.
- Shared files must not become the owner of classic/sandbox experiential copy.
- Shared consonant bank/question tooling remains data/tooling only, not mode-authored dialogue.

## Future entrypoints

- Classic flow: src/modes/classic/flow/classicFlowDefinition.ts
- Classic content: src/content/chat-content/maps/classicContentMap.ts
- Sandbox flow: src/modes/sandbox/flow/sandboxFlowDefinition.ts
- Sandbox content: src/content/chat-content/maps/sandboxContentMap.ts

## Legacy / parallel compatibility layer

- runtime_wrapper: classic qna wrapper record in src/app/App.tsx
- runtime_wrapper: sandbox tag/prompt runtime adapters in src/content/chat-content/appRuntimeContent.ts
- parallel: src/sandbox/chat/chat_engine.ts stub lines
- parallel: sandbox word map / shared question bank audit-only entries
- parallel: shared safe fallback pool reused by classic tooling

## Ownership matrix

| scope | owner | future changes go to |
| --- | --- | --- |
| classic flow/content | classic mode | src/modes/classic/flow/classicFlowDefinition.ts / src/content/chat-content/maps/classicContentMap.ts |
| sandbox flow/content | sandbox mode | src/modes/sandbox/flow/sandboxFlowDefinition.ts / src/content/chat-content/maps/sandboxContentMap.ts |
| shared schema/ui/tooling | shared framework | schema / tooling files listed above only |
| legacy / parallel adapters | compatibility layer | dedicated migration patch before promotion |
