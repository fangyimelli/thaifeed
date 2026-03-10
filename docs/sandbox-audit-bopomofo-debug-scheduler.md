# Sandbox audit: bopomofo alias / debug state / scheduler phase 不一致（audit-only）

日期：2026-03-10  
範圍：sandbox story flow、shared consonant engine、debug panel mapping、legacy compatibility layer  
模式：audit only（不改正式流程邏輯）

## Executive summary

真正問題是：**正式判題路徑已正確吃到 shared alias（含注音），但 debug 層混用了 `shared question display fields` 與 `runtime audit ref`，加上 `scheduler.phase` 在現行 sandbox flow 根本沒有 authority writer，導致 debug 顯示與真實 flow/判題脫鉤。**

## Authoritative flow table

| Layer | Authority / Source | 實際路徑 |
|---|---|---|
| raw input | `consumePlayerReply(raw)` | `raw` 先 strip leading mention，保留原始字串供審計。 |
| normalized input | shared normalize + classic adapter | `parseAndJudgeUsingClassic()` 內呼叫 `normalizeInput` / `parseThaiConsonant`，最終以 shared normalize 為準。 |
| parse source | shared consonant engine | `parseThaiConsonant -> parseConsonantAnswer`，`ALL_ALIAS_TO_CONSONANT` 做 alias 命中。 |
| alias source | shared bank + common alias pool | `buildAcceptedAliasSet = consonant + roman + bopomofo + question.acceptedAnswers + question.aliases`。 |
| judge source | shared judge | `judgeConsonantAnswer(parsed,target)` 僅比對 `matchedConsonant === target.consonant`。 |
| flow state source | sandbox flow step | consume 成功後 `WAIT_REPLY_1 -> ANSWER_EVAL -> REVEAL_WORD -> POST_REVEAL_CHAT -> ADVANCE_NEXT`。 |
| scheduler source | mode state field only（目前無 active writer） | 只在 bootstrap/initial state 設成 `preheat`；App flow 未同步更新 phase。 |
| debug panel source | 混合來源（state + ref） | `currentPrompt.*` 讀 shared question display，`judge.*` 讀 `sandboxConsonantAuditRef`，`scheduler.phase` 讀 state。 |

## Detailed findings

### 1) authoritative judge path

1. 唯一正式判定入口在 `consumePlayerReply()` 的 sandbox 分支，且 gate type 為 `consonant_answer` 時走 `parseAndJudgeUsingClassic()`。  
2. `parseAndJudgeUsingClassic()` 內部實際是 shared engine judge：`normalizeInput -> parseThaiConsonant(parseConsonantAnswer) -> judgeConsonantAnswer(shared)`。  
3. 正確/錯誤決策點只在 shared judge：
   - parse 失敗 => `wrong_format`
   - parse 成功但 consonant 不符 => `wrong_answer`
   - consonant 相符 => `correct`
4. `acceptedAnswers` 與實際可接受 alias 集 **不是同一來源**：
   - `currentPrompt.acceptedAnswers`：只來自 question bank 的 `acceptedAnswers`（顯示用途）
   - 實際判定 alias set：`getAcceptedAliasCandidates()` 動態展開（含 `consonantAliasesCommon.bopomofo`）

### 2) sandbox debug panel mapping

- 欄位來源：
  - `currentPrompt.acceptedAnswers` / `currentPrompt.aliases`：來自 shared question bank 原始欄位（display-only）
  - `judge.expectedConsonant` / `judge.acceptedCandidates` / `judge.compareInput` / `judge.compareMode` / `judge.resultReason`：來自 `sandboxConsonantAuditRef.current.judge`
- 為何會出現「parse 成功 + judge.correct，但 judge 細節空值」：
  1. `sandboxConsonantAuditRef` 只在 `consumePlayerReply` consonant gate branch 被寫入
  2. 若 debug tick 先於 consume path 顯示，或進入非 consonant prompt fallback 分支，ref 仍保留初始空值/舊值
  3. 同畫面同時呈現 `currentPrompt.acceptedAnswers`（display）與 `judge.acceptedCandidates`（runtime audit），語意未分層，造成看似矛盾
- 判定：主要是 **debug panel mapping 語意混用 + runtime ref 非 state SSOT**，不是正式 judge 流程錯。

### 3) scheduler.phase vs flow.step 不一致

- `flow.step` 權威來源：`setFlowStep()`，在 App flow controller 多處被呼叫，確實驅動 story 前進。  
- `scheduler.phase` 權威來源：理論上 `setSchedulerPhase()`；但目前 sandbox App 流程中沒有實際呼叫。  
- 結果：`scheduler.phase` 幾乎停留在 bootstrap 的 `preheat`，即使 `flow.step` 已到 `ADVANCE_NEXT` 仍不變。  
- 判定：**scheduler.phase 已非真實流程 authority，屬殘留顯示欄位（未完成收斂）**，目前主要誤導 debug。

### 4) reply gate / answer gate / legacy compatibility

- `replyGate`：authoritative（consume gate、target/source message、armed/canReply 都以它為準）
- `answerGate`：legacy mirror（透過 `mirrorAnswerGateFromReplyGate()`投影，非流程驅動）
- `sharedConsonantEngine.waitReply1GateArmed`：debug helper（由 flow+replyGate 推導，不應作為流程判定）
- 目前風險：debug 同時顯示 mirror 與 authority，若其中一者延遲更新會造成「gate 已消耗但 legacy 還像 waiting」的視覺假象。

### 5) shared classic -> sandbox alias 同步完整性

- 注音 alias `ㄖ` 來源不是 sandbox 本地補丁，而是 shared 層：
  1. question bank 提供 consonant（如 `ร`）與部分 roman answers
  2. shared engine 由 `consonantAliasesCommon` 動態補齊 roman/bopomofo alias
  3. parse/judge 使用展開後 alias map
- 為何 `acceptedAnswers` 只看到 roman 但注音可答對：
  - `acceptedAnswers` 只是題庫顯示欄位（作者手填）
  - 真正接受集是 runtime `acceptedCandidates`（包含共用表展開的 bopomofo）
- 結論：這是「顯示答案欄位命名易誤導」，不是 alias 判題漏接。

### 6) next question emit risk

- 第一題從 `ADVANCE_NEXT` 前進到下一題，實際靠 `flow.step` + effect 分支，而非 `scheduler.phase`。  
- 因此當前 `scheduler.phase=preheat` 殘留對第二題 emit **目前不構成主流程阻斷**。  
- 但風險在於：若未來有人把 scheduler 當 gate（例如 phaseBusy 條件）就會產生隱性卡題/錯誤節奏。

## Fix plan（規劃，不在本次實作）

### MVP（最小修補）

1. debug panel 明確分區命名：
   - `displayAcceptedAnswers`（題庫顯示）
   - `runtimeAcceptedCandidates`（實際判定）
2. 在 `consumePlayerReply` 每次 consonant judge 後，把 audit 結果同步寫入 mode state（取代僅 ref）。
3. `scheduler.phase` 標註為 legacy / non-authoritative，或先停止在主要 debug 區顯示為流程 authority。

### Full cleanup（完整收斂）

1. 建立單一 `sandboxJudgeAudit` state（mode-level SSOT），移除 `sandboxConsonantAuditRef` 作為主來源。  
2. `scheduler.phase` 二選一：
   - 要嘛補齊真正 phase writer 並與 flow 同步；
   - 要嘛正式 deprecate，debug 只顯示 flow.step。  
3. 清理 legacy mirror 顯示策略：`answerGate` 僅放 compatibility 區，不再與 authority 並列。

## Regression guard（必補）

1. sandbox 接受 bopomofo alias：`ㄖ` 在 `WAIT_REPLY_1` 必須判定 `correct`。  
2. debug candidates 完整性：judge 後 `runtimeAcceptedCandidates` 必含 roman+bopomofo alias。  
3. flow/scheduler 一致性：若 `scheduler.phase` 保留，需有可驗證 mapping；否則 assert debug 不得把它當 authority。  
4. legacy anti-mislead：`answerGate` 與 `replyGate` 顯示分層，且 guard 檢測 mirror 不得驅動流程。

## Involved files and roles

- `src/app/App.tsx`：sandbox consume、flow transition、debug panel mapping、scheduler/read path。  
- `src/modes/sandbox_story/classicConsonantAdapter.ts`：sandbox 使用 classic/shared 的 parse+judge adapter 與 audit payload。  
- `src/modes/classic/consonantJudge.ts`：classic judge 實際委派 shared engine。  
- `src/shared/consonant-engine/engine.ts`：normalize / parse / judge / alias set 展開權威。  
- `src/shared/consonant-engine/questionBank.ts`：shared question bank（含 display acceptedAnswers）。  
- `src/content/pools/consonantAliasesCommon.json`：共用 roman/bopomofo alias 來源。  
- `src/modes/sandbox_story/sandboxStoryMode.ts`：flow/scheduler/replyGate/answerGate state shape 與 mirror 邏輯。  

