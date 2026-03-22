# Sandbox / Shared Message Review Packet

This document is generated for per-message review only. It does **not** sync or import rewrites into runtime content. Approved changes should still go through `workspace -> draft sync -> import` after review.

## Review boundary

- Scope: sandbox mode + shared content layer only.
- Classic mode remains review-first and is intentionally excluded from this packet.
- When `proposedRewrite` is empty, the review packet shows `(pending rewrite)` so you can review the slot without accidentally treating current text as approved new copy.
- `reviewCandidate` below is for human review readability only; it is not an import source.

## Totals

- total messages in packet: 27
- sandbox messages: 19
- shared messages: 8
- messages with proposed rewrite filled: 0
- messages still pending rewrite: 27

## sandbox_preheat

- Trigger window: Sandbox 進房暖場到正式點名玩家之前，聊天室先自行堆疊氣氛的時段。
- Player activity: 玩家剛進入直播，還沒被正式點名回答，只是在觀察聊天室與房間氣氛。
- Tone function: 建立直播聊天室感與鬼屋感，讓觀眾發言像真實聊天室而不是系統說明。
- Must keep tokens: @activeUser, {sandboxVipHandle}
- Length caution: 全部都應該是短句；加入/暖場訊息過長會拖慢前 30 秒節奏，也會讓聊天室看起來不像真人。

### sandbox_preheat.1 — `sandbox.preheat.1`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / ambient viewer line
- Purpose: 把玩家從空白畫面拉進「已經有人在看、而且大家都在等異常」的氛圍裡。
- Usage context: 一般觀眾在暖場時丟出的第一批閒聊，作用是告訴玩家「這是一個很多人在一起盯直播的現場」。
- Token summary: none
- Suggested length: 6-16 個中文字，單句完成。
- Old copy: `今天怎麼這麼多人一起在線？`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 自然、像真人聊天室第一時間冒出的觀察句；可帶一點「今天人怎麼這麼多」的稀奇感。
- Constraints: 不要寫成旁白或系統公告；不要提到後續答題規則；保持一句內可讀完。
- Writer notes: 可寫成看台人氣、聊天室突然熱鬧、或觀眾覺得今晚很不尋常的開場感。
- Alt ideas: `直播突然很熱鬧`；`這台今晚人也太多了吧`；`怎麼感覺大家都在等什麼`
- Banned patterns: `系統公告口吻`；`直接劇透有鬼`；`提早教玩家怎麼答題`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_preheat.2 — `sandbox.preheat.2`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / system join line
- Purpose: 提供「房間正在變熱」的背景節拍，不是主敘事句。
- Usage context: 系統在暖場期插入的加入聊天室通知，用來撐出真實聊天室有人流進出的節奏。
- Token summary: none
- Suggested length: 固定短句，建議 8-14 字。
- Old copy: `viewer_721 加入聊天室`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像平台系統自動訊息，乾淨、快速、不要有情緒。
- Constraints: 必須維持加入聊天室格式感；不要改成評論句；不宜超過一行。
- Writer notes: 這類句子應像平台通知，不需要過度創作。
- Alt ideas: `某某加入聊天室`；`又有人進來了`
- Banned patterns: `小說旁白語氣`；`情緒化驚嘆`；`加入後再補很多解釋`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_preheat.3 — `sandbox.preheat.3`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / ambient viewer line
- Purpose: 把直播感從「熱鬧」推到「不確定真假、但大家願意繼續看」的狀態。
- Usage context: 暖場中段的觀眾懷疑句，玩家尚未參與互動，只是在看聊天室自己開始懷疑真假。
- Token summary: none
- Suggested length: 10-20 個中文字。
- Old copy: `我有點懷疑這台是真的假的直播…`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像觀眾半信半疑地打字，不要太文學，但可以有一點不安。
- Constraints: 不要直接下結論說是假的或真的；不要搶走 VIP 的權威感；一句半疑問即可。
- Writer notes: 適合保留「真的假的直播」的曖昧感，讓聊天室像真的會有人質疑。
- Alt ideas: `真的假的直播`；`我還在看是不是效果`；`這台到底真不真`
- Banned patterns: `絕對肯定答案`；`長篇分析`；`過度中二台詞`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_preheat.4 — `sandbox.preheat.4`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / VIP line with crown badge
- Purpose: 讓 VIP 看起來像老觀眾／帶風向者，替後面由 VIP 主導的流程鋪路。
- Usage context: VIP 在暖場階段丟出的權威型留言，雖然沒有直接點名玩家，但會帶出「這地方有前例」的可信度。
- Token summary: `{sandboxVipHandle}`
- Suggested length: 10-22 個中文字。
- Old copy: `上次這間真的很多人說看到鬼影。`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 要像熟門熟路的老觀眾，不是尖叫型路人。
- Constraints: 保留 VIP 的老手感，不要改成系統解說；不要提前發問。
- Writer notes: 可以帶「以前也有人看到」的口吻，但不要把恐怖感講死。
- Alt ideas: `以前就有人說這裡怪`；`這間之前就有人回報過`；`老觀眾都知道這裡不單純`
- Banned patterns: `直接命令玩家`；`太像官方公告`；`過度詳細講鬼影設定`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json
- Token details:
  - {sandboxVipHandle}: Resolved sandbox VIP handle. (SANDBOX_VIP.handle)

### sandbox_preheat.5 — `sandbox.preheat.5`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / system join line
- Purpose: 補足暖場節奏，不讓聊天室只剩恐怖句連發。
- Usage context: 第二個加入聊天室節拍，作用仍然是讓畫面維持聊天室持續流動。
- Token summary: none
- Suggested length: 固定短句。
- Old copy: `viewer_823 加入聊天室`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 平台通知感，極簡即可。
- Constraints: 維持 join 類型，不要塞情緒或教學。
- Writer notes: 和 `sandbox.preheat.2` 同類，重點是節奏不是內容花樣。
- Alt ideas: `又一位觀眾加入`；`新觀眾加入聊天室`
- Banned patterns: `評論句`；`恐怖敘事`；`多餘標點堆疊`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_preheat.6 — `sandbox.preheat.6`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: warmup_tag
- UI surface: chat feed / VIP mention line
- Purpose: 在不破壞直播口吻的前提下，讓玩家意識到「聊天室開始注意我了」。
- Usage context: VIP 第一次把鏡頭轉向玩家，屬於暖場到互動之間的過渡句。
- Token summary: `@activeUser`, `{sandboxVipHandle}`
- Suggested length: 10-22 個中文字。
- Old copy: `@activeUser 你是第一次看這個台嗎？`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像 VIP 在聊天室 casually cue 玩家，不要像 UI 教學文字。
- Constraints: `@activeUser` 必須保留；不能直接要求回答規則細節；應保留第一次點名的自然感。
- Writer notes: 可帶關心、試探、搭話，不要太兇。這句是玩家被拉進聊天室的入口。
- Alt ideas: `第一次來嗎`；`你之前有看過這台嗎`；`第一次跟到這個直播嗎`
- Banned patterns: `拿掉 @activeUser`；`直接命令答題`；`太長的前情提要`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json
- Token details:
  - @activeUser: Active player handle mention injected at runtime. (separateChatActorState(...).activeUser)
  - {sandboxVipHandle}: Resolved sandbox VIP handle. (SANDBOX_VIP.handle)

### sandbox_preheat.7 — `sandbox.preheat.7`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / ambient viewer line
- Purpose: 把氣氛往「大家開始同時盯著某個不對勁的地方」推進。
- Usage context: 暖場後段的觀眾驚疑句，像有人在畫面邊角看到異常。
- Token summary: none
- Suggested length: 10-18 個中文字。
- Old copy: `剛剛鏡頭邊緣是不是有東西飄過去？`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 短而帶畫面感，像觀眾突然打出來的提醒。
- Constraints: 不要太具體描述怪物；不要比正式 ghost/glitch 段落更激烈。
- Writer notes: 應保留聊天室即時反應感，像有人剛剛真的瞄到什麼。
- Alt ideas: `剛剛邊角是不是動了`；`有人也看到畫面邊緣嗎`；`是不是有東西飄過去`
- Banned patterns: `長篇敘事`；`直接明說鬼出現`；`用太多驚嘆號`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_preheat.8 — `sandbox.preheat.8`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / system join line
- Purpose: 維持聊天室真實流速。
- Usage context: 第三個加入聊天室節拍，作用與其他 join line 相同。
- Token summary: none
- Suggested length: 固定短句。
- Old copy: `viewer_477 加入聊天室`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 平台通知即可。
- Constraints: 不要做成聊天評論。
- Writer notes: 維持系統感，不需加故事。
- Alt ideas: `新的 viewer 加入`；`有人進聊天室了`
- Banned patterns: `敘事化`；`講鬼屋內容`；`超出一行`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_preheat.9 — `sandbox.preheat.9`

- Mode / category: sandbox / sandbox_preheat
- Flow location: PREHEAT_CHAT
- Gate type: none
- UI surface: chat feed / moderator reminder
- Purpose: 收束前面的閒聊，讓聊天室節奏準備進入正式互動段。
- Usage context: 暖場尾聲的 moderator 提醒，像在維持秩序，同時預告等等可能有異常。
- Token summary: none
- Suggested length: 12-24 個中文字。
- Old copy: `先暖場聊天，等等再看後面有沒有異常。`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像版主維持節奏，不是冷冰冰規則面板。
- Constraints: 不要變成完整教學條列；不可提前講出全部玩法；保持聊天室用語。
- Writer notes: 可保留「先暖場、等等看異常」的節奏控制感。
- Alt ideas: `先看一下再說`；`先別洗太快 等等可能有東西`；`先穩住聊天室節奏`
- Banned patterns: `系統條款口吻`；`過度詳細規則`；`完全失去聊天室人味`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

## sandbox_prompt_and_help

- Trigger window: Sandbox 正式點名發問與玩家求助時；玩家已經被拉進回答流程。
- Player activity: 玩家正在看提示字、準備回答子音，或因為不會答而求助。
- Tone function: 清楚提示下一步，同時維持直播聊天室口吻，不讓文字太像純 UI。
- Must keep tokens: @activeUser, {index}, {consonant}, {imageMemoryHint}
- Length caution: 這批是操作性文字，太長會影響可讀性與答題節奏；應避免兩句以上。

### sandbox_prompt_and_help.1 — `sandbox.prompt.reveal_prompt`

- Mode / category: sandbox / sandbox_prompt
- Flow location: WAIT_REPLY_x after REVEAL_WORD
- Gate type: consonant_answer
- UI surface: chat feed / active prompt line
- Purpose: 把畫面上的字和玩家下一步操作明確綁在一起，避免玩家不確定現在要做什麼。
- Usage context: 玩家剛看到閃出的字，聊天室立即丟出要他讀出的提示句。
- Token summary: `{consonant}`
- Suggested length: 8-18 個中文字。
- Old copy: `請讀出剛剛閃過的字：{consonant}`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 直接、清楚、有壓力但不兇；像聊天室主持人在催玩家回答。
- Constraints: `{consonant}` 必須完整保留；不能把「讀出／回答」的功能寫模糊；不要展平成固定字。
- Writer notes: 這句屬於核心提示，重點是功能清晰，不是花俏修辭。可保留一點「剛剛閃過」的鬼屋感。
- Alt ideas: `把剛剛那個字念出來：{consonant}`；`剛才閃過的是 {consonant}，直接回答`；`看到 {consonant} 了嗎？把它讀出來`
- Banned patterns: `刪除 {consonant}`；`把字換成固定答案`；`寫成純旁白`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json
- Token details:
  - {consonant}: Current consonant/prompt character. (nextNode.char / node.char)

### sandbox_prompt_and_help.2 — `sandbox.hint.help_memory`

- Mode / category: sandbox / sandbox_help_hint
- Flow location: WAIT_REPLY_x help request
- Gate type: consonant_answer
- UI surface: chat feed / helper reply line
- Purpose: 在不直接洩漏答案的前提下，給玩家一個可以抓住的圖像記憶鉤子。
- Usage context: 玩家輸入 help/不會/提示後，如果共享記憶提示存在，就用這句把提示回給玩家。
- Token summary: `{imageMemoryHint}`
- Suggested length: 8-18 個中文字。
- Old copy: `想一下{imageMemoryHint}那個。`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像聊天室有人給小提示，不要像課本定義。
- Constraints: `{imageMemoryHint}` 必須保留；不能直接揭曉正解；不宜超長。
- Writer notes: 應該像會讓玩家腦中浮出畫面的聯想，而不是完整教學。
- Alt ideas: `想一下 {imageMemoryHint} 那個畫面`；`先抓 {imageMemoryHint} 這個記憶點`；`你可以從 {imageMemoryHint} 聯想`
- Banned patterns: `刪除 {imageMemoryHint}`；`直接公布答案`；`寫成長篇解釋`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json
- Token details:
  - {imageMemoryHint}: Shared consonant image-memory hint from consonant bank. (CONSONANT_BANK_BY_CHAR.get(currentPrompt.consonant)?.imageMemoryHint)

### sandbox_prompt_and_help.3 — `sandbox.hint.help_fallback`

- Mode / category: sandbox / sandbox_help_hint
- Flow location: WAIT_REPLY_x help request fallback
- Gate type: consonant_answer
- UI surface: chat feed / helper reply line
- Purpose: 讓求助流程不停住，同時維持「再想一下」的推進感。
- Usage context: 玩家求助但沒有 image memory hint 可用時的備援提示。
- Token summary: none
- Suggested length: 8-16 個中文字。
- Old copy: `先想一下圖像記憶那個關鍵字。`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 簡短提醒，不要太空泛，也不要講得像責備玩家。
- Constraints: 不能直接給答案；要維持提示功能；避免過長。
- Writer notes: 可像聊天室有人輕推一下玩家回想，不需帶太多情緒。
- Alt ideas: `先抓那個圖像關鍵字`；`回想一下剛剛看到的提示`；`先從記憶點慢慢想`
- Banned patterns: `直接公布正解`；`責怪玩家`；`太像系統錯誤訊息`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

## sandbox_vip_summary

- Trigger window: 玩家完成某段回答後，VIP 用總結句把流程往下一個確認點推進。
- Player activity: 玩家剛答完上一個點，正在被引導進入下一個步驟（記單字、確認發音、確認指涉）。
- Tone function: 像 VIP 幫聊天室整理目前進度，兼具敘事收束與下一步提示。
- Must keep tokens: none
- Length caution: VIP summary 必須是單句、節奏緊；太長會拖慢 reveal 後接續流程。

### sandbox_vip_summary.1 — `sandbox.vip_summary.1`

- Mode / category: sandbox / sandbox_vip_summary
- Flow location: VIP_SUMMARY_1
- Gate type: none
- UI surface: chat feed / VIP summary line
- Purpose: 替上一段做口語化收束，並把聊天室視線導向下一個「確認發音」步驟。
- Usage context: 第一段 VIP 總結，通常在玩家剛看到或記住單字之後出現。
- Token summary: none
- Suggested length: 16-28 個中文字。
- Old copy: `VIP 總結：先把剛剛那個單字記住，下一步確認發音。`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像老觀眾快速整理重點，不要像任務列表。
- Constraints: 要保留「先記住、下一步確認發音」的流程含義；不要跳步。
- Writer notes: 這句要有「VIP 在帶節奏」的感覺，不要完全失去聊天室口吻。
- Alt ideas: `先記住剛剛那個詞，等下要確認發音`；`剛那個單字先別忘，下一步看發音`；`先把那個字詞記住，接著確認怎麼念`
- Banned patterns: `把流程順序改掉`；`過度正式教案語氣`；`拉太長成兩句`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_vip_summary.2 — `sandbox.vip_summary.2`

- Mode / category: sandbox / sandbox_vip_summary
- Flow location: VIP_SUMMARY_2
- Gate type: none
- UI surface: chat feed / VIP summary line
- Purpose: 收斂前一步結果並指向最後確認題，不讓玩家對下一步產生落差。
- Usage context: 第二段 VIP 總結，發音已差不多，接著把流程帶到「確認這個詞指誰／指什麼」。
- Token summary: none
- Suggested length: 18-30 個中文字。
- Old copy: `VIP 總結：發音方向差不多了，最後確認這個詞在指誰。`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像熟手觀眾在聊天室做快速口語引導。
- Constraints: 要保留「發音差不多了 -> 最後確認指涉」的順序；不能把任務意義寫反。
- Writer notes: 這句可以比第一句多一點收束感，但仍應是單句。
- Alt ideas: `發音差不多了，最後確認這個詞在指誰`；`這邊發音已經接近，剩下確認它指的是誰`；`念法差不多了，最後看這個詞到底指誰`
- Banned patterns: `跳過最後確認`；`寫成系統結算`；`太短以致看不出下一步`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

## sandbox_glitch

- Trigger window: 玩家答案剛送出、系統正在評估時，聊天室同時冒出像延遲/故障的抱怨聲。
- Player activity: 玩家剛按送出，正在等待系統判定，會看到聊天室短暫出現卡頓感。
- Tone function: 製造壓力與失真感，像整個直播現場一起抖了一下。
- Must keep tokens: none
- Length caution: 必須極短，像瞬間刷出的抱怨；太長會失去「glitch burst」節奏。

### sandbox_glitch.1 — `sandbox.glitch.answer_eval.1`

- Mode / category: sandbox / sandbox_glitch
- Flow location: ANSWER_EVAL
- Gate type: none
- UI surface: chat feed / glitch burst line
- Purpose: 讓 ANSWER_EVAL 不只是一個安靜等待，而是聊天室一起出現失真反應。
- Usage context: 答案送出後的第一批 glitch 抱怨句，像普通觀眾先察覺「送出失敗／卡住」。
- Token summary: none
- Suggested length: 6-14 個中文字。
- Old copy: `我這邊送出一直失敗`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像真人抱怨平台卡住，短、急。
- Constraints: 不要寫成系統錯誤碼；不要太完整解釋原因。
- Writer notes: 這批文字的關鍵是「刷一下就過去」的臨場感。
- Alt ideas: `我這邊一直送不出去`；`怎麼一直卡送出`；`剛剛那下是不是沒送到`
- Banned patterns: `長篇錯誤說明`；`技術手冊口吻`；`加入多餘背景`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_glitch.2 — `sandbox.glitch.answer_eval.2`

- Mode / category: sandbox / sandbox_glitch
- Flow location: ANSWER_EVAL
- Gate type: none
- UI surface: chat feed / glitch burst line
- Purpose: 補強「不是只有一個人卡，是整個房間都在失真」的集體感。
- Usage context: 同一波 glitch 中的延遲抱怨，偏向聊天室同步怪怪的感覺。
- Token summary: none
- Suggested length: 6-14 個中文字。
- Old copy: `聊天室是不是延遲了`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像觀眾即時吐槽延遲，不要太戲劇化。
- Constraints: 維持短句；不要重複第一句完全相同語意。
- Writer notes: 可偏「聊天室延遲、同步怪」的方向。
- Alt ideas: `聊天室是不是整個延遲了`；`這裡同步怪怪的`；`是不是整個聊天室卡住`
- Banned patterns: `複製第一句`；`長篇分析網路原因`；`破壞即時感`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### sandbox_glitch.3 — `sandbox.glitch.answer_eval.3`

- Mode / category: sandbox / sandbox_glitch
- Flow location: ANSWER_EVAL
- Gate type: none
- UI surface: chat feed / glitch burst line
- Purpose: 把普通延遲抱怨推近一點「這是不是不只是網路」的邊界。
- Usage context: 第三句 glitch 更像把卡頓感和不安混在一起，像有人覺得網路怪到不像單純 lag。
- Token summary: none
- Suggested length: 8-18 個中文字。
- Old copy: `網路怪怪的，剛剛卡一下`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像觀眾自我安慰地說網路怪，但底下其實有點毛。
- Constraints: 依然要短，不要直接明講超自然。
- Writer notes: 可保留「剛剛卡一下」這種含糊說法，讓人不確定是網路還是別的東西。
- Alt ideas: `剛剛那下卡得有點怪`；`網路怪怪的 但不像普通 lag`；`剛才整個畫面卡得很不對`
- Banned patterns: `直接說鬼在干擾`；`太像 debug log`；`超過兩句`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

## sandbox_tag_question

- Trigger window: 每一題正式點名玩家回答時。
- Player activity: 玩家被 @ 點名，知道現在輪到自己直接回答。
- Tone function: 清楚標示「第幾題、現在回答」，兼具直播 tag 感與任務提示。
- Must keep tokens: @activeUser, {index}
- Length caution: 要短到玩家一眼看懂；太長會讓題號與指令被淹沒。

### sandbox_tag_question.1 — `sandbox.prompt.tag_question`

- Mode / category: sandbox / sandbox_tag_question
- Flow location: TAG_PLAYER_{index}
- Gate type: consonant_answer
- UI surface: chat feed / tagged question line
- Purpose: 是每題進入 wait-reply 的門口，必須讓玩家瞬間知道「輪到我、而且要答子音」。
- Usage context: 每一題開始時對玩家的正式點名句，會顯示題號並提醒直接回答看到的子音。
- Token summary: `@activeUser`, `{index}`
- Suggested length: 12-24 個中文字。
- Old copy: `@{activeUser} 第 {index} 題，請直接回答你看到的子音。`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 像直播聊天室內的主持/老觀眾 cue 玩家，不是遊戲 HUD。
- Constraints: `@activeUser` 與 `{index}` 必須保留；題號與「直接回答」功能不能消失。
- Writer notes: 這句比 reveal prompt 更像「點名進場」，可以有一點直播主持感。
- Alt ideas: `@activeUser 第 {index} 題，直接回你看到的子音`；`@activeUser 現在是第 {index} 題，看到什麼就直接答`；`@activeUser 第 {index} 題到了，請直接回子音`
- Banned patterns: `拿掉 token`；`把題號隱掉`；`寫得像系統面板指令`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json
- Token details:
  - @activeUser: Active player handle mention injected at runtime. (separateChatActorState(...).activeUser)
  - {index}: Dynamic sandbox tag question number. (parseSandboxTagStepIndex(flow.step))

## sandbox_debug_text

- Trigger window: Debug / smoke test 需要模擬暖場回覆時。
- Player activity: 一般玩家不會主動看到；主要在測試流程或 debug 工具裡被注入。
- Tone function: 純測試用途，提供穩定、容易辨識的基準字串。
- Must keep tokens: none
- Length caution: 越短越好；這不是創意文案主戰場。

### sandbox_debug_text.1 — `sandbox.debug.warmup_reply`

- Mode / category: sandbox / debug_text
- Flow location: WAIT_WARMUP_REPLY
- Gate type: warmup_tag
- UI surface: debug tools / smoke-test injected player text
- Purpose: 讓測試可以穩定辨識「暖場回覆已送出」，不是要營造劇情。
- Usage context: Night smoke test 或 debug action 在暖場回覆階段注入的固定測試文案。
- Token summary: none
- Suggested length: 4-10 個中文字。
- Old copy: `暖場測試回覆`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 簡潔、固定、可機器辨識。
- Constraints: 不要改到難以辨識；不需要追求氣氛；避免加入動態 token。
- Writer notes: 若要微調，只能做同樣明確的測試標記字串。
- Alt ideas: `暖場回覆測試`；`暖場 smoke reply`；`測試暖場回覆`
- Banned patterns: `過度文學化`；`加入 token`；`寫成真正玩家台詞`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

## shared_ui_text

- Trigger window: ChatPanel 輸入框、送出按鈕、跳到最新、置頂缺失提示等共用 UI 表面。
- Player activity: 玩家在打字、送訊息、跳到最新、查看 pinned 狀態。
- Tone function: 維持清楚可用的 UI 微文案；不搶戲，但要和整體直播介面一致。
- Must keep tokens: none
- Length caution: 多數必須極短，否則會擠壓按鈕/標籤空間。

### shared_ui_text.1 — `ui.chat.placeholder`

- Mode / category: shared / ui_placeholder
- Flow location: global chat input
- Gate type: none
- UI surface: chat input placeholder
- Purpose: 提示玩家可以直接輸入訊息。
- Usage context: 聊天輸入框沒有內容時顯示的 placeholder。
- Token summary: none
- Suggested length: 2-8 個中文字。
- Old copy: `傳送訊息`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 清楚、自然，不需要恐怖感。
- Constraints: 不可過長，否則手機輸入框會顯得擁擠。
- Writer notes: 重點是可用性，不是敘事。
- Alt ideas: `輸入訊息`；`在聊天室說點什麼`；`發一則訊息`
- Banned patterns: `寫成完整句教學`；`過長`；`加入恐怖敘事`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### shared_ui_text.2 — `ui.chat.send.initializing`

- Mode / category: shared / ui_placeholder
- Flow location: chat send button initializing
- Gate type: none
- UI surface: chat send button label
- Purpose: 明確告訴玩家目前仍在初始化。
- Usage context: 聊天室送出按鈕尚未可用時的文字。
- Token summary: none
- Suggested length: 3-8 個中文字。
- Old copy: `初始化中…`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 功能導向。
- Constraints: 要短；不能模糊成一般 loading 狀態。
- Writer notes: 避免加表情或過多標點。
- Alt ideas: `準備中…`；`載入中…`；`初始化中…`
- Banned patterns: `長句`；`恐怖口吻`；`多重標點`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### shared_ui_text.3 — `ui.chat.send.sending`

- Mode / category: shared / ui_placeholder
- Flow location: chat send button sending
- Gate type: none
- UI surface: chat send button label
- Purpose: 給玩家立即回饋，避免重複點擊。
- Usage context: 玩家按下送出後，按鈕短暫顯示的送出中狀態。
- Token summary: none
- Suggested length: 3-8 個中文字。
- Old copy: `送出中…`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 功能導向、即時。
- Constraints: 要短；要看得出正在送出。
- Writer notes: 與 ready/initializing 要明顯區分。
- Alt ideas: `傳送中…`；`送出中…`；`正在送出…`
- Banned patterns: `太像錯誤訊息`；`長句`；`無進行感`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### shared_ui_text.4 — `ui.chat.send.ready`

- Mode / category: shared / ui_placeholder
- Flow location: chat send button ready
- Gate type: none
- UI surface: chat send button label
- Purpose: 提供最直覺的主動作標籤。
- Usage context: 聊天室正常可送出時的按鈕文案。
- Token summary: none
- Suggested length: 1-4 個中文字。
- Old copy: `送出`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 簡潔。
- Constraints: 越短越好。
- Writer notes: 通常保留最常見的 CTA 即可。
- Alt ideas: `送出`；`傳送`；`發送`
- Banned patterns: `超過一行`；`帶情緒語氣`；`教學長句`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### shared_ui_text.5 — `ui.chat.latest.default`

- Mode / category: shared / ui_placeholder
- Flow location: chat latest jump default
- Gate type: none
- UI surface: chat jump-to-latest pill
- Purpose: 幫玩家快速回到最新聊天。
- Usage context: 玩家離開底部時，用來跳到最新訊息的標籤。
- Token summary: none
- Suggested length: 2-8 個中文字。
- Old copy: `最新訊息`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 清楚、UI 感。
- Constraints: 長度受膠囊按鈕限制。
- Writer notes: 可以短到像標籤。
- Alt ideas: `回到最新`；`最新訊息`；`跳到最新`
- Banned patterns: `長句`；`敘事口吻`；`太多符號`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### shared_ui_text.6 — `ui.chat.latest.mention`

- Mode / category: shared / ui_placeholder
- Flow location: chat latest jump mention highlight
- Gate type: none
- UI surface: chat jump-to-latest mention pill
- Purpose: 讓玩家一眼知道最新處有提到自己。
- Usage context: 當最新訊息包含對玩家的 mention 時，跳到最新按鈕顯示的強化版本。
- Token summary: none
- Suggested length: 4-10 個中文字。
- Old copy: `@你・跳到最新`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 比 default 多一點提醒感，但仍要像 UI。
- Constraints: 不可過長；最好保留 mention 感。
- Writer notes: 可以保留 @你 類型的即時提醒。
- Alt ideas: `@你・跳到最新`；`有人 @你`；`@你 在最新訊息`
- Banned patterns: `太長`；`失去 mention 感`；`小說化`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### shared_ui_text.7 — `ui.chat.pinned.missing_source`

- Mode / category: shared / fallback
- Flow location: pinned source missing
- Gate type: none
- UI surface: pinned reference fallback text
- Purpose: 避免 pinned 區域空白或讓玩家誤會 UI 壞掉。
- Usage context: 置頂訊息參照不到原始來源時顯示的 fallback。
- Token summary: none
- Suggested length: 6-14 個中文字。
- Old copy: `（原始訊息已不存在）`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 中性、系統提示感。
- Constraints: 不宜太長；不要像錯誤堆疊。
- Writer notes: 這類文字應低干擾，但要能解釋狀態。
- Alt ideas: `原始訊息不存在`；`找不到原始訊息`；`原訊息已消失`
- Banned patterns: `工程錯誤碼`；`太口語的抱怨`；`長篇說明`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

### shared_ui_text.8 — `ui.chat.pinned.highlight_only`

- Mode / category: shared / debug_text
- Flow location: pinned highlight-only state
- Gate type: none
- UI surface: pinned highlight helper text
- Purpose: 幫測試與內部檢查辨識目前只是 highlight，不是正式回覆 gate。
- Usage context: 置頂區只有 highlight 效果、但尚未 armed 成正式可回覆對象時顯示的 debug/說明文字。
- Token summary: none
- Suggested length: 10-22 個中文字。
- Old copy: `（highlight only：未 armed，不能正式回覆）`
- New copy: (pending rewrite)
- Review candidate status: pending_writer_input
- Tone goal: 偏內部說明，但仍需易懂。
- Constraints: 應保留 highlight only / 未 armed / 不能正式回覆 這三層意義；不宜太長。
- Writer notes: 這句雖是 shared UI，但主要給 debug/內部檢查，不必過度美化。
- Alt ideas: `（僅 highlight：尚未 armed，不能正式回覆）`；`（只有高亮，還不能正式回覆）`；`（目前僅高亮提示，未開啟正式回覆）`
- Banned patterns: `移除關鍵狀態資訊`；`寫成一般玩家劇情文案`；`超出一行太多`
- Source of truth: registry
- Import target after approval: src/content/chat-content/editable/authoredChatContent.json

