# Classic Flow Table

Generated from mode-specific flow definition and content map for **classic** mode.

## Flow definition

| stepId | purpose | canReply | gateType | uiSurface | allowed categories | next steps | blocked reasons | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EVENT_OPENER | Classic event opens with a directed tagged line before reactions or QnA. | no | event_gate | chat_panel, review_packet | event_dialog | EVENT_REACTION_WINDOW, QNA_ASKING, AMBIENT_ONLY | locked_active, cooldown_blocked, no_active_user, registry_missing | Maps existing event opener/follow-up dialog pools without changing event engine ownership. |
| EVENT_REACTION_WINDOW | Short reaction burst after event opener or effect. | no | event_gate | chat_panel, review_packet | event_reaction, ambient_chat | QNA_ASKING, AMBIENT_ONLY, FALLBACK_ONLY | reaction_pool_missing, event_exclusive_active | Reuses existing event reaction pool plus optional ambient filler. |
| QNA_ASKING | Commit a classic QnA prompt into chat with wrapper metadata. | no | qna_gate | chat_panel, review_packet | qna_prompt, fake_ai | QNA_AWAITING_REPLY, QNA_ABORTED | question_send_failed, tag_not_sent, invalid_state | Actual chat wrapper still assembled in App.tsx runtime wrapper; this table marks ownership only. |
| QNA_AWAITING_REPLY | Classic reply bar is armed and player answer is awaited. | yes | reply_gate | reply_bar, pinned_reply, chat_panel | qna_prompt, donate, ambient_chat | QNA_RETRY_OR_UNKNOWN, QNA_RESOLVED, QNA_ABORTED | reply_gate_closed, question_message_missing, stalled_asking_timeout | No runtime behavior change; used for ownership lookup and docs. |
| QNA_RETRY_OR_UNKNOWN | Classic retry or unknown/help prompts after invalid or uncertain reply. | yes | reply_gate | chat_panel, reply_bar, review_packet | qna_retry, qna_unknown | QNA_AWAITING_REPLY, QNA_RESOLVED, QNA_ABORTED | retry_limit_reached, question_missing | Covers retry and unknown prompt families from QNA_FLOWS. |
| QNA_RESOLVED | Classic QnA resolved successfully and reply gate closes. | no | qna_gate | chat_panel, review_packet | ambient_chat, fake_ai, donate | AMBIENT_ONLY, EVENT_OPENER | none | Resolution surface remains runtime-owned; this records allowed content ownership. |
| QNA_ABORTED | Classic QnA aborted due to timeout, manual stop, or invalid continuation. | no | qna_gate | chat_panel, review_packet | fallback, ambient_chat | FALLBACK_ONLY, AMBIENT_ONLY, EVENT_OPENER | timeout, manual_abort, invalid_state | Pairs with classic review-first boundary; no new import path added. |
| AMBIENT_ONLY | Classic free-running ambient chat when no event or QnA owns the moment. | no | ambient_gate | chat_panel, review_packet | ambient_chat, donate, fake_ai | EVENT_OPENER, QNA_ASKING, FALLBACK_ONLY | chat_auto_paused | Preserves shared ChatPools tooling without moving classic copy into shared ownership. |
| FALLBACK_ONLY | Safe fallback line when other classic selection paths are blocked or linted. | no | ambient_gate | chat_panel, review_packet | fallback | AMBIENT_ONLY, EVENT_OPENER | safe_pool_empty | Shared UI shell may render it, but ownership stays classic/shared-fallback boundary. |

## Step -> categories

| stepId | primaryCategory | optionalCategories | messagePurpose | tonePackSupport | runtimeSelectionPolicy | notes |
| --- | --- | --- | --- | --- | --- | --- |
| EVENT_OPENER | event_dialog |  | Classic event opener / follow-up line. | true | variant_pool | Active event dialog pool. |
| EVENT_REACTION_WINDOW | event_reaction | ambient_chat | Crowd reaction burst around event. | true | priority_then_optional | Event reactions primary; ambient only as optional fill. |
| QNA_ASKING | qna_prompt | fake_ai | Ask current QnA prompt. | true | runtime_adapter | Runtime wrapper still owned by App + qna engine. |
| QNA_AWAITING_REPLY | qna_prompt | donate, ambient_chat | Hold player attention while reply gate remains open. | true | priority_then_optional | Reply authority remains classic qna state. |
| QNA_RETRY_OR_UNKNOWN | qna_retry | qna_unknown | Retry / unknown guidance. | true | variant_pool | Maps to retryPromptVariants / unknownPromptVariants. |
| QNA_RESOLVED | ambient_chat | fake_ai, donate | Resolved aftermath. | true | priority_then_optional | No explicit resolved message pool yet. |
| QNA_ABORTED | fallback | ambient_chat | Abort recovery. | false | priority_then_optional | Use fallback first, then ambient recovery. |
| AMBIENT_ONLY | ambient_chat | donate, fake_ai | Ambient free chat. | true | variant_pool | Classic persona/system pools. |
| FALLBACK_ONLY | fallback |  | Guaranteed safe fallback. | false | single | Shared safe fallback pool. |

## Category ownership

| category | ownership | sourceStatus | allowedStepIds | messagePurpose | tonePackSupport | notes |
| --- | --- | --- | --- | --- | --- | --- |
| event_dialog | mode_specific | active | EVENT_OPENER | Classic directed event opener/follow-up lines. | true | Owned by classic event dialog registry. |
| event_reaction | mode_specific | active | EVENT_REACTION_WINDOW | Classic crowd reactions after event beats. | true | Owned by classic event reaction pool. |
| qna_prompt | mode_specific | active | QNA_ASKING, QNA_AWAITING_REPLY | Classic question prompt variants. | true | Wrapper record remains runtime_wrapper in manifest for final emitted line. |
| qna_retry | mode_specific | active | QNA_RETRY_OR_UNKNOWN | Classic retry prompt variants. | true |  |
| qna_unknown | mode_specific | active | QNA_RETRY_OR_UNKNOWN | Classic unknown/help prompt variants. | true |  |
| ambient_chat | mode_specific | active | EVENT_REACTION_WINDOW, QNA_AWAITING_REPLY, QNA_RESOLVED, QNA_ABORTED, AMBIENT_ONLY | Classic ambient chat pool. | true | Includes system/type/persona pools. |
| fallback | shared_tooling | active | QNA_ABORTED, FALLBACK_ONLY | Safe fallback pool used by classic selection/lint reroll. | false | Shared safe pool is tooling-level shared, not mode-specific authored copy. |
| donate | mode_specific | active | QNA_AWAITING_REPLY, QNA_RESOLVED, AMBIENT_ONLY | Donation inserts used in classic ambient windows. | false |  |
| fake_ai | mode_specific | active | QNA_ASKING, QNA_RESOLVED, AMBIENT_ONLY | Fake AI suspense replies for classic chat. | true |  |
