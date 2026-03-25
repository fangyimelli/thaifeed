> 2026-03-25 sandbox_360_test 補充（第二波）：主畫面左上保留 Shot/Trigger live controls；Debug panel 僅承接資訊觀測。effect runtime SSOT 升級為 `active + triggerCount + triggerSeq`，renderer/debug 共讀並以 `triggerSeq` 重播 force 效果。

# Sandbox Flow Table

> 2026-03-25 sandbox_360_test 補充：effect/room-event force gate 與 debug 顯示改為 App SSOT（`sandbox360RoomEvents` + `sandbox360RoomEventDebug`），viewer 不再持有本地 debug overlay 狀態。

Generated from mode-specific flow definition and content map for **sandbox** mode.

- Companion review packet: `docs/sandbox-shared-message-review.md` for editable sandbox/shared review.

## Sandbox 360 題目 UI layer guard（sandbox_360_test only）

| item | authority |
| --- | --- |
| viewer root structure | `viewer-root -> scene-image + overlay layers + ui-layer` |
| ui-layer children | `QuestionPanel`, `PinnedReply`, `ChatLayer` |
| ui-layer interaction | `position:absolute; inset:0; pointer-events:none` |
| QuestionPanel interaction | `pointer-events:auto` |
| z-index policy | `scene(1) < overlay(2) < ui-layer(30) < question(40)` |
| data source | `questionConsonant` / `questionVisible` from `sandbox360Mode` authoritative prompt + reply gate |
| regression guard | `scripts/regression-sandbox360-shot-events.mjs` validates scene/overlay/ui layer tokens + CSS pointer-events + z-index rules |

## Sandbox 360 TV anchor authority（sandbox_360_test only）

| item | authority |
| --- | --- |
| authoritative TV anchor | `TV_ANCHOR = { x: 2256, y: 1054, w: 220, h: 118 }`（manual calibrated from user red-box SSOT） |
| reference scene | `4096x2048` scene-space |
| runtime mapping | `scaleX = sceneWidth/4096`, `scaleY = sceneHeight/2048`, then map `TV_ANCHOR` |
| shared consumers | `sandbox360OverlayTvDebug` + `sandbox360OverlayTvNoise` both read `overlaySceneRects.tv` |
| debug observability | `TV_ANCHOR`, `tvDebugRect`, `tvOverlayRect`, `tv.sharedTransformContainer` |
| anti-drift policy | do not use screen-space percentage for TV positioning |

Notes:
- TV anchor now follows scene-space SSOT and remains stable across camera crop/zoom.
- Debug box is observability-only; authority remains in scene-space anchor constants.


## Sandbox 360 zoom-crop framing authority (sandbox_360_test only)

| key | value |
| --- | --- |
| scale constant | `SANDBOX360_SCALE = 1.75` |
| shot framing | `LEFT=36`, `CENTER=52`, `RIGHT=66` |
| state authority | shot: `currentShot/targetShot/currentPosX/targetPosX/isTransitioning`; handheld: `cameraOffsetX/Y`, `cameraRotationDeg`, `cameraScaleOffset`, `cameraVelocityX/Y` |
| transition | duration-based ease-out (`shotTransitionDurationMs = 280`) |
| interaction model | fixed shot switch only (no free drag / no 360 orbit) |
| handheld layer | low-frequency sway + micro jitter + light breathing scale (small amplitude only) |
| overlay alignment | overlay + scene share one transform container (`sandbox360TransformLayer`) |

Notes:
- Zoom-crop framing is authoritative in `resolveSandbox360ViewerFraming()` / `resolveSandbox360ViewerTarget()`.
- Render path consumes authoritative shot transition state (`shotTransitionStartedAt`, `shotTransitionDurationMs`, `shotTransitionFromPosX`) and settles `currentShot` only when transition progress reaches 1.

## Sandbox 360 shot-driven room-event flow (sandbox_360_test only)

| trigger | condition | delay | room event | cooldown |
| --- | --- | --- | --- | --- |
| Shot transition | `CENTER -> RIGHT` | 500ms | `LIGHT_FLASH_LEFT` | 3s |
| Shot dwell | stay on `RIGHT` for 3s | none after dwell satisfied | `TV_STATIC` | 4s |
| Shot transition | `RIGHT -> CENTER` | none | `DOOR_SHADOW` | 5s |
| Shot transition | `LEFT -> CENTER` | none | `DOLL_REFLECT` | 5s |

Notes:
- This flow is scoped to `src/modes/sandbox_360_test/Sandbox360Viewer.tsx` only.
- Sandbox debug/event API is namespace-local: `window.__sandbox360.*` (no `window.triggerRoomEvent`).
- `eventCooldownMap` is the authoritative gate to avoid rapid retrigger from debug spam or fast camera oscillation.

## Sandbox 360 force vs normal event behavior（sandbox_360_test only）

| path | trigger examples | trigger API | cooldown behavior | notes |
| --- | --- | --- | --- | --- |
| force (debug/manual) | Debug buttons（FLASH/TV/DOLL/DOOR） | `triggerRoomEvent(type, { force:true })` / `forceRoomEvent(type)` | bypass（可忽略 cooldown） | 測試優先，避免 debug 被 cooldown 擋住 |
| normal (non-debug) | shot-driven / auto / random / scripted | `triggerRoomEvent(type)` 或 `triggerRoomEvent(type, { source:'shot_flow' })` | enforce（仍受 cooldown） | 正式節奏保持防抖/防連發 |
| normal + override | 少數人工檢查 | `triggerRoomEvent(type, { ignoreCooldown:true })` | bypass | 僅限明確指定 override，不是預設 |

Notes:
- `triggerRoomEvent(type, options)` options 支援 `force` / `ignoreCooldown`。
- cooldown 範圍定義：normal path 生效；force path 僅 debug/manual 使用。

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
