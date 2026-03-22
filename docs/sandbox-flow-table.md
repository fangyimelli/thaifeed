# Sandbox Flow Table

Generated from mode-specific flow definition and content map for **sandbox** mode.

## Flow definition

| stepId | purpose | canReply | gateType | uiSurface | allowed categories | next steps | blocked reasons | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PREHEAT_CHAT | Bootstrap sandbox room with join logs and ambient preheat chat before tag ownership begins. | no | none | chat_panel, review_packet | sandbox_preheat | WAIT_WARMUP_REPLY, VIP_TAG_PLAYER | bootstrap_not_ready, legacy_join_emitter_blocked | Owned by authored sandbox preheat sequence through appRuntimeContent adapter. |
| REVEAL_PROMPT | Show the sandbox reveal prompt / consonant prompt before waiting for answer. | no | reply_gate | chat_panel, scene_overlay, review_packet | sandbox_prompt | TAG_PLAYER_x, WAIT_REPLY_x | missing_current_prompt, render_sync_warning | Reveal prompt template remains tokenized; shared question bank remains separate. |
| WAIT_REPLY_x | Authoritative sandbox answer gate for warmup or consonant reply. | yes | reply_gate | reply_bar, pinned_reply, chat_panel, debug_panel | sandbox_tag_question, sandbox_prompt, sandbox_debug_text | HELP_HINT, ANSWER_EVAL | no_gate, gate_not_armed, can_reply_false, scene_not_synced_warning | Includes WAIT_WARMUP_REPLY compatibility and dynamic WAIT_REPLY_x path. |
| HELP_HINT | Emit sandbox help hint while keeping the same question active. | yes | reply_gate | chat_panel, reply_bar, review_packet | sandbox_help_hint | WAIT_REPLY_x, ANSWER_EVAL | missing_current_prompt, hint_source_missing | Help hint text is sandbox-owned; memory hint data stays shared consonant tooling. |
| ANSWER_EVAL | Evaluate sandbox answer and emit glitch/crowd reaction side content. | no | reply_gate | chat_panel, debug_panel, review_packet | sandbox_glitch, sandbox_crowd_reaction | REVEAL_WORD, VIP_SUMMARY_POST_REVEAL | judge_not_triggered, parse_failed, question_mismatch | sandbox_crowd_reaction is reserved for existing/parallel crowd-react sources. |
| VIP_SUMMARY_POST_REVEAL | Post-reveal VIP summary window after reveal completes. | no | post_reveal_gate | chat_panel, scene_overlay, review_packet | sandbox_vip_summary | ADVANCE_NEXT, TAG_QUESTION | reveal_not_done, post_reveal_not_started | Maps VIP_SUMMARY_1/2 and post-reveal discussion ownership. |
| TAG_QUESTION | Tag the active user for the next sandbox question. | no | reply_gate | chat_panel, reply_bar, review_packet | sandbox_tag_question | WAIT_REPLY_x | prompt_missing_for_tag, reply_source_missing | Dynamic tag wrapper stays runtime-bound but text template is sandbox-owned. |
| DEBUG_SMOKE | Sandbox smoke/debug helper text and legacy stubs used by tests or debug actions. | no | debug_gate | debug_panel, chat_panel, review_packet | sandbox_debug_text, sandbox_stub | WAIT_REPLY_x, PREHEAT_CHAT, ANSWER_EVAL | debug_disabled, missing_runtime_stub | Explicitly separates future-active debug copy from legacy/parallel stubs. |

## Step -> categories

| stepId | primaryCategory | optionalCategories | messagePurpose | tonePackSupport | runtimeSelectionPolicy | notes |
| --- | --- | --- | --- | --- | --- | --- |
| PREHEAT_CHAT | sandbox_preheat |  | Preheat room setup. | true | variant_pool | Preheat sequence owned by authored sandbox content. |
| REVEAL_PROMPT | sandbox_prompt |  | Prompt / reveal copy. | true | runtime_adapter | Prompt text tokenized. |
| WAIT_REPLY_x | sandbox_tag_question | sandbox_prompt, sandbox_debug_text | Formal ask + debug helper in wait-reply windows. | true | priority_then_optional | Warmup/debug compatibility included. |
| HELP_HINT | sandbox_help_hint |  | Help hint. | true | priority_then_optional | Shared hint data may be interpolated, but authored template is sandbox-owned. |
| ANSWER_EVAL | sandbox_glitch | sandbox_crowd_reaction | Evaluation reaction burst. | true | priority_then_optional | Crowd reaction currently mostly parallel/stub territory. |
| VIP_SUMMARY_POST_REVEAL | sandbox_vip_summary |  | VIP recap. | true | variant_pool | Post-reveal bridge. |
| TAG_QUESTION | sandbox_tag_question |  | Tag active user for next question. | true | runtime_adapter | Dynamic tag text. |
| DEBUG_SMOKE | sandbox_debug_text | sandbox_stub | Debug/smoke messaging. | false | debug_fixed | sandbox_stub stays legacy/parallel compatibility. |

## Category ownership

| category | ownership | sourceStatus | allowedStepIds | messagePurpose | tonePackSupport | notes |
| --- | --- | --- | --- | --- | --- | --- |
| sandbox_preheat | mode_specific | active | PREHEAT_CHAT | Sandbox room warmup lines. | true |  |
| sandbox_prompt | mode_specific | active | REVEAL_PROMPT, WAIT_REPLY_x | Sandbox reveal / prompt text. | true |  |
| sandbox_help_hint | mode_specific | active | HELP_HINT | Sandbox help hints. | true | Shared consonant bank remains tooling-only data source. |
| sandbox_vip_summary | mode_specific | active | VIP_SUMMARY_POST_REVEAL | VIP recap lines after reveal. | true |  |
| sandbox_glitch | mode_specific | active | ANSWER_EVAL | Short glitch burst during answer evaluation. | true |  |
| sandbox_tag_question | mode_specific | active | WAIT_REPLY_x, TAG_QUESTION | Formal user tag / ask template. | true |  |
| sandbox_debug_text | mode_specific | active | WAIT_REPLY_x, DEBUG_SMOKE | Smoke-test and debug helper text. | false |  |
| sandbox_crowd_reaction | legacy_adapter | parallel | ANSWER_EVAL | Crowd reaction placeholders around answer evaluation. | true | Reserved for current/ future crowd-react registry; may still be stubbed. |
| sandbox_stub | legacy_adapter | parallel | DEBUG_SMOKE | Legacy runtime wrapper / stub-only sandbox text. | false | Parallel/runtime-wrapper-only sources remain compatibility layer, not future SSOT. |
