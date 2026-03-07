## 2026-03-06 Sandbox NIGHT_01 卡關稽核（AUDIT ONLY）

- 本次僅新增 audit report：`docs/sandbox-night01-audit-report-2026-03-06-night01-stall.md`。
- 未修改 runtime code；classic mode 無改動。
- 結論重點：
  1. 玩家送出成功，但 sandbox consonant parser/judge 未接線（judge 欄位維持預設值）。
  2. pinned 文案來源與有效子音 prompt 非同源，造成 UI target 誤導。
  3. `2jo` 對 `บ` 依現規則本來不合法，但本案先是 parser 沒跑。

### SSOT / Debug 欄位變更紀錄
- SSOT：無變更（audit only）。
- Debug：無新增欄位；補充 trace/根因文件化。


## 2026-03-06 P0 補丁（reply/pin 控制面互斥與 self-tag 防呆）

- Auto Pin Freeze：lock target = source actor（speaker/question actor），禁止指向 active user。
- Submit guard：若 lock target 與 active user 等價，降級為一般送出（不 rewrite mention，並清除 lock）。
- Preview 規則：reply preview 與 sandbox pinned preview 互斥；主要回覆焦點固定在 composer 前。
- Debug 規則：`Emit NPC Tag @You` 為 isolated debug message，不得改寫正式 lock/pin/reply state。

## 2026-03-06 P0 Guardrails（sandbox only）

### Transactional question commit
- `questionMessageId` 僅可由 append 成功後回傳的 resolved message id 寫入。
- append 失敗時不得進入 pin/freeze/awaiting_reply，也不得殘留 lock。

### Reply pin bar render guard
- 必須同時成立才顯示 pin bar：
  1) `qna.active.status === 'AWAITING_REPLY'`
  2) `questionMessageId` 非空
  3) message store 可查到該 id
  4) lock target 與 source actor 一致（若 lock 存在）
- source 缺失或不一致時：安全降級（清除 pin / reset awaiting state / 不 render）。
- `（原始訊息已不存在）` fallback 不再用於全域 pin bar。

### Debug action isolation
- `Emit NPC Tag @You` / `Simulate Send` / `Toggle TagLock(Self)` 為 isolated debug path，不可直接推進正式 qna/pin/lock。
- debug 注入訊息仍走 schema + append gate，但預設只產生可觀察測試訊息。

## 2026-03-06 NIGHT_01 Audit Addendum（audit only）

| Topic | 稽核結論 | 影響層 |
| --- | --- | --- |
| behindyou `@玩家` | 屬 mention 訊息（非 reply schema） | `chat_director -> chat_engine -> App dispatch -> ChatMessage` |
| `↳ @mod_live` + `（原始訊息已不存在）` | 來自全域 reply pin bar；條件為 `qnaStatus=AWAITING_REPLY && questionMessageId` 且 target lookup miss | `ChatPanel` |
| `@t` | 來源為玩家 handle 本值（資料建立時），非 render 截斷 | `join/registerActiveUser + directed line template` |
| prompt 混線 | prompt/reveal state 未直接寫入 `ChatMessage` schema；但 reply/pin 控制面與 qna 共用，存在 cross-mode coupling 風險 | `sandboxStoryMode + App control plane` |
| debug 按鈕污染 | debug action 可直接改 lock/pin 或推訊息，可能與正式流程狀態並存 | `App debug handlers` |

> 詳細 trace 與 root cause 請見：`docs/sandbox-night01-audit-report-2026-03-06.md`。

## 2026-03-06 Sandbox pinned reply body pipeline 修正（sandbox only）

| Pipeline 階段 | 修正前 | 修正後 |
| --- | --- | --- |
| 1. source message text | auto pin 只從 `state.messages` 反查，可能拿不到當下訊息 | auto pin 可直接吃 dispatch 當下 `sourceMessage`，再 fallback state lookup |
| 2. mention parser | mention 判定正確，但不保證 pin body 來源 | mention 判定維持不變；pin body 來源改為同 tick message，避免空 body |
| 3. pinned entry 建立 | 可能寫入 `body=''` | 透過 `resolveSandboxPinnedBody()` 寫入完整文字 |
| 4. pinned state 寫入 | metadata 有值、body 可能空 | metadata + body 同步寫入 |
| 5. pinned formatter | 顯示 `「body」`，body 空時看到 `「」` | 顯示純文字 body，空值改顯示 fallback 文案 |
| 6. pinned component render | 視覺上可出現空引號 | 不會再出現空引號；會顯示完整內容或 fallback |

## 2026-03-06 Pinned parity 規則補充（sandbox only）

### Sandbox vs Classic pinned schema 對齊
- sandbox pinned entry 統一採用 Classic reply pin 欄位語意：
  - `id`
  - `messageId`
  - `createdAt`
  - `expiresAt`
  - `visible`
  - `author`
  - `body`

### Render 規則
- formatter 與 Classic 一致：
  - Header：`↳ @<author>`
  - Body：`「<full body>」`（不截斷）
- pinned UI 不得顯示 internal metadata（如 reason/eventName/sourceEventType）。

### Lifecycle 對齊
- 建立：`VIP direct mention` 與 `story-critical follow-up` 進同一 auto pin route，建立 pin + freeze。
- 顯示：以 `replyPinBar` 樣式顯示，sandbox 只負責 gating。
- 清除：沿用既有 `clearReplyUi`、freeze timeout、expiresAt auto clear。

# Sandbox Flow Spec
Version: 2026-03-06
Last Updated By: Codex

> SSOT for sandbox flow. This document applies to sandbox mode only. Classic mode behavior is unchanged.


## 2026-03-06 補充規則（sandbox only）

### VIP Direct Mention Routing
- 命中條件：`speaker=VIP` 且 `message` 含 `@<activePlayerHandle>`。
- 命中後效果：
  - 保留原始訊息並可套用 highlight/emphasis。
  - 寫入 sandbox 專用 pinned entry（獨立 pinned 區塊，不依賴 qna reply preview）。
  - 觸發 chat freeze（預設 6000ms；可配置 5000~8000ms）。
  - pinned 與 freeze 可不同步壽命（目前 pinned = freeze + 3s）。
- freeze 結束自動解除並恢復聊天。
- 排除條件：VIP 但未 mention active player，視為一般聊天，不自動 pin。

### 狀態拆分（Highlight / Pinned / Freeze）
- highlight/emphasis：只影響聊天室訊息樣式，不代表已建立 pinned。
- pinned reply：由 `sandboxPinnedEntry` 控制，渲染於 sandbox pinned 區塊。
- freeze/pause/focus：由 freeze state 控制聊天室暫停，與 pinned 分離。
- 同一事件（VIP direct mention / story-critical follow-up）可同時觸發 highlight + pinned + freeze。

### GHOST_HINT_EVENT Follow-up Routing
- 事件型別：`[GHOST_HINT_EVENT] <TYPE>`（目前 `GHOST_VOICE/SCREEN_GLITCH/TV_ON`）。
- routing：`system hint event -> 強制 1 則 VIP follow-up(story-critical) -> 觀眾推理`。
- VIP follow-up 規則：
  - 標記 `chatType=sandbox_story_critical_hint_followup`。
  - 強制 pin + freeze（預設 7000ms；可配置 5000~8000ms）。
  - debug 記錄 `lastHintFollowUpEvent`。

| Step | Description | Chat Frequency | Reply-To | Tech Backlog | Overlay | Example Messages |
|---|---|---|---|---|---|---|
| PREJOIN | 玩家尚未提交使用者名稱，sandbox 不得輸出聊天室訊息、不得預熱、不得出題。 | 0 output（完全靜止） | inactive | disabled | hidden | （無訊息） |
| PREHEAT | 玩家提交名稱後開始 30 秒預熱，只允許寒暄/打招呼/熟客互動，不得出題。 | 接近 classic 一般聊天頻率 | inactive | disabled | hidden | `👑 behindyou: 我先坐前排，今天先看節奏。` |
| TAG_PLAYER_1 | 預熱結束後進第一段 tag，對玩家提問並進入強制回覆。 | 單則 tag 後立即停住 | active（classic reply-to） | disabled | shown（子音提示可見） | `mod_live: @player 你先回一個你看到的子音。` |
| WAIT_REPLY_1 | 第一段等待玩家回覆。只要 reply-to active 必須 0 output。 | 0 output（freeze） | active（不可取消） | disabled | shown | （無訊息，等待玩家送出回覆） |
| POSSESSION_AUTOFILL | 玩家回覆後，自動填入單字到輸入框。 | 0~低頻（系統動作） | inactive | disabled | shown | （UI 自動填字，不發聊天） |
| POSSESSION_AUTOSEND | 自動送出填入內容，走同一送出管線。 | 低頻（單次送出） | inactive | disabled | shown | `you: หมา` |
| CROWD_REACT_WORD | 觀眾先針對單字做短討論（固定 4~6 則）。 | 短波段（4~6 則） | inactive | disabled | shown | `viewer_321: 這個拼音到底怎唸？` |
| VIP_SUMMARY_1 | 第一段短討論後的硬步驟 VIP 總結（固定 1 則，不可隨機省略）。 | 單則 | inactive | disabled | shown | `👑 behindyou: VIP 總結：先把剛剛那個單字記住，下一步確認發音。` |
| TAG_PLAYER_2_PRONOUNCE | 第二段 tag（發音/延伸追問），每 step 僅允許 1 則 tag，送出即 freeze。 | 單則 tag 後立即停住 | active（classic reply-to） | disabled | shown | `👑 behindyou: @player 所以到底怎麼唸？` |
| WAIT_REPLY_2 | 第二段等待玩家回覆。reply-to active 時全域 0 output。 | 0 output（freeze） | active（不可取消） | disabled | shown | （無訊息，等待玩家送出回覆） |
| DISCUSS_PRONOUNCE | 玩家回覆 TAG#2 後先進發音短討論（固定 3~5 則）。 | 短波段（3~5 則） | inactive | disabled | shown | `viewer_556: 我聽起來像是上揚音。` |
| VIP_SUMMARY_2 | 第二段短討論後的硬步驟 VIP 總結（固定 1 則）。 | 單則 | inactive | disabled | shown | `👑 behindyou: VIP 總結：發音方向差不多了，最後確認這個詞在指誰。` |
| TAG_PLAYER_3_MEANING | 第三段 tag（問單字意思/指誰），每 step 僅允許 1 則 tag，送出即 freeze。 | 單則 tag 後立即停住 | active（classic reply-to） | disabled（僅 WAIT_REPLY_3 可累積） | shown | `mod_live: @player 這個單字你覺得代表什麼？在指誰？` |
| WAIT_REPLY_3 | 第三段等待玩家回覆。此步才允許技術故障 backlog 累積。 | 0 output（freeze） | active（不可取消） | 每 30 秒累積 2 則到 backlog；不即時顯示 | shown | backlog 範例：`技術故障：訊號不穩，暫時卡住` / `奇怪卡了大約 5 分鐘` |
| FLUSH_TECH_BACKLOG | 玩家回覆後一次 flush backlog（最多 8 則，最後一則為卡住分鐘數）。 | 短波段（<=8 則） | inactive | flush then reset | shown | `mod_live: 奇怪卡了大約 10 分鐘` |
| ADVANCE_NEXT | 本題收束後推進下一題（回到 TAG_PLAYER_1）。 | 低頻（流程切換） | inactive | disabled | shown（下一題接續） | `👑 behindyou: 先記住這點，我們下一題。` |

## Rules Snapshot
- reply-to active 時，聊天室必須全域 0 output（chat_engine/director/VIP summary/viewer/join 全部暫停），且 reply-to 不可取消。
- `WAIT_REPLY_1/2/3` 期間 scheduler 必須硬暫停（不可持續 schedule 再靠 emit gate 丟棄）；玩家回覆離開 WAIT_REPLY 後才可恢復排程。
- `TAG_PLAYER_1/2/3` 每個 step 只能成功 emit 一次 tag；發完後立即 `tagAskedThisStep=true`，後續重跑必須直接 return。
- 技術故障訊息只能在 `WAIT_REPLY_3` 累積（每 30 秒 2 則，不即時顯示），並在 `FLUSH_TECH_BACKLOG` 才顯示（<=8 則，最後一則固定分鐘數）。
- 若 sandbox 與 classic 共享邏輯，需避免規則互滲：sandbox 可有專屬 pinned 區塊，但 classic UI/規則不得受影響。

## 2026-03-07 NIGHT_01 Judge Gate 補丁（sandbox only）

### WAIT_REPLY 判題/推進規則（更新）
- `WAIT_REPLY_1/2/3` 且存在 `prompt.current.kind=consonant` 時，玩家送出訊息必須先跑 parser/judge：
  - `parseAndJudgeUsingClassic`
  - `commitConsonantJudgeResult`
- 推進條件改為 judge-driven：
  - `correct/pass`：允許離開 WAIT，推進既有 step。
  - `wrong/unknown`：不得離開 WAIT。
- parser 需容忍前置 mention：leading `@handle` 會先被 strip 後再 normalize/judge。

### Prompt 與 Pinned 同源規則（更新）
- `askSandboxConsonantNow` 發送的 tag message text 與 pinned text 必須使用同一題目 prompt（同 source string）。
- `runTagStartFlow` pinned 顯示優先採用已 append 的 `tagMessage.text`，避免題目與 pinned 文案分歧。
