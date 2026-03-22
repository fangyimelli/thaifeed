# Sandbox / Shared Chat Writer Workspace

This document is generated from `src/content/chat-content/editable/sandbox-chat-writer-workspace.json`. Edit the workspace JSON for creative planning, then sync approved rewrites into the editable drafts before import.

## Import boundary

- Writer workspace is planning-only metadata and proposal storage.
- Runtime import still reads `sandbox-chat-draft.json` / `shared-chat-draft.json`, never this workspace file.
- Preserve all listed tokens, flow order hints, and UI limits when drafting rewrites.

## Totals

- totalEditableEntries: 27
- sandboxEditableEntries: 19
- sharedEditableEntries: 8

## Batch grouping

### sandbox_preheat

- Trigger window: Sandbox 進房暖場到正式點名玩家之前，聊天室先自行堆疊氣氛的時段。
- Player activity: 玩家剛進入直播，還沒被正式點名回答，只是在觀察聊天室與房間氣氛。
- Tone function: 建立直播聊天室感與鬼屋感，讓觀眾發言像真實聊天室而不是系統說明。
- Must keep tokens: @activeUser, {sandboxVipHandle}
- Length caution: 全部都應該是短句；加入/暖場訊息過長會拖慢前 30 秒節奏，也會讓聊天室看起來不像真人。
- Keys: `sandbox.preheat.1`, `sandbox.preheat.2`, `sandbox.preheat.3`, `sandbox.preheat.4`, `sandbox.preheat.5`, `sandbox.preheat.6`, `sandbox.preheat.7`, `sandbox.preheat.8`, `sandbox.preheat.9`

### sandbox_prompt_and_help

- Trigger window: Sandbox 正式點名發問與玩家求助時；玩家已經被拉進回答流程。
- Player activity: 玩家正在看提示字、準備回答子音，或因為不會答而求助。
- Tone function: 清楚提示下一步，同時維持直播聊天室口吻，不讓文字太像純 UI。
- Must keep tokens: @activeUser, {index}, {consonant}, {imageMemoryHint}
- Length caution: 這批是操作性文字，太長會影響可讀性與答題節奏；應避免兩句以上。
- Keys: `sandbox.prompt.reveal_prompt`, `sandbox.hint.help_memory`, `sandbox.hint.help_fallback`

### sandbox_vip_summary

- Trigger window: 玩家完成某段回答後，VIP 用總結句把流程往下一個確認點推進。
- Player activity: 玩家剛答完上一個點，正在被引導進入下一個步驟（記單字、確認發音、確認指涉）。
- Tone function: 像 VIP 幫聊天室整理目前進度，兼具敘事收束與下一步提示。
- Must keep tokens: none
- Length caution: VIP summary 必須是單句、節奏緊；太長會拖慢 reveal 後接續流程。
- Keys: `sandbox.vip_summary.1`, `sandbox.vip_summary.2`

### sandbox_glitch

- Trigger window: 玩家答案剛送出、系統正在評估時，聊天室同時冒出像延遲/故障的抱怨聲。
- Player activity: 玩家剛按送出，正在等待系統判定，會看到聊天室短暫出現卡頓感。
- Tone function: 製造壓力與失真感，像整個直播現場一起抖了一下。
- Must keep tokens: none
- Length caution: 必須極短，像瞬間刷出的抱怨；太長會失去「glitch burst」節奏。
- Keys: `sandbox.glitch.answer_eval.1`, `sandbox.glitch.answer_eval.2`, `sandbox.glitch.answer_eval.3`

### sandbox_tag_question

- Trigger window: 每一題正式點名玩家回答時。
- Player activity: 玩家被 @ 點名，知道現在輪到自己直接回答。
- Tone function: 清楚標示「第幾題、現在回答」，兼具直播 tag 感與任務提示。
- Must keep tokens: @activeUser, {index}
- Length caution: 要短到玩家一眼看懂；太長會讓題號與指令被淹沒。
- Keys: `sandbox.prompt.tag_question`

### sandbox_debug_text

- Trigger window: Debug / smoke test 需要模擬暖場回覆時。
- Player activity: 一般玩家不會主動看到；主要在測試流程或 debug 工具裡被注入。
- Tone function: 純測試用途，提供穩定、容易辨識的基準字串。
- Must keep tokens: none
- Length caution: 越短越好；這不是創意文案主戰場。
- Keys: `sandbox.debug.warmup_reply`

### shared_ui_text

- Trigger window: ChatPanel 輸入框、送出按鈕、跳到最新、置頂缺失提示等共用 UI 表面。
- Player activity: 玩家在打字、送訊息、跳到最新、查看 pinned 狀態。
- Tone function: 維持清楚可用的 UI 微文案；不搶戲，但要和整體直播介面一致。
- Must keep tokens: none
- Length caution: 多數必須極短，否則會擠壓按鈕/標籤空間。
- Keys: `ui.chat.placeholder`, `ui.chat.send.initializing`, `ui.chat.send.sending`, `ui.chat.send.ready`, `ui.chat.latest.default`, `ui.chat.latest.mention`, `ui.chat.pinned.missing_source`, `ui.chat.pinned.highlight_only`

