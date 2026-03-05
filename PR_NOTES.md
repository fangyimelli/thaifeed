## Summary
- 新增 sandbox VIP 身份 SSOT `src/sandbox/chat/vip_identity.ts`，固定唯一 VIP 為 `👑 behindyou`（`id=sandbox_vip_behindyou`、`role=vip`、`badge=crown`）。
- 新增 sandbox 固定暖場腳本 `PREHEAT_SCRIPT`（12 條、0~20 秒），不再依賴隨機池決定開場戲。
- sandbox chat engine 在 `PREHEAT` 階段改為按時間逐條派發固定序列（每條只發一次），腳本播完後才回到 `casual/observation` 隨機聊天。
- 固定序列保證包含：`👑 behindyou` 主動 `@玩家`、VIP 熟客台詞、觀眾與 `@behindyou` 接話、以及「我覺得應該是假的吧」質疑句。
- 前 30 秒維持硬 gate：禁止出題、禁止子音 overlay；30 秒到點後才允許第一題子音。
- sandbox 初始化與 context 持續使用 `state.player.handle`（fallback `000`）做 `{{PLAYER}}` 替換，玩家不需先發言即可被 VIP @。
- **classic mode 未修改**。

## Debug 欄位變更紀錄
- 本次沿用既有 debug 欄位進行驗收：
  - `sandbox.introGate.startedAt/minDurationMs/passed/remainingMs`
  - `sandbox.player.handle`
  - `sandbox.prompt.overlay.consonantShown`
- 補充：preheat 固定序列為 chat engine 內部 cursor 控制（`preheatScriptCursor`），不新增外部 debug schema，避免破壞既有面板相容性。

## 驗收步驟
1. 進 sandbox 後觀察 0~20 秒：一定出現 VIP 主動 `@玩家` 打招呼。
2. 同一段預熱內可見 2~3 則觀眾和 VIP 互動，且至少 1 則質疑「我覺得應該是假的吧」。
3. 0~30 秒確認沒有子音題問句，debug `sandbox.prompt.overlay.consonantShown` 維持空字串。
4. 30 秒到點後才會進 `ASK_CONSONANT` 並顯示第一題子音。
5. classic mode 跑一般流程，行為不變。
