# Sandbox NIGHT_01 Flow Table（SSOT）

> NIGHT_01 單一路徑（以 state/gateType 決策，不以畫面文案判斷）

| State | canReply | gateType | emitter | autoplay mock | 說明 | on success |
|---|---|---|---|---|---|---|
| PREJOIN | false | none | system_ui（僅狀態） | no | 進場前 | PREHEAT_CHAT |
| PREHEAT_CHAT (`PREHEAT`) | false | none | viewer / mod / vip + preheat join | no | 30 秒自然聊天室（禁止 system 出題） | INTRO_CHAT_RIOT |
| INTRO_CHAT_RIOT (`WARMUP_TAG`) | false | none | flow transition only | no | 轉入 reveal 節奏 | REVEAL_1 |
| REVEAL_1 (`REVEAL_1_RIOT`) | false | none | viewer / vip | no | 先發現畫面→2~4 則混亂討論 | CHAT_RIOT |
| CHAT_RIOT (`TAG_PLAYER_1`) | false | none | mod_live（tag 玩家） | no | 第一題唯一正式 emitter：聊天室角色 tag 玩家 | WAIT_REPLY_1 |
| WAIT_REPLY_1 | true | consonant_guess | player | yes | consume reply 並寫 lastReplyEval | POST_ANSWER_GLITCH |
| POST_ANSWER_GLITCH | false | none | mod/viewer glitch chat | no | 玩家答後進 glitch 討論 | NETWORK_ANOMALY |
| NETWORK_ANOMALY | false | none | flow transition only | no | 進 anomaly 後不可回播舊 prompt | ADVANCE_NEXT |
| ADVANCE_NEXT | false | none | flow transition only | no | 推進下一題 | 下一輪 |

## Hard Guards
1. PREHEAT_CHAT 30 秒內不得出現正式題目 emitter。
2. NIGHT_01 第一題前不得有 system 出題/要求玩家回答。
3. 同 sender 在同 gate 不得連續相同句重複超過 1 次（第二次即擋）。
4. `autoplayNightEnabled=true` 時，WAIT_REPLY mock 必須依 gateType 生成且流程可達 `ADVANCE_NEXT`。
5. 每次玩家輸入（consume 成功/失敗）都必須寫 `lastReplyEval`。
6. WAIT_REPLY 必有 `gateType !== none`。
7. debug flag 為 non-authoritative，不得影響正式 flow state。
8. UI/debug panel 必須顯示 `state / gateType / canReply / lastReplyEval`。
