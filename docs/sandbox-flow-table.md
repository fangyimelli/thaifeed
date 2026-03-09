- v2 runtime boot invariant：進入 `sandbox_story` 即需有 `flow.step=BOOT`、`scheduler.phase=BOOTSTRAP`、`ssot.version` 與完整 root objects；debug panel 僅可讀取 v2 root state，不可用 legacy fallback 偽裝初始化成功。

# sandbox_story v2 flow table (NIGHT_01 MVP)

| State | 玩家可輸入 | Prompt | Reveal | Emitter | 轉移條件 |
|---|---|---|---|---|---|
| BOOT | 否 | 無 | 否 | system | 初始化完成 -> PREHEAT_CHAT |
| PREHEAT_CHAT | 否 | 暖場聊天 | 否 | viewer/vip/mod | 至少 30000ms -> CONSONANT_PROMPT |
| CONSONANT_PROMPT | 否 | 子音題 | 否 | mod | prompt ready -> WAIT_CONSONANT_REPLY |
| WAIT_CONSONANT_REPLY | 是（子音） | 子音題 | 否 | 無 | 判定 correct -> WORD_REVEAL |
| WORD_REVEAL | 否 | 同題 | 是 | system | reveal 完成 -> RIOT_AFTER_REVEAL |
| RIOT_AFTER_REVEAL | 否 | 同題 | 是 | viewer | riot wave done -> VIP_SUMMARY |
| VIP_SUMMARY | 否 | 同題 | 是 | vip | summary done -> THEORY_CHAT |
| THEORY_CHAT | 否 | 理論碎片 | 是 | viewer/mod | theory wave done -> ASK_PLAYER_MEANING |
| ASK_PLAYER_MEANING | 否 | @玩家追問 | 是 | vip/mod | gate armed -> WAIT_PLAYER_MEANING_REPLY |
| WAIT_PLAYER_MEANING_REPLY | 是（推理） | 理論問句 | 是 | 無 | 收到回覆 -> FLUSH_TECH_BACKLOG / ADVANCE_TO_NEXT_QUESTION |
| TECH_BACKLOG_ACCUMULATING | 否 | 等待中 | 是 | 無 | 每30秒累積2則，最多8則 |
| FLUSH_TECH_BACKLOG | 否 | 無 | 是 | mod(system) | 玩家回覆後一次 flush -> ADVANCE_TO_NEXT_QUESTION |
| ADVANCE_TO_NEXT_QUESTION | 否 | 無 | 否 | system | 還有題目 -> CONSONANT_PROMPT |
| REVISIT_THEORY | 是 | revisit 問句 | 依題目 | vip/mod | 回答命中分類或達上限 -> ADVANCE |
| NIGHT_ENDING | 否 | 最終警告 | 是 | vip/viewer/system | 第10題結束腳本 |
| NIGHT_COLLAPSE | 否 | 無 | 是 | system | 崩壞演出完成 |
| FINAL_MESSAGE | 否 | อย่าหัน | 是 | system | 黑屏結束 |

> 規則：未 reveal 不得 riot；未 currentPrompt 不得 ask-player；未 armed gate 不得要求玩家回答。

## sandbox v2 debug/runtime initial shape（guard）

- currentPrompt: `{ id:'-', consonant:'-', wordKey:'-' }`（由 prompt.current 安全投影）
- reveal: `visible/phase/doneAt/wordKey/durationMs` 皆有預設值
- replyGate: `type/armed/sourceMessageId/targetActor/canReply/sourceType/consumePolicy`
- lastReplyEval: `messageId/gateType/consumed/reason/rawInput/normalizedInput/extractedAnswer`
- techBacklog: `queued/pending/lastDrainAt`
- theory: `active/nodeId/promptId`
- blockedReason: 缺值回退 `'-'`
- transitions: 永遠為 array（預設 `[]`，UI 顯示最近 20 筆）

> 設計原則：debug 只輔助，不可阻斷 runtime；hydration 未完成時一律可安全 render。
