# PR Notes - Sandbox NIGHT_01 Q1 WAIT_REPLY full refactor

## 修改原因
- NIGHT_01 第一題在 WAIT_REPLY 存在雙軌輸出（正式提問/glitch/retry 混線）、同句重刷與 autoplay gate mismatch，導致 bot loop 感與卡關。

## 本次變更
- 先更新 flow table，建立 Q1 唯一路徑與 WAIT_REPLY contract。
- `sandboxFlow` 新增 emitter role / retry / dedupe / unresolvedBehavior 欄位，作為 SSOT。
- `TAG_PLAYER_1` 僅 `mod_live` 正式提問；WAIT_REPLY_1 由 viewer pool 發 glitch，VIP retry 最多一次（有 cooldown、變體文案）。
- `POST_ANSWER_GLITCH_1` 改為多 viewer 分散發話，移除 questionEmitter 發 glitch。
- 新增 guard：system 正式出題阻擋、questionEmitter 不得發 glitch、sender dedupe window、sender cooldown。
- debug panel 顯示 `state/gateType/canReply/lastReplyEval/retryCount/activeSpeakerRoles`，並標示 debug flags no formal impact。

## 影響的系統 state
- `PREHEAT`, `REVEAL_1_RIOT`, `TAG_PLAYER_1`, `WAIT_REPLY_1`, `POST_ANSWER_GLITCH_1`, `NETWORK_ANOMALY_1`, `ADVANCE_NEXT`

## Regression guard
- 已新增（runtime invariant / blocker）並對齊 flow table 11 條 hard guards。
