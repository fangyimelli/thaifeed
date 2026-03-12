## 2026-03-11 sandbox regression guards：WAIT_REPLY_4 / dynamic WAIT_REPLY_x contract

- Root cause
  - guard 雖已有 `WAIT_REPLY_2/3 -> ANSWER_EVAL`，但未明確鎖定 `WAIT_REPLY_4+` 動態 consume 契約。
  - 部分 render/answerable 觀測仍可能殘留 1~3 時代的 step hardcode。
  - `scene_not_synced_warning` 需維持 render-only 警示語義，避免被誤用為 submit blocking reason。
- Fix
  - `scripts/sandbox-v2-regression-guards.mjs` 新增 dynamic consume guard：`WAIT_REPLY_x` consume success 一律進 `ANSWER_EVAL`，禁止 consume 直接 `ADVANCE_NEXT` 與 `submit_rejected` 退回。
  - 新增 dynamic wait-step guard：global freeze / answerable / consume index 必須使用 `isSandboxWaitReplyStep` + `parseSandboxWaitReplyIndex`。
  - 新增 render-only guard：`scene_not_synced_warning` 必須只存在 render sync；禁止進入 submit/consume blocked reason。

## 2026-03-11 sandbox audit fix：Q2/Q3 consume shortcut + cross-question evidence pollution

- Root cause confirmed
  - `WAIT_REPLY_2/WAIT_REPLY_3` consume 後直接 `ADVANCE_NEXT`（未經 `ANSWER_EVAL/REVEAL_WORD/POST_REVEAL_CHAT`）。
  - `ADVANCE_NEXT` completion evidence 可吃到前題 `post_reveal_chat_done`（跨題污染）。
  - reveal snapshot 僅在特定路徑 reset，Q2 未進 reveal 時會殘留 Q1 snapshot。
- Fix
  - consume transition 改為：`player_reply_2_consumed -> ANSWER_EVAL`、`player_reply_3_consumed -> ANSWER_EVAL`。
  - `hasPostRevealCompletionEvidence` 改為 per-question：要求 `postRevealCompletedQuestionId === currentQuestionId`；audit transition 也需 `item.questionId === currentQuestionId`。
  - `ADVANCE_NEXT` 新增同題完整鏈 guard：同題需具備 `answerEvalCompletedQuestionId + revealCommittedQuestionId + postRevealCompletedQuestionId`，否則 `advance_next_blocked:missing_per_question_chain`。
  - reveal snapshot 增加 per-question 欄位並在 `setCurrentPrompt/forceAdvanceNode/advancePrompt` reset：`revealEligibilitySnapshotId/revealCommitSourceSnapshotId/revealSnapshotQuestionId/revealSnapshotWordKey`。
- Regression guards
  - 新增 script guard：禁止 `WAIT_REPLY_2/3 -> ADVANCE_NEXT` shortcut。
  - 新增 script guard：`ADVANCE_NEXT` 必須使用 per-question evidence。
  - 新增 script guard：reveal snapshot 必須具 question/word scope 與 mismatch guard。

## 2026-03-11 sandbox mention/tag answer pipeline 對齊（AUDIT+FIX）

- Root cause（primary）
  - UI 顯示 NPC tag 玩家提問，但 `consonant_answer` consume 仍以 `replyTarget` 作為 hard gate；玩家輸入 `@mod_live ㄅ` / `@123132 ㄅ` 會在 judge 前被 `reply_blocked:target_mismatch` 擋下，導致 UI 引導與 authoritative consume 規則衝突。
- Secondary issues
  - answer extraction 舊路徑僅做簡單前置 `@mention` regex，對 reply wrapper / 多 mention / 系統自動 tag 不一致。
  - blocked path 與 evaluated path 觀測欄位不一致，造成 judge audit 常見空值。
- Fix
  - 新增單一 authoritative answer extraction pipeline：`raw -> detect mentions -> strip leading mentions/reply wrapper -> normalize -> candidate compare -> judge -> consume`。
  - `consonant_answer` / `consonant_guess` consume 改為忽略 reply target mismatch；target 僅保留 trace/debug。
  - judge/telemetry 寫入 extraction 資料（mentions、stripped payload、normalized），確保每次玩家輸入都有可審計紀錄。
- Regression guard
  - 新增 `scripts/regression-consonant-mention-pipeline.mjs`，檢查：mention stripping helper 存在、consonant gate 明確忽略 target mismatch、answer pipeline 寫入 telemetry/audit。

## 2026-03-11 sandbox NIGHT_01 post-reveal deadlock fix（authoritative runner + judge blocked audit）

- Root cause
  - `REVEAL_WORD -> POST_REVEAL_CHAT` 已經 commit，但 effect 在 `reveal.phase === 'done'` 時只允許 `flow.step==='REVEAL_WORD'` 繼續執行；一旦 flow 進入 `POST_REVEAL_CHAT` 立即 early return，導致 postReveal runner 不會 start（`startEligible=true` 仍 `startAttempted=false`）。
- Fix
  - reveal done guard 改為 authoritative reveal-driven steps：`REVEAL_WORD | POST_REVEAL_CHAT | ADVANCE_NEXT` 才可通過，確保 postReveal/advance runner 必定在合法 tick 內執行。
  - 補齊 blocked consume judge audit：`no_gate / gate_not_armed / can_reply_false / target_mismatch / stripped_empty` 全部寫入 `consonantJudgeAudit`（含 expected/accepted/compare/result/consumedAt），避免 debug 顯示 `judge=-`。
- Regression guard
  - 新增檢查 reveal done runner 必須包含 `POST_REVEAL_CHAT` 與 `ADVANCE_NEXT`。
  - 新增檢查 blocked consume 必須寫入 `judgeResult='blocked'` 與各 blocked path helper。

## 2026-03-11 sandbox integration fix（POST_REVEAL runner same-ms stall）

- Root cause（primary）
  - sandbox authoritative flow 在 `REVEAL_WORD` commit 後可正確進入 `POST_REVEAL_CHAT`，但 runner 喚醒依賴 `setSandboxRevealTick(Date.now())`。同一毫秒內重複寫入會被 React 視為相同值，effect 不重跑，造成 entered-but-not-started。
- Fix
  - 新增 monotonic tick helper：`bumpSandboxRevealTick(hintAt?)`，採 functional updater，保證每次 transition 都會產生遞增 tick。
  - 全部 sandbox runner 喚醒點改用 helper，包含 reveal/postReveal/advanceNext/debug actions。
- Regression guard
  - `scripts/sandbox-v2-regression-guards.mjs` 新增檢查：
    - 必須存在 `bumpSandboxRevealTick`。
    - 必須使用 `setSandboxRevealTick((prev) => ...)`。
    - 禁止直接 `setSandboxRevealTick(Date.now())`。

## 2026-03-11 — Sandbox reveal transition stale-state fix (SSOT)

- 新增 reveal transition SSOT helper：`buildRevealTransitionSnapshot()`，將 `guardReady/completionReady/transitionEligible/transitionBlockedBy` 收斂為單一來源。
- `REVEAL_WORD -> POST_REVEAL_CHAT` commit 改為同一條 authoritative path：eligible 時同次寫入 commit observability 與 `setFlowStep('POST_REVEAL_CHAT', ..., commitAt)`。
- 新增 snapshot observability：`revealEligibilitySnapshotId`、`revealCommitSourceSnapshotId`，驗證 eligibility 與 commit 同源。
- Debug panel 顯示新增 snapshot id 欄位，避免「debug 看起來可過但 commit 實際阻擋」脫鉤。
- Regression guards 補強：eligible snapshot 必須驅動 commit，且 commit blocked reason 不可回退為 `reveal_not_done`。

## 2026-03-11 sandbox reveal transition commit SSOT fix (integration mode)
- Root cause：`REVEAL_WORD` debug guard 顯示 eligible，但 transition commit observability 與 authoritative step commit 未強綁，導致 `postReveal.enteredAt/advanceNext.enteredAt` 長期為 0。
- 修正：REVEAL completion 成立時統一以 commitAt 同步寫入 `reveal.transitionCommit*` 並 `setFlowStep('POST_REVEAL_CHAT', reason, commitAt)`，確保 debug 與 authoritative flow 完全一致。
- 清理：移除 `reveal_guard_warning:cleanup_hidden` 作為 reveal 完成後的 guard 輸出；`cleanup_hidden` 不得再阻擋 completion transition commit。
- 驗收：第一題流程可達 `WAIT_REPLY_1 -> ANSWER_EVAL -> REVEAL_WORD -> POST_REVEAL_CHAT -> ADVANCE_NEXT -> 第二題`，且 `nextQuestion.ready/emitted=true`、`flow.questionIndex=1`、`currentPrompt.questionId` 為第二題。
- Regression guards：新增 reveal transition commit 欄位與 commit reason 檢查，禁止回歸到 cleanup_hidden warning 阻擋鏈。

## 2026-03-11 sandbox reveal completion transition unblock (integration mode)
- Root cause：`REVEAL_WORD` 雖然 `phase=done/rendered=true/completionReady=true`，但 cleanup 後 `visible=false` 仍被誤映射成 `reveal_guard_blocked:cleanup_hidden`，導致無法轉入 `POST_REVEAL_CHAT`，後續 `ADVANCE_NEXT/nextQuestion emit` 全鏈停滯。
- 修正：reveal guard 以 `done + rendered + timing` 為唯一 transition SSOT；`cleanup_hidden` 降級為 `reveal_guard_warning:cleanup_hidden`（非阻擋）。
- 補 bounded guard：`REVEAL_WORD` 完成後若超過 `SANDBOX_REVEAL_TO_POST_REVEAL_MAX_STALL_MS` 仍未轉場，觸發 `reveal_word_done_bounded_recovery` 進 `POST_REVEAL_CHAT`。
- observability：新增 `reveal.transitionEligible` / `reveal.transitionBlockedBy` / `postReveal.enteredAt` / `advanceNext.enteredAt`。
- regression guards：新增 bounded recovery、cleanup_hidden warning-only、Q1 正解後必入 Q2 flow、post/advance enteredAt 可觀測檢查。

- [sandbox][integration-fix][debug-action-ssot-reconciliation] 修正三個 debug action 語義與狀態收斂：Pass Flow 只走合法流程 stage；Force Correct Now 僅以 currentPrompt/questionId 的 authoritative canonical answer 判對，且 blocked 條件需有 active answer gate；Force Next Question 僅切到下一題可回答狀態，不可直接進 reveal，並統一清空 reveal/judge/parse/consume 殘留。同步新增 debugAction 可觀測欄位、scene key canonicalization、renderedQuestionId bounded fallback、以及 `REVEAL_WORD(done+rendered+timing)` 不再被 `visible=false` 阻擋。
- 2026-03-11 [sandbox][authoritative-consume-chain] 修正 smoke `auto_answer_q1` 假失敗：auto answer 若注入後未 consume，會在 bounded time 內 retry 並用 authoritative 原因失敗（`reply_blocked:*` / `message_injected_but_not_consumed`），成功判定改為 consume record + flow 離開 `WAIT_REPLY_1` + judge/reveal 進展；第二題顯示判定改為 `nextQuestion emit + toQuestionId + prompt/flow index` authoritative 對齊，禁止 render-only 假陽性。
## 2026-03-11 sandbox reveal->post_reveal->advance_next guard stabilization
- 修正 `REVEAL_WORD` timing observability 缺欄位導致無限停留：若 `phase=done/rendered=true` 但 `startedAt/finishedAt` 缺失，先補 timing 後以 `reveal_word_done_timing_repaired` 前進 `POST_REVEAL_CHAT`。
- `nextQuestionBlockedReason` 改為 stage-scoped 前綴，並新增 `nextQuestionStage`、`nextQuestionBlockedReasonSource`，清除 reset 初值 `not_armed` 在 reveal/post-reveal/advance 期間誤導 debug。
- debug panel 新增 reveal/post_reveal/advance guard readiness 與 blocked reason source/stage 欄位，可直接判讀卡點。
- 維持 `scene_not_synced_warning` 為 warning，第二題 emit 不再受 render sync timing 影響。

## 2026-03-10 reveal pipeline audit (no behavior change)

- Scope: sandbox story reveal observability only; no flow gating or timing logic changed.
- Added `sandbox.reveal.text` to debug mirror payload so reveal text is directly visible from authoritative reveal block.
- Audit confirms reveal render path is `sandboxState.reveal -> SceneView.wordReveal -> SandboxWordRevealText` and render evidence returns via `onRenderStateChange`.

- [sandbox][night-smoke-test] `Run Full Night Test` 更名為 `Run Night Smoke Test`，同步更新 debug action audit key 為 `run_night_smoke_test` 與 Flow Test 面板文案。
- [sandbox][prompt-visibility] 修正題目切換 hidden prompt：可作答題目轉場時強制對齊 `currentPrompt` + `renderSync.stateQuestionId/renderedQuestionId`；`scene_not_synced` 降級為 `scene_not_synced_warning` 並維持題目可見。
- [sandbox][force-next] `Force Next Question` 現在會建立下一題 prompt 並提交 renderSync（`force_next_prompt_activated`），缺少 next node 時直接 blocked，避免產生 `missing_current_prompt/state_question_missing` 壞狀態。
## 2026-03-10 sandbox full-night auto-answer authoritative submit path unification

- `Run Full Night Test` Q1 auto answer 不再只靠 UI 注入訊息；改為重用正式 `submitChat` -> `createPlayerMessage` -> `consumePlayerReply(payload)` 路徑。
- `consumePlayerReply` payload 新增 authoritative metadata（`messageId/sourceType/playerId/targetPlayerId/sourceMessageId`），讓 auto answer 與真人送出共用相同 consume/matching gate。
- `lastReplyEval.messageId` 支援沿用真實 message id，避免 debug 觀測混淆。
- Full Night Test 成功條件強化：必須看到 parse 已評估、judge audit 寫入、`consumedAt>0`、flow 脫離 `WAIT_REPLY_1`。
- 失敗分類細分為 `message_injected_but_not_consumed`、`message_rejected_by_gate`、`parse_failed:*`、`judge_failed`，替代舊的籠統 `answer_not_consumed`。

- [sandbox][integration-fix][full-night-false-failure-authoritative-judge-audit] 修正 Full Night Test 以 render/post-reveal observer 誤判失敗：改由 authoritative flow 判定 second question 成功，並將 render desync 降級為 warning；同時統一 judge audit 寫入 helper，避免 parse 有值但 judge 欄位空白（涵蓋 normal answer / auto test / Force Correct Now）。
## 2026-03-10 sandbox q2 render sync authoritative commit

- 修正第二題 state/render 斷裂：新增 `renderSync.stateQuestionId/renderedQuestionId/renderBlockedReason` authoritative 視覺提交狀態，避免 `flow/currentPrompt` 已切但畫面仍停留第一題。
- `secondQuestionShown` 定義改為 `nextQuestion emitted + prompt 對齊 + rendered 對齊`，不再把「state ready」誤當成「已渲染成功」。
- `ADVANCE_NEXT` 與 `Force Next Question` emit 下一題時，強制依 `flow.questionIndex` 發出 `REQUEST_VIDEO_SWITCH`，使 scene/video 與題目 prompt 同步切換。
- Debug panel 新增 `render.stateQuestionId/renderedQuestionId/render.blockedReason` 與 `expectedSceneKey/video.currentKey`，可直接定位 overlay/freeze/scene 未提交原因。
- 補 regression guards：第二題 shown 必須 rendered 對齊、render mismatch 必須可觀測 blocked reason、emit 下一題必須觸發 scene switch。

## 2026-03-10 sandbox post-reveal SSOT convergence + second question emit fix

- 修正 `ADVANCE_NEXT` completion source 分裂：新增單一 helper 收斂 `postRevealChatState`、`audit.transitions(reason=post_reveal_chat_done)`、`backlogTechMessages.length===0`，避免已完成卻被判 `post_reveal_chat_not_done`。
- `ADVANCE_NEXT` emit 下一題後，正式同步切換 `currentPrompt` 與 flow step（Q1->`TAG_PLAYER_2_PRONOUNCE`，Q2->`TAG_PLAYER_3_MEANING`），防止已 emit 但畫面/題目仍停留上一題。
- `Run Full Night Test` 第二題成功改為 authoritative emit + prompt 對齊（`prompt.current.wordKey === nextQuestionToQuestionId`），不再僅依 stale visual state。
- 補 regression guards：post-reveal 完成 SSOT、第二題 emit 後 prompt 切換、Full Night Test second-question authoritative 判定、judge audit 完整寫入（正常/自動/force）。

## 2026-03-10 sandbox full-night-test authoritative submit/consume fix

- `Run Full Night Test` 第一題自動答題改為強制收斂至 authoritative reply consume/judge path：提交後必須觀察 `WAIT_REPLY_1` 退出或 gate consumed，再確認 `parse.raw` 已寫入且 `parse.kind != not_evaluated`。
- 若仍停在 `WAIT_REPLY_1`，失敗改為精準回報 `answer_not_submitted` / `answer_not_consumed` / `judge_not_triggered`；不再把前段停滯誤判成 `reveal_post_reveal/post_reveal_not_done`。
- 維持 judge audit SSOT 要求：Full Night Test 自動答題與正常答題共享同一 authoritative consume/judge 寫入路徑。

## 2026-03-10 sandbox authoritative convergence + judge audit completion
- `Run Full Night Test` 失敗判定改為 authoritative 收斂：第二題若 `nextQuestionEmitted=true`，不允許仍落 `failedStep=second_question`。
- `secondQuestionShown` 與 `toQuestionId` 改由 `sandboxFlow.nextQuestion*` authoritative 欄位決定，避免 stale `questionIndex` 導致誤判。
- `consumePlayerReply` 在 wait-reply 階段改以 `flow.step` 決定 gateType（`warmup_tag` / `consonant_answer`），避免舊 gateType 讓 judge pipeline 不完整。
- 補強 regression guard：覆蓋 full-night authoritative emit 收斂與 judge audit 完整欄位寫入（正常答題 / 自動答題 / force-correct）。

- [sandbox][debug-panel] Sandbox debug panel 改為 `Flow Test` + `Force Debug` 兩區，僅保留 `Run Full Night Test`、`Pass Flow`、`Force Correct Now`、`Force Next Question`、`Force Ghost Event`。
- [sandbox][full-night-test] `Run Full Night Test` 每次先強制 bootstrap/re-init 乾淨起點，修正中途狀態導致 `vip_tag_not_emitted` 假失敗問題。
- [sandbox][force-path] `Pass Flow`（正式 guard path）與 `Force Next Question`（force path）語義分離：前者走 `advancePrompt`，後者走 `forceAdvanceNode` + `nextQuestion*` authoritative audit。
- [sandbox][force-correct] `Force Correct Now` 保持完整 judge audit 寫入，且 blockedReason 僅在 truly impossible 條件出現。

## 2026-03-10 sandbox debug panel 收斂 + auto flow test（integration enforced）

- [sandbox][debug buttons] 依 SSOT/authority 收斂 debug buttons：保留 `Pass Flow`、`Force Correct`、`Trigger Random Ghost`、`Run Sandbox Flow Test`；刪除重疊與非必要按鈕（ForceResolveQna、ClearReplyUi、Force Next Node、Force Reveal Word、ForcePlayPronounce、ForceWave*）。
- [sandbox][auto flow test] 新增一鍵自動流程測試：透過正式 submit/evaluator/flow gate 驅動從第一題到第二題，並輸出結構化結果（running/passed/failed 與 failureReason）。
- [sandbox][advance-next] 修正 reveal 後偶發 `post_reveal_chat_not_done` 阻塞：`ADVANCE_NEXT` 在 reveal done + gate released 時自動補完 postReveal done gate，確保可穩定進到第二題。
- [sandbox][judge audit] `Force Correct` 改為同步完整落盤 authoritative judge audit（parse/judge/sourcePromptId/sourceQuestionId/sourceWordKey/gateType/consumedAt）。

## 2026-03-10 follow-up fix（judge audit completeness + advance-next emit + preheat dedupe）

- 補齊 authoritative judge audit 寫入完整度：parse 與 judge 欄位同筆落盤，不再出現 parse 有值但 judge 全空。
- `ADVANCE_NEXT` 建立單一 consumer（`advance_next_effect`），並擴充 next-question 可觀測欄位：`ready/emitted/blockedReason/fromQuestionId/toQuestionId/decidedAt/emittedAt/consumer`。
- 當無法 emit 下一題時，`nextQuestionBlockedReason` 保證非空。
- preheat/ambient chat 注入改為單一責任 + fingerprint 去重，避免同輪重播暖場句。
- 2026-03-10 sandbox_story integration fix: `WAIT_REPLY_1` 正式 gate 新增 source message binding，`replyGate.sourceMessageId` 不可為空（發問 message commit 當下即回填）。
- 2026-03-10 sandbox_story integration fix: `answerGate` 降級為 debug compatibility mirror，不再獨立驅動流程。
- 2026-03-10 sandbox_story integration fix: consonant evaluator 對齊 classic SSOT，改用 `normalizeInput/parseThaiConsonant/judgeConsonantAnswer`，並新增 guard 防止回退到 sandbox 自有 parser。

- [sandbox][WAIT_WARMUP_REPLY] 修復 flow 已進 `WAIT_WARMUP_REPLY` 但 `replyGate` 未 armed 的缺陷；進入 wait step 時強制建/補 `warmup_tag` gate（含 `targetPlayerId/sourceMessageId/sourceType/consumePolicy`）。
- [sandbox][routing] wait-reply step 玩家輸入改為只能走 evaluator consume，不再 fallback 成 free chat（移除該步驟 `consume_fallback_to_free_chat` 覆寫路徑）。
- [sandbox][legacy compatibility] `answerGate` 只保留 mirror，狀態由正式 `replyGate` 同步，避免 authority 分裂。
- [guard] 新增 warmup gate regression guards：`WAIT_WARMUP_REPLY` 必須 `gateType=warmup_tag + armed + canReply`，且 wait-step submit 不可走 free-chat fallback。

## 2026-03-09（sandbox_story bootstrap single-entry + state-mount integrity）
- [sandbox][bootstrap authority] 新增 `ensureBootstrapState(reason, at, minDurationMs, force)`，統一 mode entry / guard recovery / clearReplyUi re-init 的 bootstrap 入口，避免 App 與 mode 雙軌初始化。
- [sandbox][state mount] `createSandboxV2InitialState()` 改為直接產出可用核心狀態：`flow.step=PREHEAT_CHAT`、`questionIndex=0`、`stepStartedAt>0`、`scheduler.phase=preheat`、`introGate.startedAt>0`、`introGate.minDurationMs=30000`。
- [sandbox][reset/cleanup] `clearReplyUi` 與 runtime guard 改呼叫 `ensureBootstrapState(..., force=true)`，reset 後保證回到正式 bootstrap state，而非空 state。
- [sandbox][visual/core alignment] `ui.consonantBubble.visible` 必須同時滿足 core bootstrap 條件（flow/scheduler/introGate）才可顯示，避免 visual state 與 core state 脫鉤。
- [guard] `scripts/sandbox-v2-regression-guards.mjs` 更新檢查：bootstrap authority、initial PREHEAT core state、clearReplyUi re-init 與 visual/core 對齊。

## 2026-03-09（sandbox_story debug panel SSOT clean-up）
- [sandbox][debug-panel] debug panel 新增分區：`CORE FLOW STATE – TRUSTED`、`FLOW / GATE DIAGNOSTICS`、`PROMPT / JUDGE / REVEAL`、`LEGACY COMPATIBILITY`、`VISUAL STATE – NOT FLOW AUTHORITY`，避免混合未標註狀態來源。
- [sandbox][debug-panel] 修正 `sandboxFlow.*` row 讀值來源：由錯誤 `sandbox.flow.*` 改為 `sandbox.sandboxFlow.*`。
- [sandbox][debug-panel] `answerGate.*` 改為 `[LEGACY COMPATIBILITY – NON AUTHORITATIVE]` 並補充 `replyGate` 為 authoritative gate 說明。
- [sandbox][Removed/Deprecated Log] debug panel 移除 `storyPhaseGate.*` 佔位列、`sandbox.currentPrompt.*` 與 `sandbox.reveal.*` 重複顯示欄位。
- [sandbox][debug-panel] `audit.transitions` 顯示文案補充來源註記：`(source: state.audit.transitions | fallback)`。

## 2026-03-09（sandbox bootstrap/state mount/debug 空值修復）
- [sandbox][bootstrap SSOT] 新增 `sandboxStoryMode.bootstrapRuntime(reason, at, minDurationMs)` 作為唯一正式初始化入口；mode switch / guard recovery 改呼叫同一入口，統一建立 `flow.step/questionIndex/stepStartedAt`、`introGate.startedAt/minDurationMs/passed`、`scheduler.phase`、`replyGate`、`currentPrompt`、`lastReplyEval`、`audit.transitions`。
- [sandbox][clear/reset] `clearReplyUi` 新增 re-init guard：若偵測 sandbox flow/scheduler/introGate 失效，立刻執行 `bootstrapRuntime('clearReplyUi_reinit')`，避免「mode= sandbox_story 但 state 未掛起來」。
- [sandbox][debug] `audit.transitions` 改以正式 `state.audit.transitions` 為權威來源；僅在缺失時由 transitions 衍生顯示，修正 debug 全空問題。
- [guard] `scripts/sandbox-v2-regression-guards.mjs` 新增 bootstrapRuntime / audit bootstrap / clearReplyUi_reinit / guard recovery 檢查。

- [sandbox][bootstrap/flow] NIGHT_01 前段流程整體修復：`PREHEAT_CHAT -> VIP_TAG_PLAYER -> WAIT_WARMUP_REPLY -> POST_REPLY_CHAT -> REVEAL_1_START -> REVEAL_1_RIOT -> TAG_PLAYER_1 -> WAIT_REPLY_1`，禁止暖場前出題與未回覆自動跳段。
- [sandbox][replyGate] 建立 single SSOT：autoPinFreeze 改讀正式 `replyGate`，不再由 mention detection 創造等待 gate。
- [sandbox][input-eval] `writeSandboxLastReplyEval` 追加正式 `setLastReplyEval` 回寫，修正 evaluator 有跑但 debug 為 `-`。
- [sandbox][prompt/reveal] 第一題評分鏈路收斂為 `ANSWER_EVAL -> REVEAL_WORD -> POST_REVEAL_CHAT`，並在 reveal step 觸發 pronounce 狀態更新。
- [guard] regression guard 新增 NIGHT_01 step 序列關鍵檢查（VIP_TAG_PLAYER/WAIT_WARMUP_REPLY/POST_REPLY_CHAT/ANSWER_EVAL/REVEAL_WORD/POST_REVEAL_CHAT）。

- [sandbox][SSOT] replyGate schema 對齊整合模式要求：`type -> gateType`、`targetActor -> targetPlayerId`，並在 state shape 補 legacy fallback 映射避免舊資料斷裂。
- [sandbox][flow/debug] 將 `deriveSandboxReplyGateState()` 每 tick 同步回寫至 mode state，統一 `flow.replyGate*` 與 `replyGate` 讀值來源。
- [guard] `scripts/sandbox-v2-regression-guards.mjs` 新增 replyGate schema/debug 欄位檢查，避免回歸到 UI 看起來有 gate 但正式 state 缺欄位。

- [sandbox] 修正 sandbox v2 主流程啟動：`ensureSandboxRuntimeStarted` 進 mode 即強制 `BOOT -> PREHEAT_CHAT`，`scheduler.phase` 進入 `preheat`，`questionIndex=0`，`introGate.startedAt/minDurationMs=30000`，並補齊 transitions 非空。
- [sandbox] 預熱改為單一路徑 orchestrator：新增受控 `SANDBOX_PREHEAT_CHAT_SEQUENCE`，預熱 30 秒內只允許自然聊天 + 節制 join。
- [sandbox] 阻斷 legacy join spam emitter：sandbox mode 下停用舊 `system_ui` join loop；移除 `mod_live` 代發 `viewer_xxx 進來了`，改為 `system` subtype=`join`，總量上限 4 且 sender anti-flood。
- [guard] 擴充 `scripts/sandbox-v2-regression-guards.mjs`：加入 PREHEAT join cap、同 sender flood guard、legacy join emitter block、preheat natural chat contract 檢查。

- [sandbox] 修正 sandbox_story v2 root runtime mount：補齊正式 initial state shape、mode 進入即掛載、debug hydration 直讀 v2 root state，避免 `sandbox.ssot.version/flow.step/scheduler.phase` 顯示 fallback `-`。
- [guard] 擴充 `scripts/sandbox-v2-regression-guards.mjs`：initial shape、mode mount、debug hydration、ssot.version、flow.step/scheduler.phase 五項回歸檢查。

- [regression] 新增 `scripts/regression-night01-live-chat-guards.mjs` 新版檢查：reveal-before-riot、prompt-before-tag、gate-before-ask、finite ambient、mention strip。

### Added

### Changed
- [state] `reducer.initialState.messages` 清空，移除教材式 boot seed system 訊息。

### Regression Guards
2. TAG_PLAYER_1 同 fingerprint 不可重覆首問。
3. canAskConsonantNow 不可 hardcoded false。
4. reducer 初始 state 不可注入教材式 seed。

### Changed

### Regression Guards
- PREHEAT 30 秒內不得出現正式題目。
- 第一題前不得出現 system 出題。
- 同 sender 不得在同 gate 連刷同句。
- autoplayNightEnabled=true 必須可推進到 ADVANCE_NEXT。
- 每次玩家輸入都必須記錄 lastReplyEval。
- WAIT_REPLY gate 必須有 gateType。
- debug flag 不得影響正式 flow。

### Changed

### Regression Guards
- PREHEAT 30 秒 guard + preheat sourceTag allowlist guard。
- WAIT_REPLY gateType non-none guard。
- autoplay must reach ADVANCE_NEXT guard。

- 停用 warmup legacy flow 與 warmup gate path，避免雙軌。
- backlog 規則改為僅 WAIT_REPLY_3 累積，FLUSH_TECH_BACKLOG flush 後清空。
- 新增 regression guards：
  - `scripts/regression-freeze-watchdog.mjs`
  - `scripts/regression-question-send-failed.mjs`

### Added
- [guard/regression] `tagFlow` 補 `append_missing_message_id` guard；`qnaEngine.markQnaQuestionCommitted` 補 missing id abort guard。

### Changed

### Notes

### Added
- [audit/trace] 完整追蹤 submit pipeline / warmup consume / flow transition / debug entry，定位「訊息已送出但 gate 未 armed」路徑。

### Findings

### Removed / Deprecated
- 無（audit only）。

### SSOT / Debug 記錄
- SSOT：無資料模型變更。
- Debug：無 runtime 欄位新增；報告建議補 `lastReplyEval` 與 pinned/gate source 對應欄位。

- 新增 warmup 專用 flow step：`TAG_PLAYER_WARMUP / WARMUP_TAG_REPLY / WARMUP_NPC_ACK / WARMUP_CHATTER`。
- 第一個暖場 tag 改為獨立 gate：玩家任意非空回覆即成立，且不進 `parseAndJudgeUsingClassic / commitConsonantJudgeResult`。
- 回覆後固定 NPC 接一句「今天氛圍跟之前不一樣」語意，並補 2~4 句自然聊天室續聊。
- 完成暖場後才切入 `TAG_PLAYER_1` 並建立正式子音題 prompt/judge。
- classic mode 無改動。

### SSOT / Debug 欄位變更紀錄
- Debug：新增 `warmup` 物件與對應 debug panel 顯示欄位。

- 未修改 runtime code；classic mode 無改動。
- 結論重點：
  2. preheat mention 與子音題 prompt 來源不同，可能造成玩家回覆 target 錯位。
  3. `consonant.promptText/promptCurrent` 可殘留，不能單獨視為有效作答狀態。

### SSOT / Debug 欄位變更紀錄
- SSOT：無變更（audit only）。
- Debug：無新增欄位；補充 trace/根因文件化。

- 未修改 runtime code；classic mode 無改動。
- 結論重點：
  2. pinned 文案來源與有效子音 prompt 非同源，造成 UI target 誤導。
  3. `2jo` 對 `บ` 依現規則本來不合法，但本案先是 parser 沒跑。

### SSOT / Debug 欄位變更紀錄
- SSOT：無變更（audit only）。
- Debug：無新增欄位；補充 trace/根因文件化。

- `src/app/App.tsx`
  - auto pin lock target 改以 source actor（提問者）為準，不再寫成 active user。
  - `submitChat()` 新增 self-target 防呆：`lockTarget === activeUserHandle`（大小寫/等價 handle）時，不做 mention rewrite，並清掉 lock。
  - `Emit NPC Tag @You` 改為 isolated debug chat injection（不走 event pipeline，不干擾正式 qna/lock/pin）。
- `src/ui/chat/ChatPanel.tsx`
- `src/styles.css`

### Debug consistency
- 新增/使用 `self_lock_target_guard` anomaly 標記，追蹤自鎖定防呆降級。

- `src/chat/tagFlow.ts`：append 改為 success-or-abort；回傳 resolved messageId，只有成功才進 pin/freeze。
- `src/app/App.tsx`：
  - `dispatchChatMessage` 回傳 `{ ok: true, messageId }`。
  - 新增 `AWAITING_REPLY` source guard：source 缺失或 lock/source 不一致即清除 reply UI + freeze，並標記 aborted。
  - debug actions（Emit NPC Tag / Simulate Send / Toggle TagLock）改 isolated path，不再直接寫正式 qna/lock/pin。
- `src/ui/chat/ChatPanel.tsx`：reply pin render guard 升級（status + id + source + consistency），移除全域 pin bar 的 missing-source fallback。

### Debug consistency

### Scope
- 本次不實作修復，不改功能邏輯。

### Audit artifacts

### Confirmed findings
- `↳ @mod_live` / `（原始訊息已不存在）` 來自 `ChatPanel` 全域 reply pin bar（`qnaStatus + questionMessageId`），非該則 mention message 被畫成 reply。
- `@t` 來源是玩家 handle 值（資料建立時即為單字元），非 UI truncation。
- 已定位 fallback 觸發路徑：tag flow append 失敗仍可 commit `questionMessageId`，導致 lookup miss。

### SSOT / Debug 欄位變更
- SSOT：無變更（audit only）。
- Debug 欄位：無 runtime 欄位新增/刪除（僅文件化稽核證據鏈）。

### Root cause
- 取得失敗時 pinned body 寫入 `''`，在 `ChatPanel` 被渲染為 `「」`。

### Changed
- `src/app/App.tsx`
- `src/ui/chat/ChatPanel.tsx`

### Validation
1. VIP direct mention pinned body 顯示完整訊息：PASS。
2. 不再出現 `「」` 空字串 pinned：PASS。
3. classic mode：未變更。

### Root cause

### Changed
- `src/app/App.tsx`
  - 自動 pin 建立與清除流程改用新 schema，並保留既有 freeze + clear lifecycle。
  - debug 顯示調整：`pinnedSourceReason` 取自 audit state，不從 pinned entry 讀取。
- `src/ui/chat/ChatPanel.tsx`
  - 移除 `reason`/metadata 直接渲染。

### Validation
1. VIP direct mention：highlight + pinned + freeze（PASS）
2. GHOST_HINT_EVENT follow-up：pinned + freeze（PASS）
4. classic mode 無改動（PASS）

### Root cause
- `dispatchChatMessage()` 雖然已正確判定 `VIP + @玩家` 並觸發 auto pin/freeze。
- 結果是：聊天室 row highlight（mention style）仍生效，但 pinned reply UI（獨立區塊）沒有可渲染狀態。

### Changed
  - pinned 區塊改為獨立於 reply preview，確保 highlight / pinned 不再混用同一個判斷。
  - 補齊 autoPinFreeze 可追蹤欄位：
    - `lastDirectMentionDetected`
    - `lastPinnedCandidateMessageId`
    - `lastPinnedCreatedAt`
    - `lastPinnedRenderVisible`
    - `pinnedStateKey/pinnedStateSummary`
    - `pinnedSourceReason`
    - `pinnedExpiresAt/pinnedRemainingMs`
    - `lastPinnedDroppedReason`
    - `highlightWithoutPinned`
    - `cleanupClearedPinned`
    - `pinnedOverwrittenByMessageId`
    - `pinnedComponentMounted`

### Integration decision（舊邏輯整合/淘汰）
- 保留既有 highlight 與 freeze 邏輯（仍有必要）。

### Validation
- VIP 一般聊天：不建立 pinned（PASS）。
- VIP direct mention：聊天高亮 + pinned 區塊出現 + freeze 生效（PASS）。
- GHOST_HINT_EVENT follow-up：可建立 story-critical pinned，不再只剩 highlight（PASS）。
- pinned 不瞬間消失，具 `expiresAt` 與 remaining ms（PASS）。
- pinned 到期後正常清除（PASS）。
- classic mode 無變更（PASS）。

### Root cause
- `GHOST_HINT_EVENT` 事件佇列原本是 `system + 3 則觀眾推理`，沒有 VIP follow-up 主線位階，導致提示被一般訊息稀釋。

### Changed
  - 新增每種 ghost hint 對應的 VIP follow-up 文案池，確保 NIGHT_01 提示節奏可見。
  - 命中 `vip_direct_mention` 或 `story_critical_hint_followup` 時，統一走自動 pin+freeze 路徑（可配置區間 5~8 秒，預設 6s/7s）。
  - freeze 到期後自動解除（並 guard：若仍在既有 WAIT_REPLY forced-reply，不會誤解除）。
    - `evaluation.directToPlayer`
    - `evaluation.hitVipDirectMentionRule`
    - `evaluation.hitStoryCriticalRule`
    - `evaluation.shouldPin`
    - `evaluation.failureReason`
    - `evaluation.pinnedReason`
    - `evaluation.freezeReason`
    - `freezeRemainingMs`
    - `lastMessageId / lastReason / lastHintFollowUpEvent`
- [schema] `src/core/state/types.ts`
  - `ChatMessage` 新增 `hintEventName`（供 debug 與主線 follow-up 追蹤）。

### Validation
- 2) 一般 VIP 閒聊（未 @玩家）不會 auto pin：PASS
- 3) `[GHOST_HINT_EVENT]` 後會出 VIP 主線 follow-up，且 pin + freeze：PASS
- 4) freeze 到時可自動恢復，不會卡死：PASS
- 5) classic mode 無變更：PASS

- 新增硬步驟：`VIP_SUMMARY_1`、`DISCUSS_PRONOUNCE`、`VIP_SUMMARY_2`，取代原本依賴隨機池的 summary 行為。
- 修正三段 tag 防重送：每 step 只允許一次 tag emit，重跑直接 return。
- 修正 PREHEAT routing：`final_fear` 權重在 PREHEAT 固定為 0。
- 修正 tech backlog：僅 `WAIT_REPLY_3` 累積、`FLUSH_TECH_BACKLOG` 才 flush（<=8；尾行分鐘數固定格式）。
- 修正 step transition：同 step 不再重覆 set（避免多來源重推進）。
- classic mode 無變更。

### Changed
  - reply preview 查找改為使用完整訊息集合（full `messages` sanitize 後索引），不再只查 `slice(-MAX_RENDER_COUNT)`。
  - 聊天列表仍只 render 最後 `MAX_RENDER_COUNT`；僅 reply preview lookup 改為 full list。
  - `WAIT_REPLY_1/2/3` 新增 scheduler hard pause（清除 timer 並停止下一輪排程），不再只靠 emit gate 丟棄輸出。
  - 離開 WAIT_REPLY step（玩家回覆後）自動 resume scheduler。
  - `ADVANCE_NEXT` 移除外層重複 `setFlowStep('TAG_PLAYER_1')`，避免與 `forceAdvanceNode()` 雙重寫 transition log。

### Validation
- 1) reply preview：只要 target 仍在 `state.messages` 即可正常顯示，不再誤顯示「原始訊息已不存在」：PASS
- 2) WAIT_REPLY 期間 scheduler 不再持續 `scheduleNext()`：PASS
- 3) flow transition log 不再出現 `ADVANCE_NEXT -> TAG_PLAYER_1` 雙寫：PASS
- 4) classic mode 行為未修改：PASS

## 2026-03-06

- 修改 Step：`PREJOIN`、`PREHEAT`。

### Scope / Isolation

### Changed

### SSOT / Debug
- SSOT：chat 節奏來源由 engine 分散判斷整併為 director。

### Scope / Isolation

### Changed

### Acceptance
- 1) 前 30 秒只預熱不出題：PASS
- 2) 30 秒到點才出第一題：PASS
- 3) 問玩家後聊天室 freeze 0 output：PASS
- 4) 玩家回覆後先 glitch 10 則再 reveal：PASS
- 5) 語料不再輸出「回頭/轉頭」：PASS
- 6) 連跑 3 題第 2 題後不卡住且每題都 reveal：PASS

### Scope / Isolation

### Changed
- [debug] 新增 debug 欄位顯示：`flow.*`、`answerGate.*`。

### SSOT / Debug 記錄

### Acceptance
- 2) 30 秒後才出題：PASS
- 3) 玩家不回覆會停聊 + SAN 上升：PASS
- 4) 玩家回覆後固定 glitch->reveal->riot->VIP->guess->tag->next：PASS
- 5) 連跑多題皆可 reveal，不再卡第 2 題：PASS

### Scope / Isolation

### Changed

### SSOT / Debug 記錄
- Debug 欄位無新增；系統狀態變更為「Thai viewer message 保留 `thai/translation` 結構欄位供 UI/debug 使用」。

### Acceptance
- 1) 10 pools 長度與 total=2050：PASS（`assertChatPoolsCounts()`）
- 3) meaning guess/reveal 時 `theory_pool` 出現率上升（非 0）：PASS
- 4) 後段/高壓才明顯出現 `final_fear`：PASS
- 5) classic mode sources 未修改：PASS

### Scope / Isolation

### Changed

### SSOT / Debug 欄位變更
- Debug 新增/調整：

### Removed / Deprecated

### Acceptance
- 1) intro 30 秒內不出題：PASS
- 2) 每輪固定經過 reasoning + tag：PASS
- 3) 未命中分類會先跳題後回補直到命中：PASS
- 4) tag timeout/recovery 固定文案：PASS

### Changed
  - `introGate.startedAt/minDurationMs/passed`
  - `flow.step/stepEnteredAt/questionIndex`
  - `freeze.frozen/reason/frozenAt`
  - `glitchBurst.pending/remaining`
  - `tagAskedThisStep/askedAt`
  - `lastEmitKey/lastSpeaker`
  - `recentEmitKeys`（ring buffer 20）
  - `transitions`（ring buffer 20）
  - `thaiViewer.lastUsedField/count`
  - `duplicateSpamCount`：同 key 連續 emit > 2
  - `speakerSpamCount`：同 speaker 連續 emit > 3
  - `freezeLeakCount`：`WAIT_PLAYER_*` + freeze 期間仍發生 emit

### Scope
- classic mode 無修改。

### Changed

### SSOT
- [x] SSOT changed

### Acceptance
- 1) 語料池數量符合目標（總量 2050）：PASS
- 2) `thai_viewer_pool` user 來源符合指定名單：PASS
- 3) classic mode 無檔案變更：PASS

### Changed

### SSOT

### Debug 欄位變更紀錄
- 新增：
  - `classic.judge.result`

### Acceptance
- 1) 題目=ร，輸入=บ => wrong：PASS
- 2) unknown（不知道）=> classic 同款提示且留在同題：PASS
- 3) correct => 與 classic 同步流程（reveal/節奏）：PASS
- 4) 未按 debug 按鈕不會出現 `debug_apply_correct`：PASS
- 6) classic mode 行為不變：PASS

### Changed

### Acceptance
- 1) 輸入 `pass` 立即下一題：PASS
- 2) UI 子音與 hint 子音一致：PASS
- 3) unknown 只顯示提示不跳題：PASS
- 4) classic mode 不受影響：PASS

### Changed

### SSOT
- [x] SSOT changed

### Debug 欄位變更紀錄
- 新增：

### Acceptance
| Item | Result |
|---|---|
| 1) 任意一題送出一次答案，不會要求第二次、不會舊題閃回 | PASS |
| 2) correct：題目只切一次；單字 4 秒淡出可繼續跑 | PASS |
| 3) unknown：顯示提示且不跳題；提示與 classic 一致 | PASS |
| 4) PASS：只跳一次題 | PASS |
| 5) classic mode 不受影響 | PASS |

### Changed

### Acceptance
- 1) 任意亂打字不再「未判定就跳題」：PASS
- 2) 題目子音 = 單字內對應子音（同一 prompt）不錯位：PASS
- 3) 單字置中放大、4 秒慢慢消失：PASS
- 4) Classic mode 不受影響：PASS

### Changed

### Acceptance
- 1) tag 後回覆「穩住」：reply bar 立刻消失、freeze 解除：PASS
- 2) tag 後回覆「衝」：reply bar 立刻消失、freeze 解除：PASS
- 3) tag 後回覆「不知道」：reply bar 立刻消失、freeze 解除、進提示流程：PASS
- 4) debug 欄位 `qna.awaitingReply true->false`、`ui.replyBarVisible true->false` 可觀測：PASS
- 5) classic mode 不受影響：PASS

### Changed

### Acceptance
- 1) tag 後回覆「穩住」：reply bar 立刻消失、freeze 解除：PASS
- 2) tag 後回覆「衝」：reply bar 立刻消失、freeze 解除：PASS
- 3) tag 後回覆「不知道」：reply bar 立刻消失、freeze 解除、流程繼續：PASS
- 4) debug 欄位 `qna.awaitingReply true->false`、`ui.replyBarVisible true->false` 可觀測：PASS
- 5) classic mode 不受影響：PASS

### Changed

### Docs

### Changed

### Docs
- README 新增 PromptCoordinator、writer guard 與一致性 debug 欄位說明。
- PR_NOTES 新增 root-cause 排查與本次驗收 PASS/FAIL。

### Changed
- [debug] 補齊欄位：`scheduler.phase`、`consonant.prompt.current`、`consonant.judge.lastInput/lastResult`、`word.reveal.phase/wordKey`、`lastWave.count/kind`、`blockedReason`。

### Docs
- PR_NOTES 更新本次 PASS/FAIL。

### Changed
- [ui/overlay] `WordRevealOverlay` 改為「左側 baseConsonant + 右側逐字補齊」並支援霧化散去動畫。
- [audio] 發音播放固定使用 `/assets/phonetics/${audioKey}.mp3`，缺檔不拋錯。
- [debug] 新增可觀測欄位：`word.reveal.phase`、`word.reveal.wordKey`、`audio.pronounce.lastKey/state`、`scheduler.phase`、`lastWave.count/kind`、`blockedReason`；Tester 新增 ForceRevealWord / ForcePlayPronounce / ForceWave(kind)。

### Docs
- README 新增 Word Reveal Pipeline 與 phonetics 路徑/命名規範。
- PR_NOTES 更新驗收 PASS/FAIL 表格。

## 2026-03-04（debug gate ssot + mode switch debug_disabled fix）

### Changed
- [debug/ssot] 新增 `src/debug/debugGate.ts` 作為共用 debug gate SSOT，統一 `isDebugEnabled()` 判定（query/hash/session/window flag）。
- [debug/overlay] App debug overlay 開啟時會同步設定 shared debug enabled 狀態；因此只要 overlay 可見，mode switch guard 會視為 debug enabled，不再誤回 `debug_disabled`。
- [debug/safety] 啟動時從 storage 覆寫 mode 仍受 `isDebugEnabled()` gate 控制，非 debug 不受 localStorage 影響。

### Docs
- README 補充 Debug Gate SSOT 與「overlay 可見即 debug enabled」規則。
- PR_NOTES 補充本次 root cause、驗收與 rollback。

## 2026-03-04（debug mode switcher no-response fix）

### Changed
- [debug/ui] `DebugModeSwitcher` 新增 `Mode Switch Debug` 狀態區塊，點擊後立即回寫 `lastModeSwitch.clickAt/requestedMode/persistedMode/action/result/reason`，不再只靠 console 判斷。
- [debug/ssot] Mode 切換沿用既有 SSOT（`mode` query + `localStorage['app.currentMode']`）；切換時會回讀 query/storage/store 並顯示在 `persistedMode`，可直接確認是否真的寫入。
- [debug/bootstrap] 切換成功時固定走 debug-only `reload` 生效，並在 UI 顯示 `Switching…` 與 `action=reload`。
- [debug/guard] 新增阻擋/錯誤可視化（例如 `debug_disabled` / `already_current_mode` / `invalid_mode` / 例外訊息），避免按鈕看起來「無反應」。
- [classic] 無事件/流程/遊戲邏輯變更。

### Docs
- README 補充 Debug 模式切換排障（優先看 `lastModeSwitch.result/reason`）。
- PR_NOTES 新增本次驗收流程與 rollback（移除 mode switcher 或關閉 debug override）。

### Changed
- [debug/ssot] Mode 切換不新增第二套狀態：沿用既有 `mode` query param，切換時同步寫入 `localStorage['app.currentMode']` 供 debug session 持久化。
- [debug-only] 啟動時僅在 `debug=1` 允許從 `localStorage['app.currentMode']` 覆寫 mode；非 debug 維持既有 mode 決策行為。
- [classic] 無 runtime/event/chat/audio 邏輯變更。

### Docs
- README 新增 Debug Mode Switcher 使用方式（位置、按鈕、reload、生效條件）。
- PR_NOTES 記錄驗收步驟、風險與回退。

### Changed
- [classic] 無邏輯變更（classic mode 0 變動）。

### Docs
- README、PR_NOTES 同步 Fear Meter Monitor 規格、顯示條件與驗收結果。

## 2026-03-04（debug panel mode-aware tools）

### Changed
- [debug] 新增 `getActiveMode()` 顯示/判定（優先序：`debug.modeOverride` → `urlMode` → `defaultMode`）。

### Docs
- README、PR_NOTES 同步本次 mode-aware debug 行為。

### Changed

### Docs

### Changed

### Docs

# 10｜Change Log（變更紀錄規範）

## 這份文件在管什麼

記錄維護手冊層級的重要變更，特別是會影響既有流程、驗收方式、或團隊認知的調整。

## 分類規則

- **Breaking**：會影響既有實作或驗收腳本，需要團隊同步調整。
- **Changed**：既有行為調整，但不一定破壞介面。
- **Docs**：文件結構或規範更新。

## 目前已知關鍵變更

### Breaking

- 移除 `loop4` 作為循環/排程成員，主循環改為 loop3、插播僅 loop 與 loop2。
- Ghost 流程改為事件化，禁止分散在多處硬觸發。

### Changed

- 事件流程明確規範為 **pre-effect → starter tag**。
- fan_loop 採 WebAudio 排程作為主路徑，降低循環接縫。
- README 由「現況長文」改為「維護手冊入口索引」，規格改由 `/docs` 維護。

## 未來新增條目格式（請照抄）

```md
## YYYY-MM-DD

### Breaking
- [系統] 變更摘要（影響範圍）
- 驗收：要看哪些 debug 欄位 / 測試
- 影響文件：docs/xx-xxx.md

### Changed
- [系統] 行為調整摘要
- 驗收：...
- 影響文件：...

### Docs
- 更新了哪些頁面與原因
```

## 維護規則

- 每次 PR 若有流程級變更，必須更新本頁。
- 變更內容需能追溯到對應 SSOT 檔案與 docs 分頁。

## 2026-03-03（mention autoscroll + jump hint）

### Changed
- [chat/ui] 新增 mention autoscroll：新進訊息若 `mentions` 命中 activeUser 且作者非自己，會觸發自動滾動判斷。
- [chat/ui] 採策略 B（near-bottom threshold=100px）：接近底部時自動滾到底；不在底部時不強制跳轉，改為高亮「@你・跳到最新」。
- [mobile/scroll] 置底改為雙階段排程（`requestAnimationFrame` + `setTimeout(0)`）提升 Android Chrome 穩定性，降低 layout 變動造成漏滾。
- [debug] 新增 mention autoscroll 觀測：`[MENTION_AUTOSCROLL]`、`[AUTOSCROLL_SKIPPED]`，以及 debug URL `forceMentionAutoscroll=1` 與 `Inject NPC Tag @You` 按鈕。

### Docs
- README 新增 mention autoscroll 行為規格、策略選擇與 debug 驗證步驟。
- PR_NOTES 記錄策略 B、驗收案例與 debug 欄位變更。

## 2026-03-02

### Changed
- [chat/events/ghost/scroll] 將 tagged question 的 freeze 改為硬暫停模型：freeze 期間阻擋 NPC 訊息、event 自動訊息、ghost/sfx 觸發與聊天室自動滾動；玩家成功送出回覆後才統一解凍。
- [qna] tagged question 送出後流程改為「先讓聊天室滾到底顯示被 tag 訊息，再於下一個 render tick 啟用 freeze」，避免先 freeze 導致目標訊息未出現在視窗內。
- [ui] pinned reply 維持 input 上方 overlay，不寫入 messages[]，確保視覺順序為「聊天室最後一則 tagged 訊息在上、pinned reply 在下」。
- [debug] 新增 freeze 與阻擋計數觀測欄位：`freeze.isFrozen`、`freeze.reason`、`freeze.startedAt`、`npcSpawnBlockedByFreeze`、`ghostBlockedByFreeze`。

### Docs
- README 新增本次 freeze 強化規格與驗收重點。
- PR_NOTES 更新本次變更範圍、debug 欄位與驗收結果。

## 2026-03-02（scroll-before-pause 修正）

### Changed
- [qna/chat] 新增 `scrollThenPauseForTaggedQuestion` 單一入口：在 `questionMessageId` 寫入並顯示 ReplyPin 後，先等待 message render、再 double-force 置底、最後才進入 pause/freeze。
- [ui/debug] 新增可觀測欄位：`chat.scroll.lastForceToBottomReason`、`chat.scroll.lastForceToBottomAt`、`chat.scroll.scrollTop/scrollHeight/clientHeight`、`ui.qnaQuestionMessageIdRendered`、`ui.replyPinMounted`、`chat.pause.isPaused`。
- [chat] pause 規則調整為「只阻擋 spawn，不阻擋 scrollThenPause 內的置底流程」。

### Removed
- 移除 tagged question 的 countdown-then-freeze 舊流程（`COUNTDOWN` 轉 `FROZEN`）；改為成功出題後立即執行「先置底再 pause」。

## 2026-03-02（distance-approach + blackout-flicker）

### Changed
- [audio/events] `footsteps`、`ghost_female` 事件音效改為 WebAudio 距離接近模型（gain/lowpass/pan/playbackRate 自動化 + ±15% 時長隨機）。
- [player/ui] 新增 blackout overlay 效果：事件音效成功觸發後延遲 1 秒啟動，`full`/`dim75` 隨機模式、持續 12 秒 flicker，並在第 4 秒短暫亮起一次後回到黑幕。
- [pause/freeze] pause/freeze 提升為更高優先序：`chat.pause.isPaused=true` 時禁止新 SFX/blackout，且 pause 進入時會立刻停止進行中的 blackout。
- [debug] 新增可觀測欄位：`audio.lastApproach.*`、`fx.blackout.isActive/mode/endsInMs`。

### Removed
- [audio] 移除 `SceneView` 內 `footsteps` / `ghost_female` 的 `<audio>` one-shot 舊播放路徑，避免與新 WebAudio 距離模型並存造成雙聲。

### Docs
- README 補充事件驅動「由遠到近」音效與 blackout flicker 行為、debug 觀測方式。
- PR_NOTES 更新 audio/player/events/debug/docs 影響範圍與驗收結果。

## 2026-03-02（event prepare/commit/effects transaction）

### Changed
- [events] 事件流程改為 `Prepare → Commit → Effects` 三段式：只有 commit 成功才允許播放 SFX/切影片/blackout，且 commit 成功必定立即進入 effects（同 call chain，避免 silent）。
- [events/audio/player] 新增事件效果 registry SSOT：`src/events/eventEffectsRegistry.ts`，集中管理 `VOICE_CONFIRM/GHOST_PING/TV_EVENT/NAME_CALL/VIEWER_SPIKE/LIGHT_GLITCH/FEAR_CHALLENGE` 的 SFX/Video/Blackout 映射。
- [tv_event] `TV_EVENT` 明確映射 `loop4`，commit 時加入 `video_src_empty/video_not_ready` gate，阻擋時寫入 debug blockedReason。
- [pause/freeze] tagged question 流程順序調整為「事件 effects 先執行，再 scrollToBottom + pause」，避免出現「有 tag 但效果沒播」。
- [debug] 新增事件交易觀測欄位：`lastEvent.questionMessageId`、`lastEvent.commitBlockedReason`、`lastEventCommitBlockedReason`、`lastEffects.sfxPlayed[]`、`lastEffects.videoSwitchedTo`、`lastEffects.blackoutStartedAt/mode`。

### Docs
- README 補充事件交易化流程、registry SSOT 與新 debug 欄位。
- PR_NOTES 更新本次 events/audio/player/debug/docs 影響範圍與驗收。

## 2026-03-02（debug force execute events）

### Changed
- [events/debug] 新增公開 debug 入口 `debugForceExecuteEvent(eventKey, options)`；強制事件仍走 `Prepare → Commit → Effects` 全流程，不直接呼叫私有 effect。
- [events] commit gate 新增 force 選項判斷：`ignorePause`、`ignoreCooldown`、`skipTagRequirement`，並回填 `paused/cooldown/no_tag` blocked reason。
- [qna/pause] force + `ignorePause=true` 時會跳過 `scrollThenPauseForTaggedQuestion`，避免 forced QNA 造成 freeze 卡住。
- [debug ui] Debug Panel Events 清單新增每個事件的 `Force` 按鈕與 override 勾選（Ignore Cooldown / Ignore Pause / Skip Tag Requirement）。
- [debug] 新增觀測欄位：`event.debug.lastForcedEventKey`、`event.debug.lastForcedAt`、`event.debug.lastForcedOptions`、`event.debug.forcedEventCount`、`event.lastCommitBlockedReason`，並在 `lastEvent` 顯示 `forcedByDebug/forceOptions`。

### Docs
- README Debug 區段補充 Force Execute 使用規則與「僅限開發使用」警示。
- PR_NOTES 同步更新影響範圍、SSOT、debug 欄位與驗收結果。

## 2026-03-02（SFX tracing + debug test panel）

### Changed
- [audio/debug] Debug overlay 新增 `SFX Tests`：可直接測 `footsteps` / `ghost_female`、Stop all、Ignore pause/cooldown、Master volume slider。
- [audio] SFX 播放改為可觀測 `PlayResult`，每次播放都回傳成功/失敗與 reason，避免 silent fail。
- [audio] 在播放管線增加逐段 trace：`play_called`、`asset_loaded`、`paused_gate`、`cooldown_gate`、`audio_locked`、`node_chain_ready`、`play_started`、`ended`、`error`。
- [audio] 距離接近參數加安全下限：`startGain >= 0.05`、`endGain <= 0.9`、`LPF cutoff >= 200Hz`、`playbackRate 0.95~1.08`。
- [events/debug] 事件效果新增 plan/applied 追蹤：`event.lastEvent.effects.plan` 與 `event.lastEvent.effects.applied`，可定位「事件成立但效果沒播」的落點。

### Docs
- README 補充 Debug SFX Tests 操作與 PlayResult/trace 欄位說明。
- PR_NOTES 同步新增本次 SFX root-cause 排查與修正摘要。

## 2026-03-02（question_send_failed 卡死根治）

### Changed
- [events] 修正 cooldown/lock commit 時機：只有事件確實開始才 commit；`question_send_failed`（未送出 starter tag / 未觸發 pre-effect）會 rollback cooldown，避免 `cooldown_blocked` 假鎖死。
- [freeze/qna] tagged question freeze 增加 guard：必須同時 `questionHasTagToActiveUser=true` 與 `ui.replyBarVisible=true` 才允許進入 hard freeze；不成立時即刻 release。
- [watchdog] 新增 freeze watchdog：`isFrozen && freezeCountdownRemaining<=0` 時自動解凍、`chat.pause=false`、scroll mode 回 FOLLOW。
- [debug] 新增一鍵救援按鈕 `Reset Stuck State`，可同步 reset freeze/pause/qna/event queue/cooldown。
- [debug fields] 新增 `event.cooldownMeta[eventKey].nextAllowedAt/lastCommittedAt/lastRollbackAt` 與 `event.freezeGuard(hasRealTag/replyUIReady/freezeAllowed)`。

### Docs
- README 新增「卡死時如何復原」與「事件 cooldown/lock commit 規則」。
- PR_NOTES 補充風險、重現步驟與 web/local 驗證腳本。

## 2026-03-02（event registry ssot + audio reference audit）

### Changed
- [events/ssot] `src/events/eventEffectsRegistry.ts` 改為由 `src/core/events/eventRegistry.ts` 推導事件效果，移除雙配置漂移風險。
- [events/debug] 啟動時新增 `[EVENT_REGISTRY]` console snapshot：`count/eventIds/hasGhostFemale/hasFootsteps`。
- [audio/debug] Scene debug overlay 新增「資源對照檢查」：`audio.loadedKeys`、`event.referencedAudioKeys`、`event.missingAudioRefs`、`audio.context.state(distance)`。
- [debug ui] 新增 `Test Ghost SFX` / `Test Footsteps SFX`，輸出 `[EVENT_TRIGGERED]` / `[EVENT_SKIPPED] reason=lock/cd/missing_asset`。

### Docs
- README 新增本次 registry 與資源對照檢查說明。
- PR_NOTES 更新全專案 key 盤點、SSOT 結論與驗證步驟。

## 2026-03-03（event audio stuck state-machine hardening）

### Changed
- [events/audio] 事件音效觸發升級為狀態機：`idle | playing | cooldown`，新增 `lastTriggeredAt`、`cooldownUntil`，並加入 playing timeout fallback，避免 `onended` 未觸發造成永久 stuck。
- [events/debug] Event Tester 每事件新增 `Trigger / Force Execute / Unlock`，並顯示 `state`、`cooldownRemaining`、`lastTriggeredAt`、`pre/post key`、`lastResult/reason`。
- [audio/debug] 新增一次性 `Enable Audio` 解鎖入口，debug 顯示 `audioContextState` 與最近一次解鎖結果。
- [events/log] 統一 console 格式：`[EVENT_TRIGGERED]`、`[EVENT_SKIPPED]`、`[EVENT_PLAY_FAIL]`、`[EVENT_STATE]`。

### Docs
- README 補充事件音效狀態機與 debug 操作（Trigger / Force Execute / Unlock / Enable Audio）。
- PR_NOTES 更新本次盤點、SSOT、debug 欄位變更與驗收步驟。

## 2026-03-03（activeUser mention bootstrap + row highlight）

### Changed
- [chat/bootstrap] Username Confirm 同一手勢完成 activeUser 註冊（`usersById` + `usersByHandle(lowercase)`），`bootstrap.isReady=true` 後立即可被 `@mention`，不再需要先發言。
- [chat/mention] 訊息進入 reducer 前統一解析 `mentions: string[]`（由 registry `usersByHandle` resolve userId）；highlight/判斷改讀 `message.mentions`，不再依賴純字串 `includes("@name")`。
- [ui/chat] 新增「tag 你」整列底色 highlight（含左側細線）；僅在 `mentions` 包含 `activeUserId` 且 `author != activeUser` 時啟用，system 訊息不套用。
- [qna/event] tagged-question 判斷改讀 `questionMessage.mentions`，與 pin/reply/freeze 流程保持一致，移除對「是否先發言」的隱性依賴。
- [debug] 新增 mention/bootstrap 驗證欄位：`activeUser.displayName`、`activeUser.registryHandleExists`、`mention.lastParsedMentions`、`mention.lastHighlightReason`、`mention.tagHighlightAppliedCount`。

### Docs
- README 補充「一開始就可被 tag + row 背景高亮」規格與 debug 驗證點。
- PR_NOTES 更新 root-cause、修正策略、驗收結果與 debug 欄位。

## 2026-03-03（tag start flow：append → scroll → pin → freeze）

### Changed
- [chat/tag-flow] 新增 `src/chat/tagFlow.ts`，將被 tag 起始流程固定為單一路徑：先 append 題目訊息、等待兩個 paint、強制置底、設定 pinned reply、最後 freeze。
- [chat/scroll/mobile] 新增 `src/chat/scrollController.ts`，`ChatPanel` 以單一 `chatScrollRef` 註冊容器，`forceScroll` 統一只操作聊天室容器（不使用 `window.scrollTo`），並做一次 rAF 二次置底。
- [qna] `sendQnaQuestion` 改走 `runTagStartFlow`，將「tag 訊息插入 + 置底 + 顯示 pinned + freeze」整合成同一條流程，避免先 pause 導致置底被 gate 擋掉。
- [debug] 補齊追蹤欄位：`chat.scroll.containerFound/lastForceReason/lastForceAt/lastForceResult/metrics`、`chat.pause.setAt/reason`、`ui.pinned.visible/textPreview`，並補 `[SCROLL] / [PIN] / [PAUSE]` 打點。

### Docs
- README 補充 Tag Start Flow 固定順序、debug 觀測項與 mobile 容器策略。
- PR_NOTES 更新本次影響範圍、驗收案例與 debug 欄位調整。

## 2026-03-03（classic mode architecture doc）

### Changed
- [docs] 新增 `docs/20-classic-mode-architecture.md`：以目前程式碼現況完整整理 classic mode 架構（入口、播放器、音效、聊天室、QNA、debug 契約、狀態機、資料流、擴充點與最小重構建議）。
- [docs] `README.md` 新增 Architecture Docs 區塊，加入 classic mode 架構文件索引連結。

### Docs
- PR_NOTES 更新為本次 docs-only 變更與驗收結果（播放器/音效/聊天室/手機/桌機/debug 全項 PASS，未改動邏輯）。

### Changed

### Docs
- PR_NOTES 同步更新本次變更與驗收結果。

### Changed

### Removed

### Changed

### Docs
- PR_NOTES 更新本次驗收項目（尺寸/脈衝/退場/首字上色/Classic isolation）與 debug 值範例。

### Changed

### Removed

### Changed

### Removed

### Docs
- README、PR_NOTES 同步本次 reveal 視覺規格、安全區與驗收表。

### Scope / Isolation

### Changed
  - `scheduler.blockedReason`

### Removed / Deprecated

### Acceptance
- 按一次 PASS：reveal 完成後會跳下一題（`prompt.current.id` 變更）：PASS。
- 真實答對：同樣會跳下一題：PASS。
- 被 gate 擋住時：debug 可見 `blockedReason`：PASS。
- Classic mode 不受影響：PASS。

### Scope / Isolation

### Changed

### Removed / Deprecated

### SSOT / Debug 記錄
- mismatch（UI consonant vs current prompt）時，流程阻擋並寫入 `advance.blockedReason=mismatch`。

### 驗收表
- 1) 玩家輸入「不知道」：出現提示，prompt 不變：PASS
- 2) 玩家亂打字（非正確、非不知道）：不換題：PASS
- 3) 玩家答對：顯示置中單字放大 4 秒淡出，結束後自動換題：PASS
- 4) 按 PASS：立即換題（不需答對）：PASS
- 5) Classic mode 不受影響：PASS

### Scope / Isolation

### Changed

### Removed
- 無。

### Acceptance
- `A` 可命中 parser 並走正確流程：PASS
- `idk` / `?` 會判定 unknown 並顯示提示：PASS
- 注音輸入（如 `ㄅㄆㄇˋ`）不會被清空，debug `input.norm` 保留：PASS
- classic mode 不受影響：PASS

### Added

### Changed

### Scope / Isolation

### Changed
  - `chat.lastEmit.source/sourceTag/sourceMode`

### Removed / Deprecated

### Changed

### SSOT
- [x] SSOT changed

### Debug 欄位變更紀錄
- 新增：

### Acceptance
- 2) 30 秒 PREHEAT 不出題：PASS
- 3) 問句一次制 + 等待期間 freeze：PASS
- 4) 玩家回覆後 glitch burst 10 則，再 reveal 與後續流程：PASS
- 5) 連跑至少 3 題，不再第 2 題卡住：PASS
- 6) classic mode 未修改：PASS

### Scope / Isolation

### Changed

### Debug 欄位變更紀錄
- 既有欄位沿用並可驗證本次行為：

### Acceptance
- 2) 0~30 秒不出題且不顯示子音 overlay：PASS
- 3) 30 秒到點才出第一題子音：PASS
- 4) classic mode 未修改：PASS

### Changed

### Root Cause（第2題卡死）

### Scope Guard

### Root Cause
- 舊流程把玩家身份建立綁在 `onPlayerMessage`（玩家第一則訊息）之後；導致「只提交名稱但未發言」時，聊天室找不到可提及的玩家 handle，`@玩家` 不會穩定出現。

### Changed
  1) `joinGate.satisfied=false` → 一律 0 output
  2) reply-to active → 一律 0 output
  3) 其餘才允許（freeze/glitch 規則照舊）

### Scope Guard

### Changed
- [classic] 未修改。

### Changed
- [classic] 未修改。

### Acceptance
- 1) Tag#1 WAIT 長時間不回覆，聊天室 0 output 且無 tech 字樣：PASS。
- 2) Tag#2 WAIT 長時間不回覆，聊天室 0 output 且無 tech 字樣：PASS。
- 3) Tag#3 WAIT 每 30 秒背景累積 2 則 tech backlog（不顯示）：PASS。
- 4) 回覆 Tag#3 後一次 flush（<=8，含「卡了 X 分鐘」）再推進：PASS。
- 5) 技術故障字樣只出現在 Tag#3 回覆後 flush 波次：PASS。
- 6) classic mode 未修改：PASS。

- 新增 WAIT_REPLY gate：僅 `correct/pass` 可離開 WAIT；`wrong/unknown` 保持等待，不再直接完成題目。
- 新增 mention 前綴容錯：parser normalize 先 strip leading mentions，避免 `@npc` 阻斷答案解析。
- classic mode 未修改。

- classic mode 未修改。

- 第一層回覆後改為「先 backlog flush，再補字」，確保玩家感知到因回覆觸發推進。
- 正式 tag emitter 統一為單一發問者，避免 VIP 與 mod 同步重複 tag。
- 導入 autoplay mock reply 驅動 WAIT_REPLY，夜晚可自動推進完整回合。
- 更新 Night1 題幹語義到「身份(1~4) / 動機(5~9) / 恐怖總結(10)」。

## 2026-03-09

- 建立 shared question bank：`src/shared/questionBank/night01QuestionBank.ts`，提供 NIGHT_01 正式 10 題（classic/sandbox 共用來源）。
- 新增 `src/ssot/sandbox_story/night1.ts` 與 `src/ssot/sandbox_story/types.ts`，建立 NIGHT_01 SSOT 與節點定義。
- 新增 `src/modes/sandbox_story/sandboxStoryMode.ts`、`src/modes/sandbox_story/classicConsonantAdapter.ts`，讓 sandbox mode 以乾淨 v2 runtime 最小可跑。
- 新增 `src/sandbox/chat/*` 與 `src/ui/overlays/SandboxWordRevealText.tsx`，補齊 sandbox 專用依賴，避免雙軌遺留。
- `src/data/night1_words.ts` 改為由 shared question bank 映射，移除舊錯誤 NIGHT1_WORDS 內容。

## 2026-03-09（sandbox v2 初始化失敗修正）

- 修正 sandbox v2 初始化時 `Cannot read properties of undefined (reading 'promptVsReveal')`：
  - 來源為 App 在 hydration/debug 期間直讀 `sandboxState.mismatch.promptVsReveal`。
- 新增 `createSandboxV2InitialState` 與 `ensureSandboxV2StateShape`，所有 `getState()` 回傳值都先補齊完整 v2 state shape，再提供給 UI/debug。
- sandbox debug snapshot 新增/固定輸出：`replyGate / lastReplyEval / techBacklog / theory / transitions`，且全部提供 fallback。
- 移除 debug panel 中舊命名 legacy 欄位（`mismatch.promptVsReveal`、`sandbox.prompt.overlay.*`、`sandbox.prompt.pinned.*`、`sandbox.prompt.mismatch`）避免殘留直讀鏈。
- 新增 regression guard script：`scripts/sandbox-v2-regression-guards.mjs`（檢查必要 shape、safe access、legacy 字串直讀移除）。

- [shared][consonant-engine] 抽出 `src/shared/consonant-engine`：集中 `questionBank + normalizeInput + parseConsonantAnswer + judgeConsonantAnswer`，judge 統一為 `correct/wrong_format/wrong_answer`，避免 classic/sandbox 各自維護 parser。
- [classic] `src/modes/classic/consonantJudge.ts` 改成 shared engine wrapper，classic 子音判定規則以 shared 為單一來源。
- [sandbox] `src/modes/sandbox_story/classicConsonantAdapter.ts` 透過 shared question bank 產生 prompt 並共用 parse/judge；sandbox 不再自行前置格式判斷。
- [sandbox] 新增 `src/modes/sandbox_story/sandboxConsonantWordMap.ts`，將 `questionId -> wordKey/thaiWord/translation/audioKey` 留在 sandbox scope，shared 題庫不含單字資料。
- [sandbox][gate fix] WAIT_REPLY_1 / WAIT_WARMUP_REPLY 進 gate 時會綁定 `replyGate.sourceMessageId`；缺值時由 lock/qna fallback repair 並回寫 `sandboxFlow.replySourceMessageId`。
- [sandbox][legacy gate] `answerGate` 維持 compatibility mirror，debug 新增 mirror consistency 指標，避免與 replyGate 矛盾。
- [Removed/Deprecated Log] deprecated `src/shared/questionBank/night01QuestionBank.ts` 舊的「題目+單字」混合資料責任，改為 compatibility re-export；sandbox 單字資料已拆到 sandbox scope。

## 2026-03-10 — Sandbox consonant judge audit (audit-only)

- 進行 sandbox `consonant_answer` 稽核，確認目前判題實際走 `classicConsonantAdapter -> classic/consonantJudge -> shared/consonant-engine`，並非獨立 sandbox parser。
- 新增 debug/audit 可觀測欄位（不改功能）：
  - `currentPrompt.answerSource/classicQuestionId/sharedFromClassic/acceptedAnswers/aliases`
  - `parse.raw/normalized/kind/ok/blockReason/allowedKinds/matchedAlias`
  - `judge.expectedConsonant/acceptedCandidates/compareInput/compareMode/resultReason`
- `lastReplyEval` 補寫 `audit` 快照，確保每次玩家輸入都留下判定紀錄。
- classic mode：無行為變更。

### Regression checklist (for fix phase)
- 泰文字輸入（應可正確命中）。
- 英文 romanization 輸入（應可正確命中）。
- 注音 alias 輸入（例如 `ㄖ`，應與 classic 一致）。
- sandbox 與 classic 同題一致判定。
- `wrong_format` 與 `wrong_answer` 不得混淆。
# 2026-03-10 (audit-only)

- [sandbox][audit-only] 完成「bopomofo alias / debug state / scheduler phase 不一致」全鏈路盤點，輸出 authoritative state、實際資料流、debug mapping 差異、legacy compatibility 角色分層與修補路線圖。詳見 `docs/sandbox-audit-bopomofo-debug-scheduler.md`。
- [sandbox][audit-only] 確認 `ㄖ` 可答對屬 shared consonant engine alias 展開（非 sandbox 本地補丁），`acceptedAnswers`（display）與 runtime accepted candidates（judge）不是同一來源。
- [sandbox][audit-only] 確認 `scheduler.phase` 在現行 sandbox flow 無 active writer，停留 `preheat` 屬 debug 誤導風險，主流程仍由 `flow.step` 驅動。
- 2026-03-10 sandbox_story integration fix: 建立 authoritative `consonantJudgeAudit` state（SSOT）取代 debug ref 混源；`consumePlayerReply` consonant gate 立即寫入 parse/judge/source/gate/timestamp。
- 2026-03-10 sandbox_story integration fix: debug panel 拆分 Display metadata 與 runtime accepted candidates；`displayAcceptedAnswers/displayAliases` 明確標示 presentation only。
- 2026-03-10 sandbox_story integration fix: `POST_REVEAL_CHAT -> ADVANCE_NEXT` 收斂為單一路徑，新增 `postRevealChatState`、`nextQuestionReady/nextQuestionEmitted/nextQuestionBlockedReason`，避免第一題後 ADVANCE_NEXT 無人消費或被殘留 gate 阻塞。
- 2026-03-10 sandbox_story integration fix: `scheduler.phase` 明確標示 non-authoritative debug 欄位，不參與正式 next-question emit 判斷。

## 2026-03-10 sandbox debug action authoritative repair

- [sandbox] 修補 `sandboxStoryMode` 中多個 noop debug/action API，改為實際更新 authoritative state（flow/questionIndex/replyGate/reveal/audio/wave/hint/debugOverride）。
- [sandbox] `PASS (advancePrompt)` 與 `Force Next Node` 改為單一路徑呼叫 `advancePrompt`，並在末節點時回報 `end_of_nodes` blocked reason。
- [sandbox] `ForceCorrect / ForceResolveQna / ClearReplyUi / ForceReveal / ForcePlayPronounce / ForceWave / Trigger Random Ghost` 全數補齊 click 結果追蹤紀錄。
- [debug] 新增 sandbox debug action audit 欄位（lastClickedAt/handlerInvoked/effectApplied/blockedReason/targetState/lastResult），避免「按了沒用但無原因」黑盒狀態。
- [classic] 無改動。

## 2026-03-10 sandbox reveal visible render fix

- [sandbox] `REVEAL_WORD` 改為 authoritative reveal pipeline：建立 `reveal.startedAt/finishedAt/rendered/blockedReason/text/base/rest`，並以 state 驅動是否可進入 `POST_REVEAL_CHAT`。
- [sandbox] 新增可視時長下限 `SANDBOX_REVEAL_VISIBLE_MIN_MS=2500`，避免 reveal 被瞬間覆蓋看不到。
- [sandbox] guard：`reveal_word_done` 只允許在 `reveal.phase=done` 且 `reveal.rendered=true`（或 `missing_word_text` 明確阻塞原因）時觸發。
- [sandbox][debug] 新增 reveal observability：`visible/wordKey/text/base/rest/startedAt/finishedAt/rendered/blockedReason`。
- [classic] 無變更。


## 2026-03-10 — sandbox normal-path prompt/reveal visibility convergence

- [sandbox][flow/ui] `WAIT_REPLY_1` normal path now commits authoritative prompt visibility sync (`currentPrompt`/overlay/renderSync) so prompt bubble + glyph show without force actions.
- [sandbox][reveal] `REVEAL_WORD` normal path now sets `visible/rendered/startedAt` at activation and blocks completion when reveal timing observability (`startedAt/finishedAt`) is missing.
- [sandbox][debug] reveal render callback now backfills `startedAt` when rendered evidence arrives; debug glyph source can explicitly report reply-gate authoritative sync.
- [guards] regression guards added for normal prompt activation visibility, normal reveal visibility initialization, and reveal done timing gate.
- 2026-03-10 sandbox_story integration fix: normal `REVEAL_WORD` 新增 `ensureRevealActivatedForNormalFlow()`，在 reveal 為 `idle/hidden/not-visible/not-rendered/blockedReason=hidden/wordKey缺失` 時用 SSOT payload 重建 reveal (`visible/rendered/text/wordKey/startedAt`)；`reveal_word_done` 改為必須 `phase=done + visible + rendered + startedAt/finishedAt`，避免 flow 已轉場但 reveal 層仍 hidden。
- 2026-03-10 sandbox_story integration fix: force-path reveal 對齊 normal flow（`forceRevealCurrent` 補齊 `wordKey/rendered/blockedReason`、`forceRevealDone` 保持 `visible=true` 直到 post-reveal 消費），移除 reveal lifecycle 的 stale/partial state。
## 2026-03-10 sandbox videoA/render recovery + night smoke authoritative consume

### Scope
- Sandbox mode only; classic mode unchanged.

### Root Cause
- `videoA element error` 只顯示 generic 字串，缺少 active slot / src / readyState / error code 與 swap outcome，導致 render 卡在 `scene_not_synced` 時無法判斷是 source 問題、swap 失敗或 slot 壞軌。
- render 可見性 override 僅依 `isAnswerablePromptStep || authoritativeQ2Advanced`，當 gate 已 authoritative armed 但 scene key 還沒收斂時，可能持續 hidden。
- Night Smoke Test auto-answer 雖走 submit path，但 smoke 判定未強制比對該次訊息 `messageId` 是否真的進入 consume/eval，仍可能出現 injected 與 consumed 混淆。

### This Change
- SceneView `VideoDebugState` 新增 authoritative 診斷欄位：
  - `slotSource(videoA/videoB)`
  - `slotReadyState(videoA/videoB)`
  - `slotErrorCode(videoA/videoB)`
  - `lastSwapResult(ok/from/to/activeSlot/reason/at)`
- `videoA/videoB onError` 與 switch success/failure 都落 `lastSwapResult` + slot 診斷；fallback 回到 main loop 失敗也寫明 `fallback_switch_rejected`。
- debug overlay 新增顯示 `slotSource/slotReadyState/slotErrorCode/activeVideoSlot/lastSwapResult`。
- App render sync 新增 `gateAuthoritativeReady`（replyGate consonant_answer+armed+canReply）；scene 未同步但 gate 已 ready 時仍可強制 prompt 可見並標記 `scene_not_synced_warning`，避免 state/render 永久失聯。
- `submitChat` 現在回傳 authoritative `messageId`；Night Smoke Test 會拿 `answerMessageId` 驗證：
  - consume wait 條件必須同時滿足 authoritative consume signal + `lastReplyEval.messageId === answerMessageId`（或 audit 已 consumed）
  - parse/judge 後再次驗證 `lastReplyEval` consumed 與 messageId 對齊
- judge audit 寫入路徑維持 SSOT `setConsonantJudgeAudit`，欄位完整覆蓋 parse/judge/source/gate/consumedAt。

### Regression Guards
- 更新 regression guard：
  - render recovery 必須包含 `gateAuthoritativeReady` 與 extended `forceVisiblePrompt`。
  - smoke test 必須驗證 `st.lastReplyEval?.messageId === answerMessageId`。


## 2026-03-11 sandbox reveal cleanup + render recovery + smoke/judge persistence

- [sandbox][A] REVEAL_WORD 與 reveal done 期間強制清 prompt glyph：bubble hidden、glyph blink class 移除、debug source 改標 `reveal_prompt_cleanup`。
- [sandbox][B] reveal lifecycle 新增 `cleanupAt`；`markRevealDone` 改為保留既有 `finishedAt/doneAt`，避免每 tick 重寫造成不實時間。
- [sandbox][C] videoA/videoB onError 不再直接 `assets.videoOk=false`（避免永久 error overlay）；保留 slot/source/error/swap 診斷，讓 scene/render mismatch 可恢復。
- [sandbox][D] submit 成功後 `lastReplyEval` 保留同一 `playerMessage.id`，Night Smoke Test consume 對帳不再被覆寫成 injected 假失敗。
- [sandbox][E] judge audit 寫入路徑維持 consume authoritative，並加 regression guard 防止欄位回退。


## 2026-03-11 sandbox authoritative flow unstick fix

- [sandbox][reveal-guard] 修正 `REVEAL_WORD` 完成 guard：改以 `phase=done + rendered + timing` 判定完成，`visible=false` 僅視為 cleanup/visibility state，不再阻擋 `POST_REVEAL_CHAT`。
- [sandbox][cleanup-decouple] reveal cleanup 與 flow guard 解耦；`reveal_guard_blocked:hidden` 改為 `cleanup_hidden` 可觀測訊號，不作為 done reveal 的硬阻擋條件。
- [sandbox][scene-canonicalization] 新增 scene key canonicalization，`loop3` 與 `oldhouse_room_loop3` 會被視為同場景。
- [sandbox][render-warning-only] `scene_not_synced` 降級為 `scene_not_synced_warning`，不再阻擋 prompt 顯示與 nextQuestion emit。
- [sandbox][render-fallback] `renderedQuestionId` 策略改為 bounded fallback，避免背景 scene warning 導致題目長期為空。
- [sandbox][debug-reconciliation] `Pass Flow / Force Correct Now / Force Next Question` 補齊 authoritative reconciliation（flow step、reply gate、nextQuestion stage/source、prompt/render sync）。
- [sandbox][observability] debug 新增：`reveal.completionReady`、`reveal.visibilityOnly`、`reveal.blockedReason.source`、`scene.expectedRaw/currentRaw/expectedCanonical/currentCanonical`、`renderSync.reason`。
- [sandbox][regression-guards] 更新 `scripts/sandbox-v2-regression-guards.mjs`，加入 reveal completion/scene canonicalization/scene warning downgrade/debug reconciliation 檢查。
# 2026-03-11（post-reveal completion stuck hotfix）

- Root cause：`REVEAL_WORD -> POST_REVEAL_CHAT` transition commit 已成功（含 audit/reveal commit observability），但 post-reveal completion path 未啟動，導致 `postReveal.guardReady=true` 與 `postRevealChat.status=idle` 長期並存，`ADVANCE_NEXT` guard 永遠不放行。
- 修正 `POST_REVEAL_CHAT` authoritative runner：
  - 進入 step 後即寫入 `postReveal.startAttempted=true` 與 `postReveal.startedAt`。
  - 若 reveal readiness 未滿足，寫入 `postReveal.completionBlockedBy`（例如 `reveal_not_finished_or_not_rendered`）。
  - 若無 reply gate 阻擋，於 bounded time（`SANDBOX_POST_REVEAL_AUTO_COMPLETE_MS=900`）自動完成，落盤 `postReveal.completedAt`、`postReveal.completionReason=auto_complete_bounded`，再轉 `ADVANCE_NEXT`。
- SSOT/guard 對齊：`advanceNext.guardReady` 改為依 post-reveal authoritative completion（`postRevealChatState=done && completionBlockedBy=''`）判定。
- Debug observability 補強：新增 `postReveal.startAttempted/startedAt/completedAt/completionReason/completionBlockedBy`，保留 `postReveal.enteredAt`、`advanceNext.enteredAt`。
- Regression guards：新增檢查 bounded auto-complete 常數、completion reason、blocked-by observability 與 sandbox mode state 欄位存在，避免 regress 成 idle 卡死。


## 2026-03-11 sandbox integration MVP (post-reveal SSOT unification)

- Added authoritative helper `derivePostRevealRuntimeStatus` in `App.tsx` and reused it in:
  - POST_REVEAL_CHAT runner effect
  - sandbox debug projection/panel fields
  - Night Smoke Test authoritative failure mapping
- POST_REVEAL_CHAT no longer stalls at entered-only: startAttempted/startedAt are committed via bounded start path once `startEligible=true`.
- Started post-reveal now bounded auto-completes with explicit `postRevealCompletionReason='auto_complete_bounded'`, then transitions to `ADVANCE_NEXT`.
- Smoke labels now output `smokeStep + authoritativeFlowStep + authoritativeBlockedReason(source)` and align failedStep with authoritative flow.
- Regression guards expanded for post-reveal start/complete/advance and second-question progression invariants.


## 2026-03-11 sandbox NIGHT_01 integrated flow repair (unified TAG_PLAYER_x + atomic ADVANCE_NEXT)

- Removed per-question special steps `TAG_PLAYER_2_PRONOUNCE` and `TAG_PLAYER_3_MEANING`; NIGHT_01 now uses generic `TAG_PLAYER_x` for all questions.
- Reworked `ADVANCE_NEXT` to use atomic `advancePromptAtomically()` ownership path so `questionIndex/currentPrompt/nextQuestion/flow.step` update in one transaction.
- Enforced reply-gate semantics: `WAIT_REPLY_x` is still the only step that re-arms `replyGate`.
- Added regression guards to lock `WAIT_REPLY_x -> ANSWER_EVAL`, questionId-bound reveal/postReveal evidence, and same-question chain checks before emit.
- Scope verified as sandbox-only (no classic mode file touched).

## 2026-03-11 sandbox NIGHT pool SSOT + per-night shuffle cursor authority

- [sandbox][ssot] 新增 `src/ssot/sandbox_story/nightQuestionPools.ts`，建立 NIGHT_01/02/03 固定題池（各 10 題），每題含 `expectedConsonant/revealWord/acceptedCandidates`。
- [sandbox][flow] `sandboxStoryMode` 新增 `round.*` authoritative fields：`nightId/questionOrder/currentQuestionCursor/currentQuestionId/remainingQuestionCount/authoritativeQuestionSource`。
- [sandbox][advance] `advancePrompt/advancePromptAtomically/forceAdvanceNode/getCurrentNode` 全數改為 pool+cursor 驅動；終止條件改為 `end_of_question_pool`（不再只看 `end_of_nodes`）。
- [sandbox][judge/reveal/debug] `currentPrompt` 補齊 `expectedConsonant/acceptedCandidates/revealWord`；debug panel 顯示 round + authoritative source。
- [guard] 新增 `scripts/regression-sandbox-night-pool-ssot.mjs` regression guard。
- [compat] classic mode 行為不變，僅擴充 shared question bank alias coverage 以支援 sandbox NIGHT2/3 作答解析。

## 2026-03-12 Sandbox Night Pool Authority + 29-Consonant SSOT

- 新增 authoritative 29 子音 SSOT：`AUTHORITATIVE_CONSONANT_BANK`（包含 `consonant / revealWord / acceptedCandidates / imageMemoryHint`），並由此衍生 sandbox NIGHT 題池。  
- Sandbox 題源改為每夜固定 pool，進夜時以 `round.questionOrder` shuffle，推進 authority 仍由 `round.questionOrder/currentQuestionCursor/currentQuestionId` 決定，不再使用 `end_of_nodes`。  
- Sandbox 子音判定持續沿用 classic pipeline：`parseAndJudgeUsingClassic` + alias resolution + acceptedCandidates。  
- HELP REQUEST（不知道/不會/help/hint/...）在 sandbox consonant gate 不判錯不跳題；改由 viewer 以 image memory 提示，並留下 `help_requested` 判定紀錄。  
- debug observability 擴充：hint `requested/source/emitter/generatedText`。
