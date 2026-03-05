## Summary
- 以 sandbox 專屬 step-driven state machine 重整聊天室流程，導入 PREHEAT / WAIT freeze / glitch burst / reveal chain 單一路徑。
- 玩家身份在 sandbox init 立即建立（`player.handle`），VIP 可在預熱期直接 `@玩家`。
- 修正第 2 題後卡住：每題固定經過 `子音 -> glitch -> 單字 -> 暴動 -> VIP 翻譯 -> 猜測 -> 問玩家 -> 下一題`。
- **classic mode 完全未修改**。

## SSOT（Single Source of Truth）
- `SandboxStoryState.flow.step` 使用 `SandboxFlowStep` 具名枚舉：
  - `PREHEAT`
  - `ASK_CONSONANT`
  - `WAIT_PLAYER_CONSONANT`
  - `GLITCH_BURST_AFTER_CONSONANT`
  - `REVEAL_WORD`
  - `WORD_RIOT`
  - `VIP_TRANSLATE`
  - `MEANING_GUESS`
  - `ASK_PLAYER_MEANING`
  - `WAIT_PLAYER_MEANING`
  - `GLITCH_BURST_AFTER_MEANING`
  - `ADVANCE_NEXT`
- 新增 state 節點：
  - `freeze: { frozen, reason, frozenAt }`
  - `glitchBurst: { pending, remaining, lastEmitAt }`
  - `player: { handle, id? }`

## Debug 欄位變更紀錄
- 新增 `sandbox.flow.step`（具名 step）。
- 新增 `sandbox.freeze.frozen/reason/frozenAt`。
- 新增 `sandbox.glitchBurst.pending/remaining/lastEmitAt`。
- 新增 `sandbox.player.handle/id`。
- `setFlowStep()` transition 會寫 sandbox debug transition 訊息（DEV console）。

## 驗收步驟與預期輸出
1. 進入 sandbox（不輸入任何字）。
   - 預期：VIP 能在 PREHEAT 直接 `@<player.handle>` 打招呼。
2. 觀察前 30 秒。
   - 預期：僅預熱聊天/慢速 join，不出題。
3. 30 秒後進第一題。
   - 預期：只出一次子音題目，接著進 `WAIT_PLAYER_CONSONANT` 並 freeze（聊天室 0 output）。
4. 玩家回覆子音（含不知道）。
   - 預期：立刻 glitch burst 10 則（250~450ms），刷完進 REVEAL_WORD 再跑後續鏈。
5. 進入 ASK_PLAYER_MEANING 後回覆。
   - 預期：再次 freeze -> 回覆 -> glitch burst 10 則 -> ADVANCE_NEXT。
6. 至少跑 3 題。
   - 預期：每題都會顯示單字，不會第 2 題卡住。
7. 驗證 classic。
   - 預期：classic mode 行為不變（本次未改 classic sources）。
