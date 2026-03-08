# PR Notes - Sandbox NIGHT_01 P0+P1 Integration

## 修改原因
- 上輪 audit 指出 NIGHT_01 存在雙軌 gate（App phase gate vs sandbox flow）與 autoplay mock/judge 類型不匹配，導致暖場與 WAIT_REPLY 卡死。

## 影響的系統 state
- `sandboxFlow`: 新增 `gateType/canReply/allowNaturalChat/autoplayMockOnWait/introElapsedMs/nextBeatAt`。
- flow steps 新增 warmup/anomaly 節點：`WARMUP_TAG/WARMUP_WAIT_REPLY/REVEAL_1_RIOT/POST_ANSWER_GLITCH_1/NETWORK_ANOMALY_1`。
- `lastReplyEval`: 維持每次輸入必寫，並改由 flow gateType 對齊判定。

## Regression guard
- 已新增（程式內 guard + flow table 規格）:
  1. PREHEAT 30 秒內不進正式 TAG_PLAYER_1
  2. PREHEAT 允許合法聊天室演出 sourceTag
  3. WAIT_REPLY 必有非 none gateType
  4. autoplay 開啟時可推進至 `ADVANCE_NEXT`
  5. debug flag 不直接改 flow state

## 備註
- classic mode 無修改。
