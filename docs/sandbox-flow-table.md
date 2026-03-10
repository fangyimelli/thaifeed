| `secondQuestionShown` 判定 | `emit + prompt` 可能過早視為顯示成功 | `emit + prompt + renderSync.renderedQuestionId` 三者一致才為 true | 避免 `WAIT_REPLY_2` 已到但畫面仍停第一題。 |
| state -> render commit 可觀測性 | 缺少 state/render 分離欄位 | 新增 `render.stateQuestionId/renderedQuestionId/renderBlockedReason` 與 `expectedSceneKey/videoCurrentKey` | 不一致時可直接看出阻塞原因，不再誤判已修復。 |
- Full Night Test 第二題成功採 authoritative 多條件：`flow.step>=WAIT_REPLY_2` 或 `currentPrompt.questionId==secondQuestionId` 或 `replyGate(consonant_answer+armed)` 或 `nextQuestion.emitted+toQuestionId==secondQuestionId`。
- `render.stateQuestionId != renderedQuestionId` 不再直接導致失敗；若 authoritative 已成功則標為 render warning。

| 第二題 emit 後 scene/video 同步 | 只切 `currentPrompt`，視覺層可能沿用舊 cache | `ADVANCE_NEXT`/`Force Next` emit 時強制 `REQUEST_VIDEO_SWITCH(resolveSandboxSceneKeyByQuestionIndex)` | 防止 prompt 已切但 scene/video 仍是第一題舊畫面。 |

| `ADVANCE_NEXT` post-reveal completion source | `postRevealChatState === 'done'` 單值判斷，與 transitions/backlog 可能分裂 | `hasPostRevealCompletionEvidence`：`postRevealChatState==='done'` **或** (`backlogTechMessages.length===0` 且 transitions 含 `post_reveal_chat_done`) | 已進 `ADVANCE_NEXT` 且 postReveal idle 時，不可再誤判 `post_reveal_chat_not_done`。 |
| `ADVANCE_NEXT` second-question shown 判定 | 可能只 emit `nextQuestion*`，未保證 prompt 切換 | emit 後同步 `setCurrentPrompt(nextQuestion)` + flow step 跳轉（Q1→`TAG_PLAYER_2_PRONOUNCE`） | 避免正式已切題但 UI/影片仍停留前一題來源。 |
| `Run Full Night Test` `secondQuestionShown` source | 只看 `nextQuestionEmitted/toQuestionId` | `nextQuestionEmitted` + `nextQuestionToQuestionId` + `prompt.current.wordKey` 對齊 | 避免 authoritative emit 成功但 visual/stale state 誤判 failed。 |

| `Run Full Night Test` second question assert | `flow.questionIndex >= 1 && nextQuestionEmitted && toQuestionId` | `nextQuestionEmitted && toQuestionId`（authoritative） | `questionIndex` 可能暫時未收斂，曾造成 emitted=true 仍誤判失敗。 |
| `Run Full Night Test` auto-answer consume/judge convergence | autoAnswer 送出後直接等 reveal/post-reveal | 先等 authoritative consume（離開 `WAIT_REPLY_1` 或 gateConsumed）+ parse/judge 完整（`parse.raw`、`parse.kind!=not_evaluated`、`parse.ok=true`）再進 reveal 檢查 | 避免只顯示答案未正式提交/consume 就誤判後段失敗。 |
| `Run Full Night Test` fail write timing | timeout 立即寫 `failedStep=second_question` | fail 前二次收斂 authoritative emit；若已 emit 直接 pass | 避免 stale timeout 與正式 emit 競態。 |
| wait-reply gateType source (judge path) | 優先沿用 derived/stale gateType | wait-reply 一律以 `flow.step` 派生 expected gateType | 防止 `WAIT_REPLY_1` 被舊 `warmup_tag` 污染，導致 judge audit 半段缺值。 |
## 2026-03 Debug Panel Restructure (Flow Test / Force Debug)

| Button | 區域 | Status | Authority Path | Blocked Reason（主要） |
| --- | --- | --- | --- | --- |
| Run Full Night Test | Flow Test | 保留/改名 | `ensureBootstrapState(force=true)` -> `setFlowStep(VIP_TAG_PLAYER)` -> `submitChat`(warmup) -> `submitChat`(Q1 correct) -> `ADVANCE_NEXT` -> Q2 | `not_in_sandbox_story`, `vip_tag_not_emitted`, `post_reveal_not_done`, `second_question_not_emitted` |
| Pass Flow | Flow Test | 保留 | `advancePrompt('debug_pass')`（正式 guard path） | `not_in_sandbox_story`, `end_of_nodes` |
| Force Correct Now | Force Debug | 保留/改名 | `setConsonantJudgeAudit` + `applySandboxCorrect` | `not_in_sandbox_story`, `missing_current_prompt`, `prompt_not_force_correct_capable` |
| Force Next Question | Force Debug | 新增（合併 next 類） | `forceAdvanceNode()` + `setSandboxFlow(nextQuestion*)` | `not_in_sandbox_story`, `story_completed`, `no_next_question`, `force_advance_failed` |
| Force Ghost Event | Force Debug | 保留/改名 | `triggerEventFromTester(pickedReadyEvent)` | `not_in_sandbox_story`, `no_ready_ghost_event` |

刪除：`ForceResolveQna`、`ClearReplyUi`、`Force Reveal Word`、`ForcePlayPronounce`、`ForceWave(related/surprise/guess)`、舊 next 類重複按鈕。

## Sandbox Debug Panel（精簡後）

| Debug Action | 保留/刪除 | Authoritative Effect / Blocked Reason |
|---|---|---|
| Pass Flow | 保留 | `advancePrompt` 推進 `flow.questionIndex`；若到尾端則 `blockedReason=end_of_nodes` |
| Force Correct | 保留 | `applyCorrect` + `consonantJudgeAudit` 完整寫入；非 consonant prompt 時 blocked |
| Trigger Random Ghost | 保留 | 走 `startEvent` 正式事件管線；若無 ready event 回報 blocked |
| Run Sandbox Flow Test | 保留（新增） | 透過正式 submit/evaluator/flow 驗證 Q1->Q2；失敗落 `failedStep/failureReason` |
| ForceResolveQna / ClearReplyUi / Force Next Node / Force Reveal / ForcePlayPronounce / ForceWave* | 刪除 | 重疊、碎片、非日常正式 flow 驗證必要 |

### Sandbox Flow Test Result fields
- `status: idle/running/passed/failed`
- `startedAt/finishedAt`
- `currentStep/lastPassedStep/failedStep/failureReason`
- `fromQuestionId/toQuestionId`
- `autoAnswerUsed`
- `secondQuestionShown`

### Integration guards (WAIT_REPLY_1 consonant authority)
- Audit-first state table（debug-only, no behavior change）

| Audit State | Trigger | parse/judge data source | UI/debug authority | Expected output |
|---|---|---|---|---|
| `not_evaluated` | 尚未收到玩家輸入 | `sandboxConsonantAuditRef` 初始值 | `sandbox.parse.*` / `sandbox.judge.*` | `parse.ok=false`, `judge.resultReason=not_evaluated` |
| `evaluated` | 玩家輸入命中 `consonant_answer` gate | classic pipeline + shared consonant engine | `sandbox.currentPrompt.*` + `sandbox.parse.*` + `sandbox.judge.*` | 顯示 raw/normalized/matchedAlias + expectedConsonant/acceptedCandidates |
| `missing_prompt` | gate 為子音作答但 prompt 缺失 | consume guard fallback audit record | 同上 | `parse.kind=no_prompt`, `parse.blockReason=missing_consonant_prompt` |

- Guard 1: `flow.step=WAIT_REPLY_1` 時 `replyGate.gateType != none`。
- Guard 2: `flow.step=WAIT_REPLY_1` 時 `replyGate.sourceMessageId` 不可為空。
- Guard 3: `prompt.current.kind=consonant` 時 evaluator 必須使用 classic pipeline（`normalizeInput -> parseThaiConsonant -> judgeConsonantAnswer`）。
- Guard 4: 玩家輸入評估寫入 `lastReplyEval` 時 `gateType` 不可為 `none`。

- PREHEAT contract（強制）：
  - 啟動路徑：`BOOT -> PREHEAT_CHAT`（mode entry 即啟動，禁止停在 `-`）。
  - `introGate.minDurationMs=30000`，未滿 30 秒不得出題 / 不得要求玩家回答泰文題。
  - 輸出只可為：少量 join、熟客聊天、VIP 打招呼、真假質疑、上次鬼很多、VIP tag 玩家是否第一次看。
  - join 類總量上限固定 4 則；不得由同一 sender 連續洗版；不得由 `mod_live` 代發 `viewer_xxx 進來了` 串。
  - sandbox 預熱輸出必須由單一 v2 orchestration 決定，legacy/fallback join loop 在 sandbox mode 硬阻斷。

- v2 runtime boot invariant：進入 `sandbox_story` 即需有 `flow.step=BOOT`、`scheduler.phase=BOOTSTRAP`、`ssot.version` 與完整 root objects；debug panel 僅可讀取 v2 root state，不可用 legacy fallback 偽裝初始化成功。

# sandbox_story v2 flow table (NIGHT_01 MVP)

- 2026-03-10 audit-only：`scheduler.phase` 現況不再代表 sandbox 實際流程 authority（現行 flow 主要由 `flow.step` 驅動）；debug 研判需分離 display fields（`acceptedAnswers`）與 runtime judge fields（`acceptedCandidates`）。詳見 `docs/sandbox-audit-bopomofo-debug-scheduler.md`。

- 2026-03-09 integration update：`ensureBootstrapState()` 為 sandbox_story 唯一 bootstrap authority wrapper；mode entry、guard recovery、clearReplyUi reset 一律走同一路徑。
- core mount invariant（進入 sandbox_story 當下）：`flow.step=PREHEAT_CHAT`、`flow.questionIndex=0`、`flow.stepStartedAt>0`、`scheduler.phase=preheat`、`introGate.startedAt>0`、`introGate.minDurationMs=30000`。
- visual alignment invariant：任何 `ui.*.visible`（含 consonant bubble）不得在 core bootstrap invariant 未成立時單獨呈現為啟動中。

| State | 玩家可輸入 | Prompt | Reveal | Emitter | 轉移條件 |
|---|---|---|---|---|---|
| BOOT | 否 | 無 | 否 | system | 初始化完成 -> PREHEAT_CHAT |
| PREHEAT_CHAT | 否 | 暖場聊天 | 否 | viewer/vip/mod | 至少 30000ms -> CONSONANT_PROMPT |
| CONSONANT_PROMPT | 否 | 子音題 | 否 | mod | prompt ready -> WAIT_CONSONANT_REPLY |
| WAIT_CONSONANT_REPLY | 是（子音） | 子音題 | 否 | 無 | 判定 correct -> WORD_REVEAL |
| WORD_REVEAL | 否 | 同題 | 是 | system | reveal 完成 -> RIOT_AFTER_REVEAL |
| RIOT_AFTER_REVEAL | 否 | 同題 | 是 | viewer | riot wave done -> VIP_SUMMARY |
| VIP_SUMMARY | 否 | 同題 | 是 | vip | summary done -> THEORY_CHAT |
| THEORY_CHAT | 否 | 理論碎片 | 是 | viewer/mod | theory wave done -> ASK_PLAYER_MEANING |
| ASK_PLAYER_MEANING | 否 | @玩家追問 | 是 | vip/mod | gate armed -> WAIT_PLAYER_MEANING_REPLY |
| WAIT_PLAYER_MEANING_REPLY | 是（推理） | 理論問句 | 是 | 無 | 收到回覆 -> FLUSH_TECH_BACKLOG / ADVANCE_TO_NEXT_QUESTION |
| TECH_BACKLOG_ACCUMULATING | 否 | 等待中 | 是 | 無 | 每30秒累積2則，最多8則 |
| FLUSH_TECH_BACKLOG | 否 | 無 | 是 | mod(system) | 玩家回覆後一次 flush -> ADVANCE_TO_NEXT_QUESTION |
| ADVANCE_TO_NEXT_QUESTION | 否 | 無 | 否 | system | 還有題目 -> CONSONANT_PROMPT |
| REVISIT_THEORY | 是 | revisit 問句 | 依題目 | vip/mod | 回答命中分類或達上限 -> ADVANCE |
| NIGHT_ENDING | 否 | 最終警告 | 是 | vip/viewer/system | 第10題結束腳本 |
| NIGHT_COLLAPSE | 否 | 無 | 是 | system | 崩壞演出完成 |
| FINAL_MESSAGE | 否 | อย่าหัน | 是 | system | 黑屏結束 |

> 規則：未 reveal 不得 riot；未 currentPrompt 不得 ask-player；未 armed gate 不得要求玩家回答。

## sandbox v2 debug/runtime initial shape（guard）

- currentPrompt: `{ id:'-', consonant:'-', wordKey:'-' }`（由 prompt.current 安全投影）
- reveal: `visible/phase/doneAt/wordKey/durationMs` 皆有預設值
- replyGate: `gateType/armed/sourceMessageId/targetPlayerId/canReply/sourceType/consumePolicy`
- lastReplyEval: `messageId/gateType/consumed/reason/rawInput/normalizedInput/extractedAnswer`
- techBacklog: `queued/pending/lastDrainAt`
- theory: `active/nodeId/promptId`
- blockedReason: 缺值回退 `'-'`
- transitions: 永遠為 array（預設 `[]`，UI 顯示最近 20 筆）

> 設計原則：debug 只輔助，不可阻斷 runtime；hydration 未完成時一律可安全 render。


## NIGHT_01 (Enforced integration after full fix)
| Order | flow.step | Gate / State Invariant | Notes |
|---|---|---|---|
| 1 | PREHEAT_CHAT | introGate.startedAt + scheduler.phase=preheat | 只允許暖場聊天，不出題 |
| 2 | VIP_TAG_PLAYER | no auto-advance without emission | 由 flow controller 發出 VIP tag |
| 3 | WAIT_WARMUP_REPLY | replyGate.armed=true, gateType=warmup_tag | 玩家未回覆不得前進 |
| 4 | POST_REPLY_CHAT | lastReplyEval.consumed=true (warmup) | 暖場回覆後聊天室接話 |
| 5 | REVEAL_1_START | currentPrompt prepared | 第一次 reveal 起始 |
| 6 | REVEAL_1_RIOT | reveal visible + riot chat | 混亂猜測段 |
| 7 | TAG_PLAYER_1 | question emitter emits | 正式點名進題 |
| 8 | WAIT_REPLY_1 | replyGate.armed=true, gateType=consonant_answer + currentPrompt | 第一題等待回答 |
| 9 | ANSWER_EVAL | lastReplyEval + judge | 評分 |
| 10 | REVEAL_WORD | word.reveal + pronounce | 顯字/發音 |
| 11 | POST_REVEAL_CHAT | post reveal chat | reveal 後聊天室 |


## Bootstrap SSOT（sandbox_story）
- 唯一初始化入口：`sandboxStoryMode.bootstrapRuntime()`。
- mode switch / guard recovery / clearReplyUi re-init 皆呼叫同一入口，不可各自寫一套 bootstrap。
- 進入 sandbox_story 後必備正式 state：
  - `flow.step/questionIndex/stepStartedAt`
  - `introGate.startedAt/minDurationMs/passed`
  - `scheduler.phase`
  - `replyGate`（完整 shape）
  - `currentPrompt`（可 null）
  - `lastReplyEval`（可 null）
  - `audit.transitions`（至少 bootstrap transition）

## Integration update: shared consonant engine + sandbox word mapping split

- `TAG_PLAYER_1 -> WAIT_REPLY_1` 進入時，正式 gate 由 flow controller 建立，且必須攜帶 `replyGate.sourceMessageId`（來源為 tag 問題訊息 messageId；必要時 fallback lock/qna 並 repair）。
- `WAIT_REPLY_1` 的玩家輸入路徑固定為：`shared normalizeInput -> shared parseConsonantAnswer -> shared judgeConsonantAnswer`，結果寫回 `lastReplyEval` 與 `consonant.judge`。
- `correct` 後續仍走 sandbox 分流：`ANSWER_EVAL -> REVEAL_WORD -> POST_REVEAL_CHAT`（聊天室反應/單字 reveal/故事節點保留）。
- `wrong_format` 與 `wrong_answer` 皆由 shared judge 回傳，sandbox 不再用平行 parser 前置擋格式。
- `answerGate` 為 legacy mirror（non-authoritative），只投影 `replyGate`，不推動 flow step。
## 2026-03-10 integration fix（authoritative judge audit + advance-next single path）

- authoritative judge audit（SSOT）改為 `consonantJudgeAudit`（mode state 可序列化），來源固定為 `consumePlayerReply(consonant gate) -> parseAndJudgeUsingClassic -> shared consonant engine`。
- debug 呈現拆分：
  - Display metadata：`currentPrompt.displayAcceptedAnswers / currentPrompt.displayAliases`（presentation only）
  - Runtime judge candidates：`currentPrompt.runtimeAcceptedCandidates` 與 `consonantJudgeAudit.acceptedCandidates`（authoritative judge inputs）
- `scheduler.phase` 降級為 auxiliary debug（non-authoritative）；正式 emit/consume 判斷以 `flow.step + replyGate + sandboxFlow boundary state` 為主。
- `POST_REVEAL_CHAT -> ADVANCE_NEXT` 收斂：
  - `postRevealChatState: started -> done`
  - `nextQuestionReady/nextQuestionEmitted/nextQuestionBlockedReason`
  - `ADVANCE_NEXT` consumer 僅在 `replyGate` 已釋放時前進，避免第一題後卡住。

## Follow-up integration guardrails (2026-03-10)

- Authoritative judge audit SSOT: `state.consonantJudgeAudit`（panel 僅可讀這裡，不可再混讀 parse-only/ref state）。
- `ADVANCE_NEXT` 單一 consumer：`advance_next_effect`。
- next-question observability（必填）：
  - `nextQuestionReady`
  - `nextQuestionEmitted`
  - `nextQuestionBlockedReason`
  - `nextQuestionFromQuestionId`
  - `nextQuestionToQuestionId`
  - `nextQuestionDecidedAt`
  - `nextQuestionEmittedAt`
  - `nextQuestionConsumer`
- 規則：若 `nextQuestionEmitted=false`，`nextQuestionBlockedReason` 不可為空。
- 規則：同輪 preheat/warmup 注入不得重播同 fingerprint 句。

## 2026-03-10 debug button authoritative action table update

- Debug actions must be state/gate-driven and observable.
- `PASS (advancePrompt)` / `Force Next Node`:
  - authoritative target: `nodeIndex`, `flow.questionIndex`, `sandboxFlow.nextQuestion*`, `advance.*`
  - blocked reason when end reached: `end_of_nodes`
- `ForceCorrect`:
  - authoritative target: `consonant.parse/judge`, `replyGate`, `sandboxFlow.replyGateActive/canReply/gateConsumed`, `answerGate`, `reveal`, `debugOverride`
- `ForceResolveQna` / `ClearReplyUi`:
  - authoritative target: `replyGate`, `sandboxFlow gate fields`, lock/QnA bridge state
- `Force Reveal Word`:
  - authoritative target: `reveal.*` (blocked if no current prompt)
- `ForcePlayPronounce`:
  - authoritative target: `audio.state/lastKey`, blocked reason mirrors play result when failed
- `ForceWave(*)`:
  - authoritative target: `wave.count`, `wave.kind`
- `Trigger Random Ghost`:
  - authoritative target: event start path (`startEvent`), blocked if no ready event (`no_ready_ghost_event`)

### Debug panel observability requirement (enforced)
- Every debug action writes:
  - `lastClickedAt`
  - `handlerInvoked`
  - `effectApplied`
  - `blockedReason`
  - `targetState`
  - `lastResult`
- UI must not present legacy/unavailable action as silently clickable without result.
