### Integration guards (WAIT_REPLY_1 consonant authority)
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
