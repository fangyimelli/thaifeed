# Sandbox NIGHT_01 Flow Table（SSOT）

| State | canReply | gateType | autoplay mock | natural chat | timeout | on success |
|---|---|---|---|---|---|---|
| PREJOIN | false | none | no | no | 等玩家進場 | PREHEAT |
| PREHEAT_CHAT (`PREHEAT`) | false | none | no | yes | 30s 到期 | WARMUP_TAG |
| WARMUP_TAG | false | none | no | no | 發送 tag 後 | WARMUP_WAIT_REPLY |
| WARMUP_WAIT_REPLY | true | warmup_chat_reply | yes | no | 累積 san/backlog | REVEAL_1_RIOT |
| INTRO_IDLE | false | none | no | yes | 下一拍 | REVEAL_1_RIOT |
| REVEAL_1_RIOT | false | none | no | yes | riot 完成 | TAG_PLAYER_1 |
| TAG_PLAYER_1 | false | none | no | no | 發送題目後 | WAIT_REPLY_1 |
| WAIT_REPLY_1 | true | consonant_guess | yes | no | 累積 san/backlog | POST_ANSWER_GLITCH_1 |
| POST_ANSWER_GLITCH_1 | false | none | no | yes | glitch 一拍 | NETWORK_ANOMALY_1 |
| NETWORK_ANOMALY_1 | false | none | no | yes | anomaly 一拍 | ADVANCE_NEXT / FLUSH_TECH_BACKLOG |
| ADVANCE_NEXT | false | none | no | yes | 立即 | 下一題 PREHEAT/REVEAL chain |

## Guards
1. PREHEAT_CHAT 30 秒內不可進 `TAG_PLAYER_1`。
2. PREHEAT_CHAT 必須允許 `sandbox_chat_engine` / `sandbox_preheat_join`。
3. 所有 WAIT_REPLY state 必有明確 `gateType`（非 `none`）。
4. `autoplayNightEnabled=true` 時可自動推進到 `ADVANCE_NEXT`。
5. 每次玩家輸入都寫入 `lastReplyEval`。
6. debug flag 為 non-authoritative，不得改正式 flow state。
7. UI `canReply/gateType` 與 consume 條件一致（同讀 `sandboxFlow`）。
