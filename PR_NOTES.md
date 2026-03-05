## Summary
- 新增 `src/sandbox/chat/chat_director.ts`，以 Director 作為 sandbox chat 的唯一節奏來源（mode / directed line / pool weights / shouldEmitJoin）。
- `src/sandbox/chat/chat_engine.ts` 改為 Director 驅動，並落實 freeze 0 output 與 glitch burst 優先邏輯。
- PREHEAT 改為「軟編排保證 + 隨機填充」：保證 VIP 出場、保證一次 VIP `@玩家`，其餘走隨機池。
- `src/app/App.tsx` 同步傳入 `flow.step + stepStartedAt` 至 chat engine，且 preheat join 改用 Director 判斷。
- `src/modes/sandbox_story/sandboxStoryMode.ts` 強化 30 秒 gate：force ask API 在 PREHEAT 不可越權出題。
- classic mode 未修改。

## SSOT / Debug 欄位變更紀錄
- SSOT：sandbox chat orchestration 收斂到 Director（避免 engine / app 多點決策衝突）。
- debug：沿用 `sandbox.flow.*`, `sandbox.freeze`, `sandbox.glitchBurst`；無新增破壞性欄位。

---

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

## 2026-03-06（sandbox only：audit debug fields + emit spam detection）

### Changed
- [sandbox/debug] 新增 audit debug 欄位並輸出到 debug 面板：
  - `introGate.startedAt/minDurationMs/passed`
  - `flow.step + stepEnteredAt + questionIndex`
  - `freeze.frozen/reason/frozenAt`
  - `glitchBurst.pending/remaining`
  - `tagAskedThisStep + askedAt`
  - `lastEmitKey + lastSpeaker`
  - `recentEmitKeys`（ring buffer 20）
  - `transitions`（ring buffer 20）
  - `thaiViewer.lastUsedField/count`
- [sandbox/chat] `chat_engine` 新增 audit 記錄，不阻擋 emit：
  - 同 key 連續 >2：`duplicateSpamCount++`
  - 同 speaker 連續 >3：`speakerSpamCount++`
  - `WAIT_PLAYER_*` 且 freeze 期間仍有 emit：`freezeLeakCount++`

### Scope Guard
- 只改 sandbox，classic 無變更。

## 驗收步驟
1. 進 sandbox 後觀察 0~20 秒：一定出現 VIP 主動 `@玩家` 打招呼。
2. 同一段預熱內可見 2~3 則觀眾和 VIP 互動，且至少 1 則質疑「我覺得應該是假的吧」。
3. 0~30 秒確認沒有子音題問句，debug `sandbox.prompt.overlay.consonantShown` 維持空字串。
4. 30 秒到點後才會進 `ASK_CONSONANT` 並顯示第一題子音。
5. classic mode 跑一般流程，行為不變。
