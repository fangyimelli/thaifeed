# PR Notes - Sandbox NIGHT_01 live-chat flow + autoplay stabilization

## Why
- NIGHT_01 首題存在舊 emitter（system/教材式 prompt）與聊天室 emitter 並存，造成體驗不自然且 autoplay 在 WAIT gate 易卡住。
- 本次只調整 sandbox 路徑，將 flow/gate/emitter 收斂為單一 SSOT，避免雙軌。

## What changed
- `TAG_PLAYER_1` 成為首題唯一正式提問 emitter（`mod_live @player ...`）。
- `PREHEAT` 改為純自然聊天來源，`sandbox_preheat_join` 不再用 system message。
- `WARMUP_TAG` 改為 intro 過渡 state，不再發出正式提問並進 wait gate。
- 首題 reveal 固定節奏：先發現字樣、再 2~4 則討論、最後 tag 玩家。
- `WAIT_REPLY` consume 後固定轉 `POST_ANSWER_GLITCH -> NETWORK_ANOMALY -> ADVANCE_NEXT`，不重播舊 prompt。
- autoplay mock reply 依 gateType 生成並直接 consume，避免被 sourceTag 白名單阻擋。
- 新增 sender+gate duplicate guard，防止同 sender 在同 gate 連刷同句。

## Regression guards
- PREHEAT 30 秒內不得出現正式題目。
- 第一題前不得有 system emitter 出題。
- 同 sender 同 gate 不得連續同句。
- autoplay enabled 必須推進到 ADVANCE_NEXT。
- 每次玩家輸入都必寫 lastReplyEval。
- WAIT_REPLY gateType 不可為 none。
- debug flag 不得影響正式 flow state。
