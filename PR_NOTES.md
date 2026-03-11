## 2026-03-11 sandbox integration fix (reveal/post-reveal/advance-next unblock)
- A. `REVEAL_WORD` guard fallback：`reveal.phase=done && rendered=true` 且 timing 缺失時，自動補齊 `startedAt/finishedAt`，並以 `reveal_word_done_timing_repaired` 前進 `POST_REVEAL_CHAT`。
- B. nextQuestion blocked reason stage 化：`reveal_guard_blocked:*` / `post_reveal_blocked:*` / `advance_next_blocked:*` / `emitted`，並新增 `nextQuestionBlockedReasonSource` + `nextQuestionStage`。
- C. `ADVANCE_NEXT` emit 穩定：emit 依 authoritative flow + gate release + next node；`scene_not_synced` 僅 warning，不作為 emit gate。
- D. Debug 可觀測性：新增 `reveal.guardReady`、`reveal.hasObservableTiming`、`postReveal.guardReady`、`advanceNext.guardReady`、`nextQuestion.stage`、`nextQuestion.blockedReason.source`。
- E. Regression guard：新增字串級防回歸檢查，覆蓋 Q1->reveal->post_reveal->advance_next->Q2 emit 與 stage-scoped blocked reason。


## 2026-03-11 sandbox integration follow-up (A→E)

- A. Prompt glyph cleanup on reveal：`phase=word/done` 一律 suppress prompt bubble/glyph，debug `ui.promptGlyph.source=reveal_prompt_cleanup`。
- B. Reveal lifecycle timing：新增 `reveal.cleanupAt`；`markRevealDone` 不再覆寫既有 `finishedAt`，保持可審計 reveal duration。
- C. Video/render sync：video element error 保留診斷但不直接熄滅 assets，避免 `scene_not_synced` 後永久無法恢復。
- D. Night Smoke consume path：submit 成功後的 eval 保留 authoritative `playerMessage.id`，避免 `message_injected_but_not_consumed` 假失敗。
- E. Judge audit persistence：維持 consume 時完整 parse+judge+source+consumedAt 落盤，並新增 guards。

## This Change (reveal audit observability, no behavior change)
- Audited sandbox reveal pipeline end-to-end (`REVEAL_WORD -> render -> POST_REVEAL_CHAT`).
- Added `sandbox.reveal.text` to debug mirror payload in `window.__CHAT_DEBUG__`, complementing existing reveal fields (`visible/phase/wordKey/startedAt/finishedAt/rendered/blockedReason`).
- Confirmed no reveal timing/flow gate logic changed in this patch.

## Regression Guard Updates (reveal audit)
- Updated docs-only guard notes for reveal observability; no runtime behavior guard added because this is audit-only (non-fix) change.

- 將 debug flow 測試從 `Run Full Night Test` 正名為 `Run Night Smoke Test`，同步更新按鈕文案、Flow Test 面板標題與 debug action audit key（`run_night_smoke_test`）。
- 修正題目切換可見性：在可作答步驟，authoritative prompt 一旦成立就強制同步 `renderSync.stateQuestionId/renderedQuestionId`，scene 未同步僅記 `scene_not_synced_warning`，不再出現 flow 已前進但畫面無題目。
- 修正 `Force Next Question`：成功時必須建立下一題 `currentPrompt` 並提交 `renderSync`（`force_next_prompt_activated`），缺少 next node 直接 blocked，避免產生 `missing_current_prompt/state_question_missing`。
## This Change (2026-03-10 sandbox videoA/render recovery + smoke consume + judge audit completeness)
- 修正 sandbox video/render failure 可觀測性不足：`SceneView` 的 `VideoDebugState` 新增 `slotSource/slotReadyState/slotErrorCode/lastSwapResult`，並在 `videoA/videoB onError`、switch success/failure、fallback failure 全部落盤，明確顯示 active slot 與 swap 結果。
- 修正 scene sync recovery：render sync 新增 `gateAuthoritativeReady`（replyGate consonant_answer+armed+canReply），`forceVisiblePrompt` 在 scene 未同步時可進入 `scene_not_synced_warning`，不再讓 `render.stateQuestionId` 與 `renderedQuestionId` 長期脫鉤。
- 修正 Night Smoke Test auto answer consume 驗證：`submitChat` 回傳 authoritative `messageId`，smoke test 強制比對 `lastReplyEval.messageId === answerMessageId` 且 consumed，避免僅訊息注入即誤判成功。
- judge audit 欄位寫入維持 authoritative SSOT `setConsonantJudgeAudit`，consume path 持續寫滿 `expectedConsonant/acceptedCandidates/compareInput/compareMode/judgeResult/resultReason/gateType/sourcePromptId/sourceQuestionId/sourceWordKey/consumedAt`。

## Regression Guard Updates (2026-03-10)
- 更新 guard：render recovery 必須有 `gateAuthoritativeReady` 與新 `forceVisiblePrompt`。
- 更新 guard：Night Smoke Test 必須驗證 consumed messageId (`st.lastReplyEval?.messageId === answerMessageId`)。

## This Change (2026-03-10 full-night auto-answer same submit/consume path)
- `Run Full Night Test` Q1 自動答題改為與真人相同送出路徑：`submitChat` 建立 player message 後，將 `messageId/sourceType/playerId/targetPlayerId/sourceMessageId` 一併送入 `consumePlayerReply(payload)`。
- `consumePlayerReply` 接受 authoritative metadata payload，`writeSandboxLastReplyEval` 也改為可保存真實 `messageId`，避免 debug trace 用合成 id 誤導。
- Full Night Test Q1 驗證新增 authoritative success gate：parse 已評估、parse.ok=true、judge audit 寫入且 `consumedAt>0`、flow 離開 `WAIT_REPLY_1`。
- Full Night Test 失敗分類改為 `message_injected_but_not_consumed` / `message_rejected_by_gate` / `parse_failed:*` / `judge_failed`，不再把「聊天室有顯示 `You X`」當成 consume 成功。

## 2026-03-10 sandbox q2 render commit fix

### Scope
- Sandbox mode only; classic mode unchanged.

### Problem
- Authoritative flow 已到 `WAIT_REPLY_2` 且 `currentPrompt=n01_q02_house`，但 scene/video/prompt visual layer 仍停留第一題。

### This Change
- 新增 authoritative `renderSync` state：`stateQuestionId`、`renderedQuestionId`、`renderBlockedReason`、`commitSource/committedAt`。
- 將 `secondQuestionShown` 改為 render-committed 定義：`emit + prompt 對齊 + rendered 對齊`。
- `ADVANCE_NEXT` 與 `Force Next Question` emit 下一題時，依 `flow.questionIndex` 強制發送 `REQUEST_VIDEO_SWITCH`（scene/video 同步切題）。
- debug panel 新增 state/render mismatch 診斷欄位（含 expectedSceneKey / video.currentKey）。
- `commitPromptPinnedRendered`、`commitPinnedWriter` 改為真正落 state，不再 noop。

### Regression Guards
- 第二題 emit 後 `renderedQuestionId` 必須可對齊 `currentPrompt.questionId`。
- `secondQuestionShown=true` 必須代表 `renderedQuestionId` 已是第二題。
- 若 render 被阻塞，必須有 `renderBlockedReason`。
- emit 下一題必須觸發 scene/video switch authoritative path。

## 2026-03-10 Sandbox post-reveal SSOT + ADVANCE_NEXT emit fix

### This Change
- 修正 `advance_next_effect` 的 post-reveal completion 來源分裂：新增 `hasPostRevealCompletionEvidence(state)`，統一使用 `postRevealChatState` + `audit.transitions(post_reveal_chat_done)` + `backlogTechMessages.length===0` 收斂。
- `ADVANCE_NEXT` emit 下一題後，立即同步切換 `currentPrompt` 到新題，並將 flow step 從 Q1 跳到 `TAG_PLAYER_2_PRONOUNCE`（Q2 跳 `TAG_PLAYER_3_MEANING`），避免題目/影片顯示停留上一題。
- `Run Full Night Test` 第二題成功判定改為 authoritative `emit + prompt 對齊`（`prompt.current.wordKey === nextQuestionToQuestionId`）。

### Regression Guards
- `post_reveal_chat_done` transition + backlog 清空時，`ADVANCE_NEXT` 不可再 blocked 為 `post_reveal_chat_not_done`。
- 第二題 emit 後必須有 `setCurrentPrompt(next)` 與 next flow step 跳轉語句。
- Full Night Test secondQuestionShown 必須由 `emit + prompt alignment` 決定。
- 正常答題/自動答題/Force Correct judge audit 關鍵欄位寫入語句持續受 guard。


## This Change (2026-03-10 full-night authoritative auto-answer fix)
- 修正 `Run Full Night Test` 自動答題驗證：提交後先等 authoritative consume（`flow.step` 不再是 `WAIT_REPLY_1` 或 gateConsumed=true），再等 parse/judge（`parse.raw` 有值、`parse.kind != not_evaluated`、`parse.ok=true`）。
- 修正失敗分類：若 authoritative 仍卡在 `WAIT_REPLY_1`，改回報 `answer_not_submitted` / `answer_not_consumed` / `judge_not_triggered`，`failedStep` 回填 `auto_answer_q1`，與 authoritative flow 停點一致。
- 新增 regression guards：禁止 Full Night Test 在 `autoAnswerUsed` 後仍以 `WAIT_REPLY_1 + parse.not_evaluated` 進入誤導失敗分類。

## This Change (authoritative follow-up #2)
- 修正 `Run Full Night Test` 第二題成功判定：以 authoritative `sandboxFlow.nextQuestionEmitted/toQuestionId` 為準。
- 新增 fail 前 authoritative re-converge：timeout 後先再次收斂 `nextQuestion` emit，若已 emit 直接 `passed`，不可再寫 `failedStep=second_question`。
- `secondQuestionShown`/`toQuestionId` 在 failed/passed 皆回填 authoritative 值，避免與 AUTHORITATIVE FLOW 區塊矛盾。
- 修正 `consumePlayerReply` wait-reply gateType 來源：由 `flow.step` 決定 expected gateType，避免 stale gateType 使正常答題/Full Night Test 自動答題僅寫 parse 半段。
- 確認 `Force Correct Now` 仍完整落 `consonantJudgeAudit`（parse+judge+source+consumedAt）。

## Regression Guard Updates (follow-up #2)
- 新增 guard：`nextQuestion.emitted=true` 時，Full Night Test 不可 `failed(second_question)`。
- 新增 guard：Full Night Test fail/passed 都需回填 authoritative `secondQuestionShown/toQuestionId`。
- 新增 guard：wait-reply gateType 必須由 `flow.step` authoritative 派生。
- 新增 guard：正常答題/自動答題/force-correct 的 judge audit 關鍵欄位必須存在寫入語句。

## This Change
- 重整 Sandbox Story Debug Panel 為兩區：`Flow Test`（Run Full Night Test / Pass Flow）與 `Force Debug`（Force Correct Now / Force Next Question / Force Ghost Event）。
- `Run Full Night Test` 改成每次先 clean bootstrap/re-init，再走正式 authoritative 流程，避免從中途狀態接續導致假失敗。
- `Pass Flow` 與 `Force Next Question` 分流：前者驗證正式 guard path，後者忽略多數一般 guard 直接 force 下一題，並且完整落 `nextQuestion*` audit。
- `Force Correct Now` 收斂 blocked 條件並保持完整 `consonantJudgeAudit` 落盤；`Force Ghost Event` 名稱與區域語義同步。

## Regression Guard Updates
- 新增/更新字串級 regression guards：
  - panel 只呈現五顆保留按鈕與兩區標題；
  - `run_full_night_test` 先做 `ensureBootstrapState(..., force=true)`；
  - `force_next_question` 成功時必須寫入 authoritative `nextQuestion*` 狀態；
  - force/debug actions 皆需 `recordSandboxDebugAction(...)`。

## 2026-03-10 Sandbox debug panel integration refactor

### Scope
- 僅修改 sandbox 路徑（`src/app/App.tsx`）；classic mode 未動。

### Button inventory decision
- 保留：
  - `Pass Flow`（主流程前進）
  - `Force Correct`（必要 override，且寫入 authoritative judge audit）
  - `Trigger Random Ghost`（事件流測試）
  - `Run Sandbox Flow Test`（一鍵自動驗證）
- 刪除：`ForceResolveQna`、`ClearReplyUi`、`Force Next Node`、`Force Reveal Word`、`ForcePlayPronounce`、`ForceWave(related/surprise/guess)`。
- 合併：`PASS (advancePrompt)` + `Force Next Node` 收斂為單一 `Pass Flow` 概念，不再雙軌。

### Auto test flow
- 新增 `runSandboxFlowTest()`：
  1) skip preheat gate（仍走正式 flow step）
  2) 等待 VIP tag/warmup gate
  3) 自動送 warmup reply（正式 submit）
  4) 等待第一題 prompt + consonant replyGate armed
  5) 送正確答案（prompt.consonant）
  6) 等 reveal/post-reveal done
  7) 驗證 nextQuestionEmitted + toQuestionId（第二題確實出現）
- 任一步失敗會記錄 failedStep/failureReason。

### Formal issue fixes
- 修正 auto-advance 在 reveal 後可能卡 `post_reveal_chat_not_done`。
- 修正 debug override judge audit 不完整。

## Follow-up fix scope

- Complete authoritative judge audit persistence to sandbox SSOT (`consonantJudgeAudit`) for consonant consume path.
- Converged next-question handoff to single `ADVANCE_NEXT` consumer (`advance_next_effect`) with explicit blocked reasons and emission timestamps.
- Added same-round preheat chat dedupe guard to prevent bootstrap/warmup replay duplicates.

## Summary
- Implemented sandbox-only integration fix for authoritative judge observability and next-question emit stability.

## Changed
- Added authoritative `consonantJudgeAudit` mode state and write path at `consumePlayerReply` consonant gate.
- Debug panel now separates Display metadata (`displayAcceptedAnswers/displayAliases`) from runtime judge candidates (`runtimeAcceptedCandidates`).
- `POST_REVEAL_CHAT -> ADVANCE_NEXT` converged to single consumer path with explicit boundaries: `postRevealChatState`, `nextQuestionReady`, `nextQuestionEmitted`, `nextQuestionBlockedReason`.
- Marked `scheduler.phase` as non-authoritative auxiliary debug state.
- Added regression guards for judge audit SSOT, display/runtime separation, and advance-next guard path.

## Removed
- Item: none (runtime logic removed only at decision level: no remaining debug-ref authority for judge rendering)
- Reason: consolidated SSOT for judge observability
- Impact: debug now mirrors authoritative state; legacy/ref mixed-source confusion removed
- Alternative: N/A

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated
- [x] docs/sandbox-flow-table.md updated

## SSOT
- [ ] No SSOT changes
- [x] SSOT changed (list files + reasons below)

### SSOT changes
- `sandboxStoryMode` state adds `consonantJudgeAudit` (authoritative judge audit snapshot).
- `sandboxFlow` adds post-reveal/advance boundaries for next-question emit handoff tracking.

## Acceptance
- Debug fields checked: authoritative flow/judge/display/legacy/scheduler sections now separated.
- Desktop check: not run (logic/debug contract change).
- Mobile check: not run.

## 2026-03-10 sandbox debug panel audit + fixes

### Scope
- Sandbox mode only. No classic mode changes.

### What was fixed
- Reconnected sandbox debug buttons to authoritative runtime state updates by implementing previously noop mode APIs:
  - `advancePrompt`, `applyCorrect`, `setPronounceState`, `forceWave`, `commitAdvanceBlockedReason`, `commitHintText`.
- Standardized debug node advance behavior to SSOT path (`advancePrompt`) and explicit end-of-flow block (`end_of_nodes`).
- Added per-button debug action audit records with required observability fields:
  - `lastClickedAt`, `handlerInvoked`, `effectApplied`, `blockedReason`, `targetState`, `lastResult`.
- Added in-panel audit render block so testers can immediately see invoked/blocked/applied state.

### Why buttons looked like “no-op” before
- Several mode APIs were stubbed with `() => undefined`, so button handlers ran but did not mutate authoritative state.
- Some handlers returned early due to mode/prompt/event readiness guards without surfacing blocked reason in UI.

### Outcome
- Every audited button now leaves an action record.
- Blocked actions always include an explicit blocked reason.
- Successful actions always mutate at least one authoritative state field.

## This Change (authoritative judge audit + false-failure fix)
- Run Full Night Test 第二題成功判定改為 authoritative OR 條件：`flow.step>=WAIT_REPLY_2`、`currentPrompt.wordKey===secondQuestionId`、`replyGate=consonant_answer+armed`、或 `nextQuestion emitted+toQuestionId`。
- reveal/post-reveal observer 不再是硬失敗 gate；若 authoritative 已到第二題則直接 pass。
- render observer desync（如 `scene_not_synced`）不再覆蓋流程成功；加入 `authoritative_flow_override` 讓 `renderedQuestionId` 與 state 收斂，並保留 blockedReason 可觀測。
- 以統一 helper 補齊 `consonantJudgeAudit` 寫入預設與覆蓋，保證 normal answer、Run Full Night auto answer、Force Correct Now 都寫滿 parse+judge+source+consumedAt。

## Regression Guard Updates (authoritative judge audit + false-failure fix)
- 新增 guard：Full Night Test 必須使用 `secondQuestionAuthoritative`（非 render-only）判定 secondQuestionShown。
- 新增 guard：第二題判定必須包含 `flow.step>=WAIT_REPLY_2` 與 `replyGate consonant_answer+armed` 條件。
- 新增 guard：render sync 需支援 `authoritative_flow_override`，避免 render observer 反向覆蓋 authoritative 成功。
- 新增 guard：failed/passed `secondQuestionShown` 必須回填 authoritative 布林值。


## 2026-03-10 sandbox reveal visible render guard

- 修正 `ANSWER_EVAL -> REVEAL_WORD -> POST_REVEAL_CHAT` 只看 flow transition 的假完成：`reveal_word_done` 現在必須有 reveal 真實渲染證據。
- sandbox reveal SSOT 補齊欄位：`visible/wordKey/text/base/rest/startedAt/finishedAt/rendered/blockedReason/mode/durationMs`。
- `REVEAL_WORD` 初始化 reveal 後不再立即視為完成；需等 `reveal.phase=done` 且 `rendered=true` 才可轉 `POST_REVEAL_CHAT`。
- 新增最短可見時間常數：`SANDBOX_REVEAL_VISIBLE_MIN_MS=2500`。
- debug panel 與 `window.__CHAT_DEBUG__.sandbox.word.reveal` 新增 reveal 可見性稽核欄位。
- regression guard 新增 reveal 可見性與 done gate 檢查，避免 Q1/Q2 只過 flow 不過畫面。


## 2026-03-10 sandbox prompt/reveal normal-flow visibility fix

### Scope
- Sandbox mode integration path only (no classic mode changes).

### What changed
- Normal question activation (`WAIT_REPLY_1`) now performs authoritative visibility sync equivalent to force-visible behavior:
  - commits prompt overlay consonant,
  - commits `renderSync.stateQuestionId/renderedQuestionId`,
  - ensures prompt UI visibility derives from reply-gate-authoritative state.
- Normal `REVEAL_WORD` now initializes reveal as visible/rendered with `startedAt`, then enforces done-gate timing observability (`startedAt/finishedAt`) before `POST_REVEAL_CHAT`.
- Reveal render callback now backfills `startedAt` whenever rendered evidence is first observed.

### Regression guards
- Added guards for:
  - normal WAIT_REPLY prompt visibility sync,
  - reply-gate-driven prompt glyph visibility source,
  - reveal visible/rendered/timing initialization,
  - REVEAL_WORD done blocking when timing observability is missing.

## 2026-03-10 sandbox normal reveal visibility fix (integration mode)

### Scope
- Sandbox flow only; no classic mode changes.

### Fix summary
- `REVEAL_WORD` normal path now performs authoritative self-repair via `ensureRevealActivatedForNormalFlow()` whenever reveal enters stale/hidden/partial states (`idle|hidden|!visible|!rendered|blockedReason=hidden|missing wordKey with existing text`).
- Repaired reveal activation always writes complete reveal lifecycle payload in one place: `visible/rendered/text/wordKey/base/rest/startedAt/finishedAt/durationMs/blockedReason`.
- `REVEAL_WORD -> POST_REVEAL_CHAT` gate tightened: done transition requires `phase=done` plus `visible=true`, `rendered=true`, `blockedReason!=hidden`, and valid timing observability (`startedAt>0 && finishedAt>=startedAt`).
- Force-path parity fix: `forceRevealCurrent` now writes authoritative `wordKey/rendered/blockedReason`; `forceRevealDone` keeps `visible=true` at done boundary so normal-flow completion guards and debug observability remain truthful.

### Regression guards
- Added/updated guards to require:
  - normal-flow reveal self-repair path exists,
  - hidden blockedReason cannot remain terminal in REVEAL_WORD,
  - reveal completion requires non-empty lifecycle/timing evidence,
  - force-path reveal state carries same observability fields as normal flow.
