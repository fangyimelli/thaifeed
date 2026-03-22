# Classic Flow Message Review Packet

This document is generated for **flow-first classic review**. It is for human review only, follows player-facing step order, and must **not** be used as an import source.

## Review boundary

- Classic mode remains review-first.
- Importability for every classic entry is locked to `classic review-only / not importable`.
- Step grouping comes from `classicFlowDefinition.ts` + `classicContentMap.ts`; this packet does not redefine runtime ownership.
- Runtime wrappers are shown explicitly when present or when a step depends on them, but they remain non-editable runtime/inferred references.

## Purpose split

- `docs/classic-flow-message-review.md`: flow/player-experience-first packet.
- `docs/classic-message-review.md`: source/category-first packet.

## Totals

- classic draft entries: 130
- classic runtime wrapper entries: 10
- classic editable entries: 0
- import boundary: classic review-only / not importable

## EVENT_OPENER

- stepId: EVENT_OPENER
- stepPurpose: Classic event opens with a directed tagged line before reactions or QnA.
- canReply: no
- gateType: event_gate
- allowedCategories: event_dialog
- primaryCategory: event_dialog
- optionalCategories: none
- runtimeSelectionPolicy: variant_pool
- playerExperienceSummary: 玩家通常先看到事件開場白，以被點名或被針對的方式進入事件主題。主聲音是 NPC / 系統導向的事件台詞，目的是立刻建立情境與壓力。
- reviewNotesForStep: 最不能破壞的是事件鉤子、被點名感與短聊天節奏；若 opener 不清楚，後續 reaction / QnA 會失去上下文。
- sourceFilesInStep: src/core/events/eventDialogs.ts
- stepEntryCount: 15
- stepStatuses: active
- categoryOwnershipSummary:
  - event_dialog: mode_specific / active / allowedStepIds=EVENT_OPENER
- runtimeWrapperVisibility: no inferred wrapper is primary for this step.

### Review framing

- 玩家通常看到什麼：玩家通常先看到事件開場白，以被點名或被針對的方式進入事件主題。主聲音是 NPC / 系統導向的事件台詞，目的是立刻建立情境與壓力。
- 主要聲音：事件 / NPC / 系統事件台詞
- 體驗目的：Classic event opener / follow-up line.
- 最不能破壞：最不能破壞的是事件鉤子、被點名感與短聊天節奏；若 opener 不清楚，後續 reaction / QnA 會失去上下文。

### Message entries

#### classic.event_dialog.fear_challenge.closer

- key: classic.event_dialog.fear_challenge.closer
- category: event_dialog
- currentVariants: @${activeUser} 我先下線一下 你自己小心, @${activeUser} 我撐不住了 我先退, @${activeUser} 我先離開一下 你別單看太久, @${activeUser} 我先關掉一會 你撐住
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.FEAR_CHALLENGE.closer
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: FEAR_CHALLENGE
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.fear_challenge.followUp

- key: classic.event_dialog.fear_challenge.followUp
- category: event_dialog
- currentVariants: @${activeUser} 你剛剛說不怕我有聽到, @${activeUser} 那你再盯住這裡, @${activeUser} 我看你真的很敢, @${activeUser} 你先不要眨眼, @${activeUser} 等下別突然關掉喔, @${activeUser} 我們再撐一下
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.FEAR_CHALLENGE.followUp
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: FEAR_CHALLENGE
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.fear_challenge.opener

- key: classic.event_dialog.fear_challenge.opener
- category: event_dialog
- currentVariants: @${activeUser} 你現在真的不怕嗎, @${activeUser} 你敢說你現在很穩嗎, @${activeUser} 你心跳有加快嗎, @${activeUser} 你敢不敢再看一分鐘, @${activeUser} 你現在還能撐住嗎, @${activeUser} 你真的不會怕嗎, @${activeUser} 你要不要先深呼吸, @${activeUser} 你看起來有點硬撐耶
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.FEAR_CHALLENGE.opener
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: FEAR_CHALLENGE
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.ghost_ping.followUp

- key: classic.event_dialog.ghost_ping.followUp
- category: event_dialog
- currentVariants: @${activeUser} 你剛剛有聽到我說話嗎, @${activeUser} 我剛剛到底講了什麼, @${activeUser} 我聽到的聲音不像我自己, @${activeUser} 你那邊聽起來正常嗎, @${activeUser} 這一段我整個不敢回頭, @${activeUser} 你有聽到第二個聲音嗎
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.GHOST_PING.followUp
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: GHOST_PING
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.ghost_ping.opener

- key: classic.event_dialog.ghost_ping.opener
- category: event_dialog
- currentVariants: @${activeUser} 你還在嗎, @${activeUser} 你有在看嗎, @${activeUser} 你現在有聽到我嗎, @${activeUser} 你是不是離開螢幕了, @${activeUser} 你回我一下好嗎, @${activeUser} 你在不在聊天室, @${activeUser} 你有沒有看到這裡, @${activeUser} 你現在是靜音嗎
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.GHOST_PING.opener
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: GHOST_PING
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.light_glitch.followUp

- key: classic.event_dialog.light_glitch.followUp
- category: event_dialog
- currentVariants: @${activeUser} 我真的不想在這時候停電, @${activeUser} 你有看到它又閃一下嗎, @${activeUser} 這種光線我超不安, @${activeUser} 燈一跳我心跳就跟著跳, @${activeUser} 感覺有人在旁邊看著, @${activeUser} 你先別離開畫面
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.LIGHT_GLITCH.followUp
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: LIGHT_GLITCH
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.light_glitch.opener

- key: classic.event_dialog.light_glitch.opener
- category: event_dialog
- currentVariants: @${activeUser} 你看燈是不是又閃了, @${activeUser} 那盞燈剛剛抖一下, @${activeUser} 你有看到亮度在跳嗎, @${activeUser} 那個燈真的很不穩, @${activeUser} 你那邊也看到忽明忽暗嗎, @${activeUser} 我覺得有人在碰開關, @${activeUser} 你盯一下那個燈, @${activeUser} 這燈光變化太怪了吧
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.LIGHT_GLITCH.opener
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: LIGHT_GLITCH
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.name_call.followUp

- key: classic.event_dialog.name_call.followUp
- category: event_dialog
- currentVariants: @${activeUser} 那聲音離你超近, @${activeUser} 我不確定那是不是人聲, @${activeUser} 你先別回頭, @${activeUser} 我耳朵直接麻掉, @${activeUser} 我剛剛真的有聽到你名字, @${activeUser} 你有沒有聽見第二次
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.NAME_CALL.followUp
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: NAME_CALL
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.name_call.opener

- key: classic.event_dialog.name_call.opener
- category: event_dialog
- currentVariants: @${activeUser} 剛剛有人叫你名字嗎, @${activeUser} 你有聽到有人喊你嗎, @${activeUser} 我好像聽到有人叫你, @${activeUser} 你名字剛剛是不是被叫了, @${activeUser} 聊天室有人聽到叫名嗎, @${activeUser} 你剛剛有回頭嗎, @${activeUser} 我怎麼聽到有人喊你, @${activeUser} 你那邊是不是也聽到了
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.NAME_CALL.opener
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: NAME_CALL
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.tv_event.followUp

- key: classic.event_dialog.tv_event.followUp
- category: event_dialog
- currentVariants: @${activeUser} 你真的沒看到我嗎, @${activeUser} 我剛剛就在你後面耶, @${activeUser} 你不要嚇我說你沒看見, @${activeUser} 我剛剛真的看到有影子, @${activeUser} 你再看一次拜託, @${activeUser} 這樣我更不敢看了
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.TV_EVENT.followUp
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: TV_EVENT
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.tv_event.opener

- key: classic.event_dialog.tv_event.opener
- category: event_dialog
- currentVariants: @${activeUser} 你有看到畫面抖一下嗎, @${activeUser} 你剛剛有看到亮一下嗎, @${activeUser} 你那邊畫面有跳嗎, @${activeUser} 你看電視是不是動了一下, @${activeUser} 你有沒有看到那個閃動, @${activeUser} 你那邊畫面有怪怪的嗎, @${activeUser} 你是不是也看到它在動, @${activeUser} 你剛那下有看到吧
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.TV_EVENT.opener
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: TV_EVENT
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.viewer_spike.followUp

- key: classic.event_dialog.viewer_spike.followUp
- category: event_dialog
- currentVariants: @${activeUser} 這波人潮有點不對勁, @${activeUser} 我心裡反而更毛了, @${activeUser} 大家好像都在等什麼, @${activeUser} 這時候暴增很怪耶, @${activeUser} 你有看到彈幕忽然變快嗎, @${activeUser} 我感覺有人在靠近
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.VIEWER_SPIKE.followUp
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VIEWER_SPIKE
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.viewer_spike.opener

- key: classic.event_dialog.viewer_spike.opener
- category: event_dialog
- currentVariants: @${activeUser} 你看人數是不是突然跳了, @${activeUser} 人數剛剛衝上去你有看到嗎, @${activeUser} 你那邊人數也暴增嗎, @${activeUser} 聊天室剛剛突然塞滿了耶, @${activeUser} 你看一下人數欄好怪, @${activeUser} 你有發現人數在跳嗎, @${activeUser} 這波人數上升太快了吧, @${activeUser} 人怎麼突然湧進來了
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.VIEWER_SPIKE.opener
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VIEWER_SPIKE
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.voice_confirm.followUp

- key: classic.event_dialog.voice_confirm.followUp
- category: event_dialog
- currentVariants: @${activeUser} 你再聽一下 看還會不會有, @${activeUser} 那聲音你剛剛也有聽到吧, @${activeUser} 不是我在鬧你 剛剛真的有一聲, 不是只有我聽到吧, 那個真的不像風, 我剛剛背直接涼一下
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.VOICE_CONFIRM.followUp
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_dialog.voice_confirm.opener

- key: classic.event_dialog.voice_confirm.opener
- category: event_dialog
- currentVariants: @${activeUser} 你剛剛那一下有聽到嗎, @${activeUser} 你那邊也有一聲嗎, @${activeUser} 你先別講話 再聽一下, @${activeUser} 你耳機裡剛剛是不是有聲音, 等一下 不是只有我聽到吧, 那個不像背景音耶, 不是只有我注意到吧, 剛剛那一下有點怪
- sourceFile: src/core/events/eventDialogs.ts
- sourceSymbol: EVENT_DIALOGS.VOICE_CONFIRM.opener
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: n/a
- questionId: n/a
- tokens: ${activeUser} (Injected active user handle.)
- messagePurpose: Classic directed event opener/follow-up lines.
- tonePack: classic_event_tension
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_OPENER (event_dialog primary; allowed event_dialog) → player-facing message content.
- constraints: Keep player-directed mention wrapper intact. | Stay compatible with short chat bubble pacing. | mention-active-user | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

### Runtime wrapper review

- No dedicated inferred runtime wrapper entry is emitted directly in this step. If the runtime still assembles a closing / abort / resolved line, that behavior remains runtime-owned and non-importable.

## EVENT_REACTION_WINDOW

- stepId: EVENT_REACTION_WINDOW
- stepPurpose: Short reaction burst after event opener or effect.
- canReply: no
- gateType: event_gate
- allowedCategories: event_reaction, ambient_chat
- primaryCategory: event_reaction
- optionalCategories: ambient_chat
- runtimeSelectionPolicy: priority_then_optional
- playerExperienceSummary: 玩家看到的是事件開場後的群眾回應波，可能混入環境聊天、贊助或假 AI 的陪襯聲音，但主聲音仍是觀眾反應。
- reviewNotesForStep: 最不能破壞的是「這是開場後的反應窗」而不是新事件；核心 reaction 要短、快、能補強剛剛發生的事。
- sourceFilesInStep: src/chat/ChatPools.ts, src/core/events/eventReactions.ts
- stepEntryCount: 73
- stepStatuses: active
- categoryOwnershipSummary:
  - event_reaction: mode_specific / active / allowedStepIds=EVENT_REACTION_WINDOW
  - ambient_chat: mode_specific / active / allowedStepIds=EVENT_REACTION_WINDOW, QNA_AWAITING_REPLY, QNA_RESOLVED, QNA_ABORTED, AMBIENT_ONLY
- runtimeWrapperVisibility: no inferred wrapper is primary for this step.

### Review framing

- 玩家通常看到什麼：玩家看到的是事件開場後的群眾回應波，可能混入環境聊天、贊助或假 AI 的陪襯聲音，但主聲音仍是觀眾反應。
- 主要聲音：觀眾反應
- 體驗目的：Crowd reaction burst around event.
- 最不能破壞：最不能破壞的是「這是開場後的反應窗」而不是新事件；核心 reaction 要短、快、能補強剛剛發生的事。

### Message entries

#### classic.persona.caretaker.dread_buildup

- key: classic.persona.caretaker.dread_buildup
- category: ambient_chat
- currentVariants: 這裡壓力真的高
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.idle_boring

- key: classic.persona.caretaker.idle_boring
- category: ambient_chat
- currentVariants: 太緊就先喝口水, 先別硬撐
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.social_reply

- key: classic.persona.caretaker.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.dread_buildup

- key: classic.persona.chaotic.dread_buildup
- category: ambient_chat
- currentVariants: 這氣氛邪到爆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.idle_boring

- key: classic.persona.chaotic.idle_boring
- category: ambient_chat
- currentVariants: 我腦內警報狂叫, 不行我要先尖叫
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.social_reply

- key: classic.persona.chaotic.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我跟你一起崩潰
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.dread_buildup

- key: classic.persona.chill.dread_buildup
- category: ambient_chat
- currentVariants: 安靜到我背脊發涼
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.idle_boring

- key: classic.persona.chill.idle_boring
- category: ambient_chat
- currentVariants: 我先慢慢盯著看, 這氣氛越靜越怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.social_reply

- key: classic.persona.chill.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先別慌 我也在看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.dread_buildup

- key: classic.persona.detective.dread_buildup
- category: ambient_chat
- currentVariants: 像有人從暗處經過
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.idle_boring

- key: classic.persona.detective.idle_boring
- category: ambient_chat
- currentVariants: 先記這個位置, 這裡有可疑陰影
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.social_reply

- key: classic.persona.detective.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你的線索有用
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.dread_buildup

- key: classic.persona.empath.dread_buildup
- category: ambient_chat
- currentVariants: 我知道這裡很壓
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.idle_boring

- key: classic.persona.empath.idle_boring
- category: ambient_chat
- currentVariants: 大家先放慢呼吸, 看不下去就休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.social_reply

- key: classic.persona.empath.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先穩住 我在
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.dread_buildup

- key: classic.persona.foodie.dread_buildup
- category: ambient_chat
- currentVariants: 胃突然縮一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.idle_boring

- key: classic.persona.foodie.idle_boring
- category: ambient_chat
- currentVariants: 我零食差點掉地上, 這氣氛比辣鍋還衝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.social_reply

- key: classic.persona.foodie.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我連水都不敢喝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.dread_buildup

- key: classic.persona.gamer.dread_buildup
- category: ambient_chat
- currentVariants: 感覺要觸發事件
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.idle_boring

- key: classic.persona.gamer.idle_boring
- category: ambient_chat
- currentVariants: 這像王前前搖, 警戒條快滿了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.social_reply

- key: classic.persona.gamer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也覺得是陷阱
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.dread_buildup

- key: classic.persona.hype.dread_buildup
- category: ambient_chat
- currentVariants: 感覺等等要爆開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.idle_boring

- key: classic.persona.hype.idle_boring
- category: ambient_chat
- currentVariants: 欸我現在超清醒, 這氣氛直接拉滿
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.social_reply

- key: classic.persona.hype.social_reply
- category: ambient_chat
- currentVariants: @{tag} 別走 感覺要來了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.dread_buildup

- key: classic.persona.impatient.dread_buildup
- category: ambient_chat
- currentVariants: 別拖 真的快出事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.idle_boring

- key: classic.persona.impatient.idle_boring
- category: ambient_chat
- currentVariants: 快回放剛剛那下, 我想直接看重點
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.social_reply

- key: classic.persona.impatient.social_reply
- category: ambient_chat
- currentVariants: @{tag} 對 就是那裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.dread_buildup

- key: classic.persona.latecomer.dread_buildup
- category: ambient_chat
- currentVariants: 我是不是錯過關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.idle_boring

- key: classic.persona.latecomer.idle_boring
- category: ambient_chat
- currentVariants: 我剛進來就這麼硬, 有人補前情嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.social_reply

- key: classic.persona.latecomer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 可以幫我補一下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.dread_buildup

- key: classic.persona.meme.dread_buildup
- category: ambient_chat
- currentVariants: 這裡很像恐怖梗開場
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.idle_boring

- key: classic.persona.meme.idle_boring
- category: ambient_chat
- currentVariants: 我腦內已經自動配音, 聊天室等下要炸
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.social_reply

- key: classic.persona.meme.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你這句太真了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.dread_buildup

- key: classic.persona.minimalist.dread_buildup
- category: ambient_chat
- currentVariants: 不妙
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.idle_boring

- key: classic.persona.minimalist.idle_boring
- category: ambient_chat
- currentVariants: 怪, 有感
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.social_reply

- key: classic.persona.minimalist.social_reply
- category: ambient_chat
- currentVariants: @{tag} 懂
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.dread_buildup

- key: classic.persona.nervous.dread_buildup
- category: ambient_chat
- currentVariants: 我腦袋一直補畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.idle_boring

- key: classic.persona.nervous.idle_boring
- category: ambient_chat
- currentVariants: 我手心又出汗了, 現在這種沒事最可怕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.social_reply

- key: classic.persona.nervous.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你有看到剛剛那下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.dread_buildup

- key: classic.persona.observer.dread_buildup
- category: ambient_chat
- currentVariants: 前後看起來有落差
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.idle_boring

- key: classic.persona.observer.idle_boring
- category: ambient_chat
- currentVariants: 畫面邊緣有點飄, 亮度剛剛掉一拍
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.social_reply

- key: classic.persona.observer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你講的點有對上
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.dread_buildup

- key: classic.persona.polite.dread_buildup
- category: ambient_chat
- currentVariants: 失禮了 但真的怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.idle_boring

- key: classic.persona.polite.idle_boring
- category: ambient_chat
- currentVariants: 借過我補一句 這裡很冷, 請大家留意右下角
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.social_reply

- key: classic.persona.polite.social_reply
- category: ambient_chat
- currentVariants: @{tag} 感謝提醒 我有看到
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.dread_buildup

- key: classic.persona.quiet.dread_buildup
- category: ambient_chat
- currentVariants: 這裡不太對勁
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.idle_boring

- key: classic.persona.quiet.idle_boring
- category: ambient_chat
- currentVariants: 嗯 我有感, 我會一直看著這裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.social_reply

- key: classic.persona.quiet.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也聽到了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.dread_buildup

- key: classic.persona.skeptical.dread_buildup
- category: ambient_chat
- currentVariants: 這感覺不像單純錯覺
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.idle_boring

- key: classic.persona.skeptical.idle_boring
- category: ambient_chat
- currentVariants: 先不要太快下結論, 我想再看一次
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.social_reply

- key: classic.persona.skeptical.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先看前後反應再說
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.dread_buildup

- key: classic.persona.sleepy.dread_buildup
- category: ambient_chat
- currentVariants: 這下把我嚇醒
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.idle_boring

- key: classic.persona.sleepy.idle_boring
- category: ambient_chat
- currentVariants: 我本來快睡著了, 現在眼睛直接張開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.social_reply

- key: classic.persona.sleepy.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我剛剛也抖一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.dread_buildup

- key: classic.persona.storyteller.dread_buildup
- category: ambient_chat
- currentVariants: 節奏像在等人回頭
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.idle_boring

- key: classic.persona.storyteller.idle_boring
- category: ambient_chat
- currentVariants: 這房間像在憋氣, 畫面像有人貼牆走
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.social_reply

- key: classic.persona.storyteller.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你那句很像前兆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.dread_buildup

- key: classic.persona.troll.dread_buildup
- category: ambient_chat
- currentVariants: 我看等等一定有事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.idle_boring

- key: classic.persona.troll.idle_boring
- category: ambient_chat
- currentVariants: 這鏡頭很會折磨人, 欸這畫面是在釣人吧
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.social_reply

- key: classic.persona.troll.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先深呼吸 不然先關彈幕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.dread_buildup

- key: classic.pool.dread_buildup
- category: ambient_chat
- currentVariants: 我背後開始發涼了, 這感覺越來越不對
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.fear_self_doubt

- key: classic.pool.fear_self_doubt
- category: ambient_chat
- currentVariants: 我是不是自己嚇自己, 越看越懷疑是我腦補
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.FEAR_SELF_DOUBT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.idle_boring

- key: classic.pool.idle_boring
- category: ambient_chat
- currentVariants: 今天這裡就是一直吊著人, 我一直在等下一個動靜
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.scene_flicker_react

- key: classic.pool.scene_flicker_react
- category: ambient_chat
- currentVariants: 亮度變了, 剛剛是不是暗一下, 那個光怪怪的, 我看到閃一下, 那個角落有動, 不是我眼花吧, 是不是燈壞了, 怎麼忽明忽暗, 那個影子怪怪的, 有東西動
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SCENE_FLICKER_REACT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_fan

- key: classic.pool.sfx_react_fan
- category: ambient_chat
- currentVariants: 風扇聲是不是怪怪的, 剛剛風扇聲好像變重了, 你們有沒有覺得聲音不太一樣, 可能我錯覺 但我聽了不舒服, 我戴耳機整個毛起來, 那個聲音忽然壓過來 我好不舒服, 剛剛那陣聲音讓我背脊發緊, 我怎麼聽到一種越靠越近的感覺, 這個嗡嗡聲讓我心裡一直發毛, 你們也有聽到那種悶悶的變化嗎, 那聲音一下輕一下重 我快不敢聽, 我耳機裡那股聲音怪到不行
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FAN
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_footsteps

- key: classic.pool.sfx_react_footsteps
- category: ambient_chat
- currentVariants: 有腳步聲吧, 你們有聽到走路聲嗎, 剛剛那個是踩地板嗎, 好像有人在走, 不是風聲, 那個不是錯覺吧, 我有聽到, 有人走過去, 那聲音靠近了, 好像在旁邊, 不要嚇我, 這太怪了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FOOTSTEPS
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_ghost

- key: classic.pool.sfx_react_ghost
- category: ambient_chat
- currentVariants: 不對勁, 有點怪, 你們有聽到嗎, 那不是我, 我起雞皮疙瘩了, 等一下, 剛剛那個是什麼, 我不敢看了, 有點毛, 那聲音不正常, 你們不要亂講, 我覺得怪怪的, 是不是有人, 這樣不太對, 好像有東西
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_GHOST
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.social_reply

- key: classic.pool.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也有同感, @{tag} 你這句太關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.system_prompt

- key: classic.pool.system_prompt
- category: ambient_chat
- currentVariants: 先穩住, 大家慢慢看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SYSTEM_PROMPT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.system.system_prompt

- key: classic.system.system_prompt
- category: ambient_chat
- currentVariants: 先穩住 這間房的節奏又變了, 大家先別急 我們慢慢盯, 聊天室先安靜一下看畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: SYSTEM_POOLS.system_prompt
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_reaction.footsteps

- key: classic.event_reaction.footsteps
- category: event_reaction
- currentVariants: 腳步聲越來越近了, 我聽到有人在走, 那個節奏超像在靠近, 這下我完全不敢眨眼, 是不是停在門口了, 我雞皮疙瘩整排起來, 這聲音太真了吧, 感覺下一步就進來, 我先把音量調低一點, 別突然衝出來拜託
- sourceFile: src/core/events/eventReactions.ts
- sourceSymbol: EVENT_REACTION_POOL.footsteps
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: FOOTSTEPS
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic crowd reactions after event beats.
- tonePack: classic_crowd_reaction
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_reaction.ghost

- key: classic.event_reaction.ghost
- category: event_reaction
- currentVariants: 我耳朵整個麻掉, 剛剛那聲超近, 我真的不敢回頭了, 這不是錯覺吧, 背後一陣涼, 有人也聽到了嗎, 聊天室先別亂跑, 這波我心跳直接爆掉, 太貼臉了吧, 我手都在抖了
- sourceFile: src/core/events/eventReactions.ts
- sourceSymbol: EVENT_REACTION_POOL.ghost
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: GHOST
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic crowd reactions after event beats.
- tonePack: classic_crowd_reaction
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.event_reaction.light

- key: classic.event_reaction.light
- category: event_reaction
- currentVariants: 燈又跳了 我頭皮發麻, 那個亮暗切換太怪, 我盯著看又閃一下, 這種光線超不舒服, 像有人在摸開關, 畫面整個變得更冷了, 聊天室先別刷太快, 這裡真的越看越毛, 我現在超怕突然全黑, 燈一抖我心也跟著抖
- sourceFile: src/core/events/eventReactions.ts
- sourceSymbol: EVENT_REACTION_POOL.light
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: LIGHT
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic crowd reactions after event beats.
- tonePack: classic_crowd_reaction
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: EVENT_REACTION_WINDOW (event_reaction primary; allowed event_reaction, ambient_chat) → player-facing message content.
- constraints: Keep reactions as short bursts, not long explanations. | burst-short | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

### Runtime wrapper review

- No dedicated inferred runtime wrapper entry is emitted directly in this step. If the runtime still assembles a closing / abort / resolved line, that behavior remains runtime-owned and non-importable.

## QNA_ASKING

- stepId: QNA_ASKING
- stepPurpose: Commit a classic QnA prompt into chat with wrapper metadata.
- canReply: no
- gateType: qna_gate
- allowedCategories: qna_prompt, fake_ai
- primaryCategory: qna_prompt
- optionalCategories: fake_ai
- runtimeSelectionPolicy: runtime_adapter
- playerExperienceSummary: 玩家在這一步會看到題目被正式送進聊天室，常帶有 @taggedUser 與選項包裝。主聲音是題目提示 / 系統引導，有時會被 fake AI 陪襯。
- reviewNotesForStep: 最不能破壞的是提問本體、選項包裝與 tagged-user 結構；這一步定義玩家接下來要回答什麼。
- sourceFilesInStep: src/app/App.tsx, src/content/fakeAI/replies.json, src/game/qna/qnaFlows.ts
- stepEntryCount: 27
- stepStatuses: active, inferred_runtime_wrapper
- categoryOwnershipSummary:
  - qna_prompt: mode_specific / active / allowedStepIds=QNA_ASKING, QNA_AWAITING_REPLY
  - fake_ai: mode_specific / active / allowedStepIds=QNA_ASKING, QNA_RESOLVED, AMBIENT_ONLY
- runtimeWrapperVisibility: related qna prompt wrappers stay visible because this step either emits, reuses, or exits a wrapped classic prompt.

### Review framing

- 玩家通常看到什麼：玩家在這一步會看到題目被正式送進聊天室，常帶有 @taggedUser 與選項包裝。主聲音是題目提示 / 系統引導，有時會被 fake AI 陪襯。
- 主要聲音：題目提示 / 引導
- 體驗目的：Ask current QnA prompt.
- 最不能破壞：最不能破壞的是提問本體、選項包裝與 tagged-user 結構；這一步定義玩家接下來要回答什麼。

### Message entries

#### classic.fake_ai.anchor.corner

- key: classic.fake_ai.anchor.corner
- category: fake_ai
- currentVariants: 角落那邊怎麼那麼暗, 你是不是一直避開看角落, 角落那裡不太對
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.corner.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.door

- key: classic.fake_ai.anchor.door
- category: fake_ai
- currentVariants: 門縫那邊好像有動靜, 不要一直看門那裡, 門後面很暗
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.door.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.under_table

- key: classic.fake_ai.anchor.under_table
- category: fake_ai
- currentVariants: 桌子下面是不是有聲音, 你剛剛是不是往桌子那邊看, 桌子那邊太安靜了, 不要一直盯著桌腳
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.under_table.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.window

- key: classic.fake_ai.anchor.window
- category: fake_ai
- currentVariants: 窗邊的光怪怪的, 你有聽到窗那邊的聲音嗎, 不要靠窗太近
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.window.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.thai_flood

- key: classic.fake_ai.thai_flood
- category: fake_ai
- currentVariants: ฉันกำลังมองคุณอยู่, ฉันอยู่ข้างหลังคุณ, คุณเห็นฉันไหม, ข้างหลัง ข้างหลัง ข้างหลัง, อย่าหันกลับมา, คุณไม่ได้อยู่คนเดียว, ฉันเห็นคุณ, เงาอยู่ตรงนั้น, มันใกล้ขึ้นเรื่อยๆ, คุณแน่ใจเหรอ
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.thaiFlood
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.urban_legend.th

- key: classic.fake_ai.urban_legend.th
- category: fake_ai
- currentVariants: เขาว่ากันว่าที่นี่ไม่ว่าง, เงาไม่เคยหายไป, มันเคยเกิดขึ้นมาก่อน, อย่ามองนานเกินไป
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.urbanLegend_th
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.urban_legend.zh

- key: classic.fake_ai.urban_legend.zh
- category: fake_ai
- currentVariants: 有人說這間老屋的傳聞都從那個位置開始, 你知道嗎 以前有人在這裡失蹤過, 這個地方有個很老的說法
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.urbanLegend_zh
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.fear_challenge_flow.s1.prompt

- key: classic.qna.fear_challenge_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要硬撐還是先退一步？, 要不要先保守一點？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.fear_challenge_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: FEAR_CHALLENGE
- qnaFlowId: fear_challenge_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.fear_challenge_flow.s1.runtime_wrapper

- key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: FEAR_CHALLENGE
- qnaFlowId: fear_challenge_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.ghost_ping_flow.s1.prompt

- key: classic.qna.ghost_ping_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我現在回頭看畫面嗎？, 要不要立刻回看剛剛那一段？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.ghost_ping_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: GHOST_PING
- qnaFlowId: ghost_ping_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.ghost_ping_flow.s1.runtime_wrapper

- key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: GHOST_PING
- qnaFlowId: ghost_ping_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.light_glitch_flow.s1.prompt

- key: classic.qna.light_glitch_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我追一下光源位置嗎？, 要不要先查燈光來源？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.light_glitch_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: LIGHT_GLITCH
- qnaFlowId: light_glitch_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.light_glitch_flow.s1.runtime_wrapper

- key: classic.qna.light_glitch_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: LIGHT_GLITCH
- qnaFlowId: light_glitch_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.name_call_flow.s1.prompt

- key: classic.qna.name_call_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我直接喊回去嗎？, 要不要回應那個叫名聲？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.name_call_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: NAME_CALL
- qnaFlowId: name_call_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.name_call_flow.s1.runtime_wrapper

- key: classic.qna.name_call_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: NAME_CALL
- qnaFlowId: name_call_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s1.prompt

- key: classic.qna.tv_event_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你剛剛有看到螢幕閃爍嗎？, 那一下你有看到畫面閃一下嗎？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.tv_event_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s1.runtime_wrapper

- key: classic.qna.tv_event_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s2.prompt

- key: classic.qna.tv_event_flow.s2.prompt
- category: qna_prompt
- currentVariants: 要不要把燈光異常事件也叫出來？, 要不要連鎖觸發燈光事件？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.tv_event_flow.steps.s2.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s2
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s2.runtime_wrapper

- key: classic.qna.tv_event_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s1.prompt

- key: classic.qna.viewer_spike_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我先穩住聊天室節奏嗎？, 現在先控一下聊天室嗎？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.viewer_spike_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s1.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s2.prompt

- key: classic.qna.viewer_spike_flow.s2.prompt
- category: qna_prompt
- currentVariants: 要順便做恐懼挑戰嗎？, 要不要接續恐懼挑戰事件？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.viewer_spike_flow.steps.s2.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s2
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s2.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.prompt

- key: classic.qna.voice_confirm_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你覺得那聲音是從門邊還是窗邊來的？, 你剛聽到的聲音比較像門口還是窗邊？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.voice_confirm_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s2.prompt

- key: classic.qna.voice_confirm_flow.s2.prompt
- category: qna_prompt
- currentVariants: 你要我先追這條線索嗎？, 這條線索要繼續追嗎？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.voice_confirm_flow.steps.s2.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s2
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → player-facing message content.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s2.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ASKING (qna_prompt primary; allowed qna_prompt, fake_ai) → runtime adapter visibility.
- constraints: Preserve wrapper / option label structure. | keep-options-wrapper | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

### Runtime wrapper review

- wrapper key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.fear_challenge_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.ghost_ping_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.light_glitch_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.light_glitch_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.name_call_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.name_call_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.

## QNA_AWAITING_REPLY

- stepId: QNA_AWAITING_REPLY
- stepPurpose: Classic reply bar is armed and player answer is awaited.
- canReply: yes
- gateType: reply_gate
- allowedCategories: qna_prompt, donate, ambient_chat
- primaryCategory: qna_prompt
- optionalCategories: donate, ambient_chat
- runtimeSelectionPolicy: priority_then_optional
- playerExperienceSummary: 玩家已看到問題並且能回覆。主聲音仍是題目提示，但背景可穿插環境聊天或 donate，以維持聊天室仍在流動。
- reviewNotesForStep: 最不能破壞的是「玩家仍在回答同一題」的專注感；任何陪襯內容都不能蓋過 active QnA prompt。
- sourceFilesInStep: src/app/App.tsx, src/chat/ChatPools.ts, src/content/pools/donatePools.json, src/game/qna/qnaFlows.ts
- stepEntryCount: 100
- stepStatuses: active, inferred_runtime_wrapper
- categoryOwnershipSummary:
  - qna_prompt: mode_specific / active / allowedStepIds=QNA_ASKING, QNA_AWAITING_REPLY
  - donate: mode_specific / active / allowedStepIds=QNA_AWAITING_REPLY, QNA_RESOLVED, AMBIENT_ONLY
  - ambient_chat: mode_specific / active / allowedStepIds=EVENT_REACTION_WINDOW, QNA_AWAITING_REPLY, QNA_RESOLVED, QNA_ABORTED, AMBIENT_ONLY
- runtimeWrapperVisibility: related qna prompt wrappers stay visible because this step either emits, reuses, or exits a wrapped classic prompt.

### Review framing

- 玩家通常看到什麼：玩家已看到問題並且能回覆。主聲音仍是題目提示，但背景可穿插環境聊天或 donate，以維持聊天室仍在流動。
- 主要聲音：題目提示 / 引導
- 體驗目的：Hold player attention while reply gate remains open.
- 最不能破壞：最不能破壞的是「玩家仍在回答同一題」的專注感；任何陪襯內容都不能蓋過 active QnA prompt。

### Message entries

#### classic.persona.caretaker.dread_buildup

- key: classic.persona.caretaker.dread_buildup
- category: ambient_chat
- currentVariants: 這裡壓力真的高
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.idle_boring

- key: classic.persona.caretaker.idle_boring
- category: ambient_chat
- currentVariants: 太緊就先喝口水, 先別硬撐
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.social_reply

- key: classic.persona.caretaker.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.dread_buildup

- key: classic.persona.chaotic.dread_buildup
- category: ambient_chat
- currentVariants: 這氣氛邪到爆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.idle_boring

- key: classic.persona.chaotic.idle_boring
- category: ambient_chat
- currentVariants: 我腦內警報狂叫, 不行我要先尖叫
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.social_reply

- key: classic.persona.chaotic.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我跟你一起崩潰
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.dread_buildup

- key: classic.persona.chill.dread_buildup
- category: ambient_chat
- currentVariants: 安靜到我背脊發涼
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.idle_boring

- key: classic.persona.chill.idle_boring
- category: ambient_chat
- currentVariants: 我先慢慢盯著看, 這氣氛越靜越怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.social_reply

- key: classic.persona.chill.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先別慌 我也在看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.dread_buildup

- key: classic.persona.detective.dread_buildup
- category: ambient_chat
- currentVariants: 像有人從暗處經過
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.idle_boring

- key: classic.persona.detective.idle_boring
- category: ambient_chat
- currentVariants: 先記這個位置, 這裡有可疑陰影
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.social_reply

- key: classic.persona.detective.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你的線索有用
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.dread_buildup

- key: classic.persona.empath.dread_buildup
- category: ambient_chat
- currentVariants: 我知道這裡很壓
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.idle_boring

- key: classic.persona.empath.idle_boring
- category: ambient_chat
- currentVariants: 大家先放慢呼吸, 看不下去就休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.social_reply

- key: classic.persona.empath.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先穩住 我在
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.dread_buildup

- key: classic.persona.foodie.dread_buildup
- category: ambient_chat
- currentVariants: 胃突然縮一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.idle_boring

- key: classic.persona.foodie.idle_boring
- category: ambient_chat
- currentVariants: 我零食差點掉地上, 這氣氛比辣鍋還衝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.social_reply

- key: classic.persona.foodie.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我連水都不敢喝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.dread_buildup

- key: classic.persona.gamer.dread_buildup
- category: ambient_chat
- currentVariants: 感覺要觸發事件
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.idle_boring

- key: classic.persona.gamer.idle_boring
- category: ambient_chat
- currentVariants: 這像王前前搖, 警戒條快滿了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.social_reply

- key: classic.persona.gamer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也覺得是陷阱
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.dread_buildup

- key: classic.persona.hype.dread_buildup
- category: ambient_chat
- currentVariants: 感覺等等要爆開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.idle_boring

- key: classic.persona.hype.idle_boring
- category: ambient_chat
- currentVariants: 欸我現在超清醒, 這氣氛直接拉滿
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.social_reply

- key: classic.persona.hype.social_reply
- category: ambient_chat
- currentVariants: @{tag} 別走 感覺要來了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.dread_buildup

- key: classic.persona.impatient.dread_buildup
- category: ambient_chat
- currentVariants: 別拖 真的快出事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.idle_boring

- key: classic.persona.impatient.idle_boring
- category: ambient_chat
- currentVariants: 快回放剛剛那下, 我想直接看重點
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.social_reply

- key: classic.persona.impatient.social_reply
- category: ambient_chat
- currentVariants: @{tag} 對 就是那裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.dread_buildup

- key: classic.persona.latecomer.dread_buildup
- category: ambient_chat
- currentVariants: 我是不是錯過關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.idle_boring

- key: classic.persona.latecomer.idle_boring
- category: ambient_chat
- currentVariants: 我剛進來就這麼硬, 有人補前情嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.social_reply

- key: classic.persona.latecomer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 可以幫我補一下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.dread_buildup

- key: classic.persona.meme.dread_buildup
- category: ambient_chat
- currentVariants: 這裡很像恐怖梗開場
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.idle_boring

- key: classic.persona.meme.idle_boring
- category: ambient_chat
- currentVariants: 我腦內已經自動配音, 聊天室等下要炸
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.social_reply

- key: classic.persona.meme.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你這句太真了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.dread_buildup

- key: classic.persona.minimalist.dread_buildup
- category: ambient_chat
- currentVariants: 不妙
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.idle_boring

- key: classic.persona.minimalist.idle_boring
- category: ambient_chat
- currentVariants: 怪, 有感
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.social_reply

- key: classic.persona.minimalist.social_reply
- category: ambient_chat
- currentVariants: @{tag} 懂
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.dread_buildup

- key: classic.persona.nervous.dread_buildup
- category: ambient_chat
- currentVariants: 我腦袋一直補畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.idle_boring

- key: classic.persona.nervous.idle_boring
- category: ambient_chat
- currentVariants: 我手心又出汗了, 現在這種沒事最可怕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.social_reply

- key: classic.persona.nervous.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你有看到剛剛那下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.dread_buildup

- key: classic.persona.observer.dread_buildup
- category: ambient_chat
- currentVariants: 前後看起來有落差
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.idle_boring

- key: classic.persona.observer.idle_boring
- category: ambient_chat
- currentVariants: 畫面邊緣有點飄, 亮度剛剛掉一拍
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.social_reply

- key: classic.persona.observer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你講的點有對上
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.dread_buildup

- key: classic.persona.polite.dread_buildup
- category: ambient_chat
- currentVariants: 失禮了 但真的怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.idle_boring

- key: classic.persona.polite.idle_boring
- category: ambient_chat
- currentVariants: 借過我補一句 這裡很冷, 請大家留意右下角
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.social_reply

- key: classic.persona.polite.social_reply
- category: ambient_chat
- currentVariants: @{tag} 感謝提醒 我有看到
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.dread_buildup

- key: classic.persona.quiet.dread_buildup
- category: ambient_chat
- currentVariants: 這裡不太對勁
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.idle_boring

- key: classic.persona.quiet.idle_boring
- category: ambient_chat
- currentVariants: 嗯 我有感, 我會一直看著這裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.social_reply

- key: classic.persona.quiet.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也聽到了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.dread_buildup

- key: classic.persona.skeptical.dread_buildup
- category: ambient_chat
- currentVariants: 這感覺不像單純錯覺
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.idle_boring

- key: classic.persona.skeptical.idle_boring
- category: ambient_chat
- currentVariants: 先不要太快下結論, 我想再看一次
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.social_reply

- key: classic.persona.skeptical.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先看前後反應再說
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.dread_buildup

- key: classic.persona.sleepy.dread_buildup
- category: ambient_chat
- currentVariants: 這下把我嚇醒
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.idle_boring

- key: classic.persona.sleepy.idle_boring
- category: ambient_chat
- currentVariants: 我本來快睡著了, 現在眼睛直接張開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.social_reply

- key: classic.persona.sleepy.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我剛剛也抖一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.dread_buildup

- key: classic.persona.storyteller.dread_buildup
- category: ambient_chat
- currentVariants: 節奏像在等人回頭
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.idle_boring

- key: classic.persona.storyteller.idle_boring
- category: ambient_chat
- currentVariants: 這房間像在憋氣, 畫面像有人貼牆走
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.social_reply

- key: classic.persona.storyteller.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你那句很像前兆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.dread_buildup

- key: classic.persona.troll.dread_buildup
- category: ambient_chat
- currentVariants: 我看等等一定有事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.idle_boring

- key: classic.persona.troll.idle_boring
- category: ambient_chat
- currentVariants: 這鏡頭很會折磨人, 欸這畫面是在釣人吧
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.social_reply

- key: classic.persona.troll.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先深呼吸 不然先關彈幕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.dread_buildup

- key: classic.pool.dread_buildup
- category: ambient_chat
- currentVariants: 我背後開始發涼了, 這感覺越來越不對
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.fear_self_doubt

- key: classic.pool.fear_self_doubt
- category: ambient_chat
- currentVariants: 我是不是自己嚇自己, 越看越懷疑是我腦補
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.FEAR_SELF_DOUBT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.idle_boring

- key: classic.pool.idle_boring
- category: ambient_chat
- currentVariants: 今天這裡就是一直吊著人, 我一直在等下一個動靜
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.scene_flicker_react

- key: classic.pool.scene_flicker_react
- category: ambient_chat
- currentVariants: 亮度變了, 剛剛是不是暗一下, 那個光怪怪的, 我看到閃一下, 那個角落有動, 不是我眼花吧, 是不是燈壞了, 怎麼忽明忽暗, 那個影子怪怪的, 有東西動
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SCENE_FLICKER_REACT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_fan

- key: classic.pool.sfx_react_fan
- category: ambient_chat
- currentVariants: 風扇聲是不是怪怪的, 剛剛風扇聲好像變重了, 你們有沒有覺得聲音不太一樣, 可能我錯覺 但我聽了不舒服, 我戴耳機整個毛起來, 那個聲音忽然壓過來 我好不舒服, 剛剛那陣聲音讓我背脊發緊, 我怎麼聽到一種越靠越近的感覺, 這個嗡嗡聲讓我心裡一直發毛, 你們也有聽到那種悶悶的變化嗎, 那聲音一下輕一下重 我快不敢聽, 我耳機裡那股聲音怪到不行
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FAN
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_footsteps

- key: classic.pool.sfx_react_footsteps
- category: ambient_chat
- currentVariants: 有腳步聲吧, 你們有聽到走路聲嗎, 剛剛那個是踩地板嗎, 好像有人在走, 不是風聲, 那個不是錯覺吧, 我有聽到, 有人走過去, 那聲音靠近了, 好像在旁邊, 不要嚇我, 這太怪了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FOOTSTEPS
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_ghost

- key: classic.pool.sfx_react_ghost
- category: ambient_chat
- currentVariants: 不對勁, 有點怪, 你們有聽到嗎, 那不是我, 我起雞皮疙瘩了, 等一下, 剛剛那個是什麼, 我不敢看了, 有點毛, 那聲音不正常, 你們不要亂講, 我覺得怪怪的, 是不是有人, 這樣不太對, 好像有東西
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_GHOST
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.social_reply

- key: classic.pool.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也有同感, @{tag} 你這句太關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.system_prompt

- key: classic.pool.system_prompt
- category: ambient_chat
- currentVariants: 先穩住, 大家慢慢看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SYSTEM_PROMPT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.system.system_prompt

- key: classic.system.system_prompt
- category: ambient_chat
- currentVariants: 先穩住 這間房的節奏又變了, 大家先別急 我們慢慢盯, 聊天室先安靜一下看畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: SYSTEM_POOLS.system_prompt
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.1

- key: classic.donate.1
- category: donate
- currentText: 很厲害，繼續加油！
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.10

- key: classic.donate.10
- category: donate
- currentText: 收下我的愛心星星。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.2

- key: classic.donate.2
- category: donate
- currentText: 欸 那邊真的亮了一點，整體順很多。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.3

- key: classic.donate.3
- category: donate
- currentText: 聊天室為你感到驕傲。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.4

- key: classic.donate.4
- category: donate
- currentText: 謝謝你沒有放棄。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.5

- key: classic.donate.5
- category: donate
- currentText: 這個節奏必須斗內。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.6

- key: classic.donate.6
- category: donate
- currentText: 超穩，這題答得漂亮。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.7

- key: classic.donate.7
- category: donate
- currentText: 後排送上應援。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.8

- key: classic.donate.8
- category: donate
- currentText: 房間氣氛真的變好了。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.9

- key: classic.donate.9
- category: donate
- currentText: 再撐一下，感覺整個空間會更穩。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.fear_challenge_flow.s1.prompt

- key: classic.qna.fear_challenge_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要硬撐還是先退一步？, 要不要先保守一點？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.fear_challenge_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: FEAR_CHALLENGE
- qnaFlowId: fear_challenge_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.fear_challenge_flow.s1.runtime_wrapper

- key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: FEAR_CHALLENGE
- qnaFlowId: fear_challenge_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.ghost_ping_flow.s1.prompt

- key: classic.qna.ghost_ping_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我現在回頭看畫面嗎？, 要不要立刻回看剛剛那一段？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.ghost_ping_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: GHOST_PING
- qnaFlowId: ghost_ping_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.ghost_ping_flow.s1.runtime_wrapper

- key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: GHOST_PING
- qnaFlowId: ghost_ping_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.light_glitch_flow.s1.prompt

- key: classic.qna.light_glitch_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我追一下光源位置嗎？, 要不要先查燈光來源？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.light_glitch_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: LIGHT_GLITCH
- qnaFlowId: light_glitch_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.light_glitch_flow.s1.runtime_wrapper

- key: classic.qna.light_glitch_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: LIGHT_GLITCH
- qnaFlowId: light_glitch_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.name_call_flow.s1.prompt

- key: classic.qna.name_call_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我直接喊回去嗎？, 要不要回應那個叫名聲？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.name_call_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: NAME_CALL
- qnaFlowId: name_call_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.name_call_flow.s1.runtime_wrapper

- key: classic.qna.name_call_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: NAME_CALL
- qnaFlowId: name_call_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s1.prompt

- key: classic.qna.tv_event_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你剛剛有看到螢幕閃爍嗎？, 那一下你有看到畫面閃一下嗎？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.tv_event_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s1.runtime_wrapper

- key: classic.qna.tv_event_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s2.prompt

- key: classic.qna.tv_event_flow.s2.prompt
- category: qna_prompt
- currentVariants: 要不要把燈光異常事件也叫出來？, 要不要連鎖觸發燈光事件？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.tv_event_flow.steps.s2.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s2
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s2.runtime_wrapper

- key: classic.qna.tv_event_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s1.prompt

- key: classic.qna.viewer_spike_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你要我先穩住聊天室節奏嗎？, 現在先控一下聊天室嗎？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.viewer_spike_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s1.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s2.prompt

- key: classic.qna.viewer_spike_flow.s2.prompt
- category: qna_prompt
- currentVariants: 要順便做恐懼挑戰嗎？, 要不要接續恐懼挑戰事件？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.viewer_spike_flow.steps.s2.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s2
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s2.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.prompt

- key: classic.qna.voice_confirm_flow.s1.prompt
- category: qna_prompt
- currentVariants: 你覺得那聲音是從門邊還是窗邊來的？, 你剛聽到的聲音比較像門口還是窗邊？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.voice_confirm_flow.steps.s1.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s2.prompt

- key: classic.qna.voice_confirm_flow.s2.prompt
- category: qna_prompt
- currentVariants: 你要我先追這條線索嗎？, 這條線索要繼續追嗎？
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.voice_confirm_flow.steps.s2.questionVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s2
- tokens: none
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → player-facing message content.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s2.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_AWAITING_REPLY (qna_prompt primary; allowed qna_prompt, donate, ambient_chat) → runtime adapter visibility.
- constraints: Reply UI remains owned by classic qna authoritative state. | reply-ui-visible | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

### Runtime wrapper review

- wrapper key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.fear_challenge_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.ghost_ping_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.light_glitch_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.light_glitch_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.name_call_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.name_call_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.

## QNA_RETRY_OR_UNKNOWN

- stepId: QNA_RETRY_OR_UNKNOWN
- stepPurpose: Classic retry or unknown/help prompts after invalid or uncertain reply.
- canReply: yes
- gateType: reply_gate
- allowedCategories: qna_retry, qna_unknown
- primaryCategory: qna_retry
- optionalCategories: qna_unknown
- runtimeSelectionPolicy: variant_pool
- playerExperienceSummary: 玩家剛給了模糊、錯誤或需要重試的回答，因此看到 retry / unknown 類的提醒。主聲音是題目提示的糾正或引導。
- reviewNotesForStep: 最不能破壞的是重試導向與問題範圍；文案必須把玩家帶回原題，而不是開新話題。
- sourceFilesInStep: src/app/App.tsx, src/game/qna/qnaFlows.ts
- stepEntryCount: 12
- stepStatuses: active, inferred_runtime_wrapper
- categoryOwnershipSummary:
  - qna_retry: mode_specific / active / allowedStepIds=QNA_RETRY_OR_UNKNOWN
  - qna_unknown: mode_specific / active / allowedStepIds=QNA_RETRY_OR_UNKNOWN
- runtimeWrapperVisibility: related qna prompt wrappers stay visible because this step either emits, reuses, or exits a wrapped classic prompt.

### Review framing

- 玩家通常看到什麼：玩家剛給了模糊、錯誤或需要重試的回答，因此看到 retry / unknown 類的提醒。主聲音是題目提示的糾正或引導。
- 主要聲音：題目提示 / 引導
- 體驗目的：Retry / unknown guidance.
- 最不能破壞：最不能破壞的是重試導向與問題範圍；文案必須把玩家帶回原題，而不是開新話題。

### Message entries

#### classic.qna.fear_challenge_flow.s1.runtime_wrapper

- key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: FEAR_CHALLENGE
- qnaFlowId: fear_challenge_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.ghost_ping_flow.s1.runtime_wrapper

- key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: GHOST_PING
- qnaFlowId: ghost_ping_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.light_glitch_flow.s1.runtime_wrapper

- key: classic.qna.light_glitch_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: LIGHT_GLITCH
- qnaFlowId: light_glitch_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.name_call_flow.s1.runtime_wrapper

- key: classic.qna.name_call_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: NAME_CALL
- qnaFlowId: name_call_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s1.runtime_wrapper

- key: classic.qna.tv_event_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s2.runtime_wrapper

- key: classic.qna.tv_event_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s1.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s2.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s2.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → runtime adapter visibility.
- constraints: Do not leave the current question scope. | stay-on-question | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.retry

- key: classic.qna.voice_confirm_flow.s1.retry
- category: qna_retry
- currentVariants: 再選一次：門邊 或 窗邊。
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.voice_confirm_flow.steps.s1.retryPromptVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic retry prompt variants.
- tonePack: classic_qna_retry
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → player-facing message content.
- constraints: Do not leave the current question scope. | stay-on-question | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.unknown

- key: classic.qna.voice_confirm_flow.s1.unknown
- category: qna_unknown
- currentVariants: 先不用急，想一下聲音比較靠哪邊。
- sourceFile: src/game/qna/qnaFlows.ts
- sourceSymbol: QNA_FLOWS.voice_confirm_flow.steps.s1.unknownPromptVariants
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: none
- messagePurpose: Classic unknown/help prompt variants.
- tonePack: classic_qna_retry
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RETRY_OR_UNKNOWN (qna_retry primary; allowed qna_retry, qna_unknown) → player-facing message content.
- constraints: Do not leave the current question scope. | stay-on-question | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

### Runtime wrapper review

- wrapper key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.fear_challenge_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.ghost_ping_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.light_glitch_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.light_glitch_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.name_call_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.name_call_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.

## QNA_RESOLVED

- stepId: QNA_RESOLVED
- stepPurpose: Classic QnA resolved successfully and reply gate closes.
- canReply: no
- gateType: qna_gate
- allowedCategories: ambient_chat, fake_ai, donate
- primaryCategory: ambient_chat
- optionalCategories: fake_ai, donate
- runtimeSelectionPolicy: priority_then_optional
- playerExperienceSummary: 玩家完成回答後，聊天室回到收束與放鬆狀態。主聲音多半回到觀眾 / 環境 / donate / fake AI 的後續餘波，而不是正式題目提示。
- reviewNotesForStep: 最不能破壞的是「題目已結束」的感受；不得讓玩家誤以為 reply gate 仍然開著。若目前只有 wrapper-level runtime 收束，也要明說缺少顯式池。
- sourceFilesInStep: src/app/App.tsx, src/chat/ChatPools.ts, src/content/fakeAI/replies.json, src/content/pools/donatePools.json
- stepEntryCount: 97
- stepStatuses: active, inferred_runtime_wrapper
- categoryOwnershipSummary:
  - ambient_chat: mode_specific / active / allowedStepIds=EVENT_REACTION_WINDOW, QNA_AWAITING_REPLY, QNA_RESOLVED, QNA_ABORTED, AMBIENT_ONLY
  - fake_ai: mode_specific / active / allowedStepIds=QNA_ASKING, QNA_RESOLVED, AMBIENT_ONLY
  - donate: mode_specific / active / allowedStepIds=QNA_AWAITING_REPLY, QNA_RESOLVED, AMBIENT_ONLY
- runtimeWrapperVisibility: related qna prompt wrappers stay visible because this step either emits, reuses, or exits a wrapped classic prompt.

### Review framing

- 玩家通常看到什麼：玩家完成回答後，聊天室回到收束與放鬆狀態。主聲音多半回到觀眾 / 環境 / donate / fake AI 的後續餘波，而不是正式題目提示。
- 主要聲音：觀眾 / 環境聊天
- 體驗目的：Resolved aftermath.
- 最不能破壞：最不能破壞的是「題目已結束」的感受；不得讓玩家誤以為 reply gate 仍然開著。若目前只有 wrapper-level runtime 收束，也要明說缺少顯式池。

### Message entries

#### classic.persona.caretaker.dread_buildup

- key: classic.persona.caretaker.dread_buildup
- category: ambient_chat
- currentVariants: 這裡壓力真的高
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.idle_boring

- key: classic.persona.caretaker.idle_boring
- category: ambient_chat
- currentVariants: 太緊就先喝口水, 先別硬撐
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.social_reply

- key: classic.persona.caretaker.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.dread_buildup

- key: classic.persona.chaotic.dread_buildup
- category: ambient_chat
- currentVariants: 這氣氛邪到爆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.idle_boring

- key: classic.persona.chaotic.idle_boring
- category: ambient_chat
- currentVariants: 我腦內警報狂叫, 不行我要先尖叫
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.social_reply

- key: classic.persona.chaotic.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我跟你一起崩潰
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.dread_buildup

- key: classic.persona.chill.dread_buildup
- category: ambient_chat
- currentVariants: 安靜到我背脊發涼
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.idle_boring

- key: classic.persona.chill.idle_boring
- category: ambient_chat
- currentVariants: 我先慢慢盯著看, 這氣氛越靜越怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.social_reply

- key: classic.persona.chill.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先別慌 我也在看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.dread_buildup

- key: classic.persona.detective.dread_buildup
- category: ambient_chat
- currentVariants: 像有人從暗處經過
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.idle_boring

- key: classic.persona.detective.idle_boring
- category: ambient_chat
- currentVariants: 先記這個位置, 這裡有可疑陰影
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.social_reply

- key: classic.persona.detective.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你的線索有用
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.dread_buildup

- key: classic.persona.empath.dread_buildup
- category: ambient_chat
- currentVariants: 我知道這裡很壓
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.idle_boring

- key: classic.persona.empath.idle_boring
- category: ambient_chat
- currentVariants: 大家先放慢呼吸, 看不下去就休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.social_reply

- key: classic.persona.empath.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先穩住 我在
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.dread_buildup

- key: classic.persona.foodie.dread_buildup
- category: ambient_chat
- currentVariants: 胃突然縮一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.idle_boring

- key: classic.persona.foodie.idle_boring
- category: ambient_chat
- currentVariants: 我零食差點掉地上, 這氣氛比辣鍋還衝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.social_reply

- key: classic.persona.foodie.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我連水都不敢喝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.dread_buildup

- key: classic.persona.gamer.dread_buildup
- category: ambient_chat
- currentVariants: 感覺要觸發事件
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.idle_boring

- key: classic.persona.gamer.idle_boring
- category: ambient_chat
- currentVariants: 這像王前前搖, 警戒條快滿了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.social_reply

- key: classic.persona.gamer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也覺得是陷阱
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.dread_buildup

- key: classic.persona.hype.dread_buildup
- category: ambient_chat
- currentVariants: 感覺等等要爆開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.idle_boring

- key: classic.persona.hype.idle_boring
- category: ambient_chat
- currentVariants: 欸我現在超清醒, 這氣氛直接拉滿
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.social_reply

- key: classic.persona.hype.social_reply
- category: ambient_chat
- currentVariants: @{tag} 別走 感覺要來了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.dread_buildup

- key: classic.persona.impatient.dread_buildup
- category: ambient_chat
- currentVariants: 別拖 真的快出事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.idle_boring

- key: classic.persona.impatient.idle_boring
- category: ambient_chat
- currentVariants: 快回放剛剛那下, 我想直接看重點
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.social_reply

- key: classic.persona.impatient.social_reply
- category: ambient_chat
- currentVariants: @{tag} 對 就是那裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.dread_buildup

- key: classic.persona.latecomer.dread_buildup
- category: ambient_chat
- currentVariants: 我是不是錯過關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.idle_boring

- key: classic.persona.latecomer.idle_boring
- category: ambient_chat
- currentVariants: 我剛進來就這麼硬, 有人補前情嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.social_reply

- key: classic.persona.latecomer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 可以幫我補一下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.dread_buildup

- key: classic.persona.meme.dread_buildup
- category: ambient_chat
- currentVariants: 這裡很像恐怖梗開場
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.idle_boring

- key: classic.persona.meme.idle_boring
- category: ambient_chat
- currentVariants: 我腦內已經自動配音, 聊天室等下要炸
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.social_reply

- key: classic.persona.meme.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你這句太真了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.dread_buildup

- key: classic.persona.minimalist.dread_buildup
- category: ambient_chat
- currentVariants: 不妙
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.idle_boring

- key: classic.persona.minimalist.idle_boring
- category: ambient_chat
- currentVariants: 怪, 有感
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.social_reply

- key: classic.persona.minimalist.social_reply
- category: ambient_chat
- currentVariants: @{tag} 懂
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.dread_buildup

- key: classic.persona.nervous.dread_buildup
- category: ambient_chat
- currentVariants: 我腦袋一直補畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.idle_boring

- key: classic.persona.nervous.idle_boring
- category: ambient_chat
- currentVariants: 我手心又出汗了, 現在這種沒事最可怕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.social_reply

- key: classic.persona.nervous.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你有看到剛剛那下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.dread_buildup

- key: classic.persona.observer.dread_buildup
- category: ambient_chat
- currentVariants: 前後看起來有落差
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.idle_boring

- key: classic.persona.observer.idle_boring
- category: ambient_chat
- currentVariants: 畫面邊緣有點飄, 亮度剛剛掉一拍
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.social_reply

- key: classic.persona.observer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你講的點有對上
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.dread_buildup

- key: classic.persona.polite.dread_buildup
- category: ambient_chat
- currentVariants: 失禮了 但真的怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.idle_boring

- key: classic.persona.polite.idle_boring
- category: ambient_chat
- currentVariants: 借過我補一句 這裡很冷, 請大家留意右下角
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.social_reply

- key: classic.persona.polite.social_reply
- category: ambient_chat
- currentVariants: @{tag} 感謝提醒 我有看到
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.dread_buildup

- key: classic.persona.quiet.dread_buildup
- category: ambient_chat
- currentVariants: 這裡不太對勁
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.idle_boring

- key: classic.persona.quiet.idle_boring
- category: ambient_chat
- currentVariants: 嗯 我有感, 我會一直看著這裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.social_reply

- key: classic.persona.quiet.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也聽到了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.dread_buildup

- key: classic.persona.skeptical.dread_buildup
- category: ambient_chat
- currentVariants: 這感覺不像單純錯覺
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.idle_boring

- key: classic.persona.skeptical.idle_boring
- category: ambient_chat
- currentVariants: 先不要太快下結論, 我想再看一次
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.social_reply

- key: classic.persona.skeptical.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先看前後反應再說
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.dread_buildup

- key: classic.persona.sleepy.dread_buildup
- category: ambient_chat
- currentVariants: 這下把我嚇醒
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.idle_boring

- key: classic.persona.sleepy.idle_boring
- category: ambient_chat
- currentVariants: 我本來快睡著了, 現在眼睛直接張開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.social_reply

- key: classic.persona.sleepy.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我剛剛也抖一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.dread_buildup

- key: classic.persona.storyteller.dread_buildup
- category: ambient_chat
- currentVariants: 節奏像在等人回頭
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.idle_boring

- key: classic.persona.storyteller.idle_boring
- category: ambient_chat
- currentVariants: 這房間像在憋氣, 畫面像有人貼牆走
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.social_reply

- key: classic.persona.storyteller.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你那句很像前兆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.dread_buildup

- key: classic.persona.troll.dread_buildup
- category: ambient_chat
- currentVariants: 我看等等一定有事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.idle_boring

- key: classic.persona.troll.idle_boring
- category: ambient_chat
- currentVariants: 這鏡頭很會折磨人, 欸這畫面是在釣人吧
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.social_reply

- key: classic.persona.troll.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先深呼吸 不然先關彈幕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.dread_buildup

- key: classic.pool.dread_buildup
- category: ambient_chat
- currentVariants: 我背後開始發涼了, 這感覺越來越不對
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.fear_self_doubt

- key: classic.pool.fear_self_doubt
- category: ambient_chat
- currentVariants: 我是不是自己嚇自己, 越看越懷疑是我腦補
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.FEAR_SELF_DOUBT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.idle_boring

- key: classic.pool.idle_boring
- category: ambient_chat
- currentVariants: 今天這裡就是一直吊著人, 我一直在等下一個動靜
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.scene_flicker_react

- key: classic.pool.scene_flicker_react
- category: ambient_chat
- currentVariants: 亮度變了, 剛剛是不是暗一下, 那個光怪怪的, 我看到閃一下, 那個角落有動, 不是我眼花吧, 是不是燈壞了, 怎麼忽明忽暗, 那個影子怪怪的, 有東西動
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SCENE_FLICKER_REACT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_fan

- key: classic.pool.sfx_react_fan
- category: ambient_chat
- currentVariants: 風扇聲是不是怪怪的, 剛剛風扇聲好像變重了, 你們有沒有覺得聲音不太一樣, 可能我錯覺 但我聽了不舒服, 我戴耳機整個毛起來, 那個聲音忽然壓過來 我好不舒服, 剛剛那陣聲音讓我背脊發緊, 我怎麼聽到一種越靠越近的感覺, 這個嗡嗡聲讓我心裡一直發毛, 你們也有聽到那種悶悶的變化嗎, 那聲音一下輕一下重 我快不敢聽, 我耳機裡那股聲音怪到不行
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FAN
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_footsteps

- key: classic.pool.sfx_react_footsteps
- category: ambient_chat
- currentVariants: 有腳步聲吧, 你們有聽到走路聲嗎, 剛剛那個是踩地板嗎, 好像有人在走, 不是風聲, 那個不是錯覺吧, 我有聽到, 有人走過去, 那聲音靠近了, 好像在旁邊, 不要嚇我, 這太怪了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FOOTSTEPS
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_ghost

- key: classic.pool.sfx_react_ghost
- category: ambient_chat
- currentVariants: 不對勁, 有點怪, 你們有聽到嗎, 那不是我, 我起雞皮疙瘩了, 等一下, 剛剛那個是什麼, 我不敢看了, 有點毛, 那聲音不正常, 你們不要亂講, 我覺得怪怪的, 是不是有人, 這樣不太對, 好像有東西
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_GHOST
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.social_reply

- key: classic.pool.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也有同感, @{tag} 你這句太關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.system_prompt

- key: classic.pool.system_prompt
- category: ambient_chat
- currentVariants: 先穩住, 大家慢慢看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SYSTEM_PROMPT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.system.system_prompt

- key: classic.system.system_prompt
- category: ambient_chat
- currentVariants: 先穩住 這間房的節奏又變了, 大家先別急 我們慢慢盯, 聊天室先安靜一下看畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: SYSTEM_POOLS.system_prompt
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.1

- key: classic.donate.1
- category: donate
- currentText: 很厲害，繼續加油！
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.10

- key: classic.donate.10
- category: donate
- currentText: 收下我的愛心星星。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.2

- key: classic.donate.2
- category: donate
- currentText: 欸 那邊真的亮了一點，整體順很多。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.3

- key: classic.donate.3
- category: donate
- currentText: 聊天室為你感到驕傲。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.4

- key: classic.donate.4
- category: donate
- currentText: 謝謝你沒有放棄。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.5

- key: classic.donate.5
- category: donate
- currentText: 這個節奏必須斗內。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.6

- key: classic.donate.6
- category: donate
- currentText: 超穩，這題答得漂亮。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.7

- key: classic.donate.7
- category: donate
- currentText: 後排送上應援。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.8

- key: classic.donate.8
- category: donate
- currentText: 房間氣氛真的變好了。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.9

- key: classic.donate.9
- category: donate
- currentText: 再撐一下，感覺整個空間會更穩。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.corner

- key: classic.fake_ai.anchor.corner
- category: fake_ai
- currentVariants: 角落那邊怎麼那麼暗, 你是不是一直避開看角落, 角落那裡不太對
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.corner.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.door

- key: classic.fake_ai.anchor.door
- category: fake_ai
- currentVariants: 門縫那邊好像有動靜, 不要一直看門那裡, 門後面很暗
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.door.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.under_table

- key: classic.fake_ai.anchor.under_table
- category: fake_ai
- currentVariants: 桌子下面是不是有聲音, 你剛剛是不是往桌子那邊看, 桌子那邊太安靜了, 不要一直盯著桌腳
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.under_table.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.window

- key: classic.fake_ai.anchor.window
- category: fake_ai
- currentVariants: 窗邊的光怪怪的, 你有聽到窗那邊的聲音嗎, 不要靠窗太近
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.window.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.thai_flood

- key: classic.fake_ai.thai_flood
- category: fake_ai
- currentVariants: ฉันกำลังมองคุณอยู่, ฉันอยู่ข้างหลังคุณ, คุณเห็นฉันไหม, ข้างหลัง ข้างหลัง ข้างหลัง, อย่าหันกลับมา, คุณไม่ได้อยู่คนเดียว, ฉันเห็นคุณ, เงาอยู่ตรงนั้น, มันใกล้ขึ้นเรื่อยๆ, คุณแน่ใจเหรอ
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.thaiFlood
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.urban_legend.th

- key: classic.fake_ai.urban_legend.th
- category: fake_ai
- currentVariants: เขาว่ากันว่าที่นี่ไม่ว่าง, เงาไม่เคยหายไป, มันเคยเกิดขึ้นมาก่อน, อย่ามองนานเกินไป
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.urbanLegend_th
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.urban_legend.zh

- key: classic.fake_ai.urban_legend.zh
- category: fake_ai
- currentVariants: 有人說這間老屋的傳聞都從那個位置開始, 你知道嗎 以前有人在這裡失蹤過, 這個地方有個很老的說法
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.urbanLegend_zh
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → player-facing message content.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.fear_challenge_flow.s1.runtime_wrapper

- key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: FEAR_CHALLENGE
- qnaFlowId: fear_challenge_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.ghost_ping_flow.s1.runtime_wrapper

- key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: GHOST_PING
- qnaFlowId: ghost_ping_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.light_glitch_flow.s1.runtime_wrapper

- key: classic.qna.light_glitch_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: LIGHT_GLITCH
- qnaFlowId: light_glitch_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.name_call_flow.s1.runtime_wrapper

- key: classic.qna.name_call_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: NAME_CALL
- qnaFlowId: name_call_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s1.runtime_wrapper

- key: classic.qna.tv_event_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s2.runtime_wrapper

- key: classic.qna.tv_event_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s1.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s2.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s2.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_RESOLVED (ambient_chat primary; allowed ambient_chat, fake_ai, donate) → runtime adapter visibility.
- constraints: Resolved state must not keep classic reply gate armed. | no-reply-gate | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

### Runtime wrapper review

- wrapper key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.fear_challenge_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.ghost_ping_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.light_glitch_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.light_glitch_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.name_call_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.name_call_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.

## QNA_ABORTED

- stepId: QNA_ABORTED
- stepPurpose: Classic QnA aborted due to timeout, manual stop, or invalid continuation.
- canReply: no
- gateType: qna_gate
- allowedCategories: fallback, ambient_chat
- primaryCategory: fallback
- optionalCategories: ambient_chat
- runtimeSelectionPolicy: priority_then_optional
- playerExperienceSummary: 玩家這一步感受到題目被中止、超時或放棄，聊天室應迅速回到安全 fallback 或環境聊天。主聲音是短恢復語氣，不再繼續考問。
- reviewNotesForStep: 最不能破壞的是快速脫離失敗分支；不能留下半題、半包裝、半開啟的 reply gate 錯覺。
- sourceFilesInStep: src/app/App.tsx, src/chat/ChatPools.ts
- stepEntryCount: 81
- stepStatuses: active, inferred_runtime_wrapper
- categoryOwnershipSummary:
  - fallback: shared_tooling / active / allowedStepIds=QNA_ABORTED, FALLBACK_ONLY
  - ambient_chat: mode_specific / active / allowedStepIds=EVENT_REACTION_WINDOW, QNA_AWAITING_REPLY, QNA_RESOLVED, QNA_ABORTED, AMBIENT_ONLY
- runtimeWrapperVisibility: related qna prompt wrappers stay visible because this step either emits, reuses, or exits a wrapped classic prompt.

### Review framing

- 玩家通常看到什麼：玩家這一步感受到題目被中止、超時或放棄，聊天室應迅速回到安全 fallback 或環境聊天。主聲音是短恢復語氣，不再繼續考問。
- 主要聲音：安全 fallback / 系統保底
- 體驗目的：Abort recovery.
- 最不能破壞：最不能破壞的是快速脫離失敗分支；不能留下半題、半包裝、半開啟的 reply gate 錯覺。

### Message entries

#### classic.persona.caretaker.dread_buildup

- key: classic.persona.caretaker.dread_buildup
- category: ambient_chat
- currentVariants: 這裡壓力真的高
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.idle_boring

- key: classic.persona.caretaker.idle_boring
- category: ambient_chat
- currentVariants: 太緊就先喝口水, 先別硬撐
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.social_reply

- key: classic.persona.caretaker.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.dread_buildup

- key: classic.persona.chaotic.dread_buildup
- category: ambient_chat
- currentVariants: 這氣氛邪到爆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.idle_boring

- key: classic.persona.chaotic.idle_boring
- category: ambient_chat
- currentVariants: 我腦內警報狂叫, 不行我要先尖叫
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.social_reply

- key: classic.persona.chaotic.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我跟你一起崩潰
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.dread_buildup

- key: classic.persona.chill.dread_buildup
- category: ambient_chat
- currentVariants: 安靜到我背脊發涼
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.idle_boring

- key: classic.persona.chill.idle_boring
- category: ambient_chat
- currentVariants: 我先慢慢盯著看, 這氣氛越靜越怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.social_reply

- key: classic.persona.chill.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先別慌 我也在看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.dread_buildup

- key: classic.persona.detective.dread_buildup
- category: ambient_chat
- currentVariants: 像有人從暗處經過
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.idle_boring

- key: classic.persona.detective.idle_boring
- category: ambient_chat
- currentVariants: 先記這個位置, 這裡有可疑陰影
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.social_reply

- key: classic.persona.detective.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你的線索有用
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.dread_buildup

- key: classic.persona.empath.dread_buildup
- category: ambient_chat
- currentVariants: 我知道這裡很壓
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.idle_boring

- key: classic.persona.empath.idle_boring
- category: ambient_chat
- currentVariants: 大家先放慢呼吸, 看不下去就休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.social_reply

- key: classic.persona.empath.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先穩住 我在
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.dread_buildup

- key: classic.persona.foodie.dread_buildup
- category: ambient_chat
- currentVariants: 胃突然縮一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.idle_boring

- key: classic.persona.foodie.idle_boring
- category: ambient_chat
- currentVariants: 我零食差點掉地上, 這氣氛比辣鍋還衝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.social_reply

- key: classic.persona.foodie.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我連水都不敢喝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.dread_buildup

- key: classic.persona.gamer.dread_buildup
- category: ambient_chat
- currentVariants: 感覺要觸發事件
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.idle_boring

- key: classic.persona.gamer.idle_boring
- category: ambient_chat
- currentVariants: 這像王前前搖, 警戒條快滿了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.social_reply

- key: classic.persona.gamer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也覺得是陷阱
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.dread_buildup

- key: classic.persona.hype.dread_buildup
- category: ambient_chat
- currentVariants: 感覺等等要爆開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.idle_boring

- key: classic.persona.hype.idle_boring
- category: ambient_chat
- currentVariants: 欸我現在超清醒, 這氣氛直接拉滿
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.social_reply

- key: classic.persona.hype.social_reply
- category: ambient_chat
- currentVariants: @{tag} 別走 感覺要來了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.dread_buildup

- key: classic.persona.impatient.dread_buildup
- category: ambient_chat
- currentVariants: 別拖 真的快出事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.idle_boring

- key: classic.persona.impatient.idle_boring
- category: ambient_chat
- currentVariants: 快回放剛剛那下, 我想直接看重點
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.social_reply

- key: classic.persona.impatient.social_reply
- category: ambient_chat
- currentVariants: @{tag} 對 就是那裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.dread_buildup

- key: classic.persona.latecomer.dread_buildup
- category: ambient_chat
- currentVariants: 我是不是錯過關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.idle_boring

- key: classic.persona.latecomer.idle_boring
- category: ambient_chat
- currentVariants: 我剛進來就這麼硬, 有人補前情嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.social_reply

- key: classic.persona.latecomer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 可以幫我補一下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.dread_buildup

- key: classic.persona.meme.dread_buildup
- category: ambient_chat
- currentVariants: 這裡很像恐怖梗開場
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.idle_boring

- key: classic.persona.meme.idle_boring
- category: ambient_chat
- currentVariants: 我腦內已經自動配音, 聊天室等下要炸
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.social_reply

- key: classic.persona.meme.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你這句太真了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.dread_buildup

- key: classic.persona.minimalist.dread_buildup
- category: ambient_chat
- currentVariants: 不妙
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.idle_boring

- key: classic.persona.minimalist.idle_boring
- category: ambient_chat
- currentVariants: 怪, 有感
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.social_reply

- key: classic.persona.minimalist.social_reply
- category: ambient_chat
- currentVariants: @{tag} 懂
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.dread_buildup

- key: classic.persona.nervous.dread_buildup
- category: ambient_chat
- currentVariants: 我腦袋一直補畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.idle_boring

- key: classic.persona.nervous.idle_boring
- category: ambient_chat
- currentVariants: 我手心又出汗了, 現在這種沒事最可怕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.social_reply

- key: classic.persona.nervous.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你有看到剛剛那下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.dread_buildup

- key: classic.persona.observer.dread_buildup
- category: ambient_chat
- currentVariants: 前後看起來有落差
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.idle_boring

- key: classic.persona.observer.idle_boring
- category: ambient_chat
- currentVariants: 畫面邊緣有點飄, 亮度剛剛掉一拍
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.social_reply

- key: classic.persona.observer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你講的點有對上
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.dread_buildup

- key: classic.persona.polite.dread_buildup
- category: ambient_chat
- currentVariants: 失禮了 但真的怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.idle_boring

- key: classic.persona.polite.idle_boring
- category: ambient_chat
- currentVariants: 借過我補一句 這裡很冷, 請大家留意右下角
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.social_reply

- key: classic.persona.polite.social_reply
- category: ambient_chat
- currentVariants: @{tag} 感謝提醒 我有看到
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.dread_buildup

- key: classic.persona.quiet.dread_buildup
- category: ambient_chat
- currentVariants: 這裡不太對勁
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.idle_boring

- key: classic.persona.quiet.idle_boring
- category: ambient_chat
- currentVariants: 嗯 我有感, 我會一直看著這裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.social_reply

- key: classic.persona.quiet.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也聽到了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.dread_buildup

- key: classic.persona.skeptical.dread_buildup
- category: ambient_chat
- currentVariants: 這感覺不像單純錯覺
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.idle_boring

- key: classic.persona.skeptical.idle_boring
- category: ambient_chat
- currentVariants: 先不要太快下結論, 我想再看一次
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.social_reply

- key: classic.persona.skeptical.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先看前後反應再說
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.dread_buildup

- key: classic.persona.sleepy.dread_buildup
- category: ambient_chat
- currentVariants: 這下把我嚇醒
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.idle_boring

- key: classic.persona.sleepy.idle_boring
- category: ambient_chat
- currentVariants: 我本來快睡著了, 現在眼睛直接張開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.social_reply

- key: classic.persona.sleepy.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我剛剛也抖一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.dread_buildup

- key: classic.persona.storyteller.dread_buildup
- category: ambient_chat
- currentVariants: 節奏像在等人回頭
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.idle_boring

- key: classic.persona.storyteller.idle_boring
- category: ambient_chat
- currentVariants: 這房間像在憋氣, 畫面像有人貼牆走
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.social_reply

- key: classic.persona.storyteller.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你那句很像前兆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.dread_buildup

- key: classic.persona.troll.dread_buildup
- category: ambient_chat
- currentVariants: 我看等等一定有事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.idle_boring

- key: classic.persona.troll.idle_boring
- category: ambient_chat
- currentVariants: 這鏡頭很會折磨人, 欸這畫面是在釣人吧
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.social_reply

- key: classic.persona.troll.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先深呼吸 不然先關彈幕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.dread_buildup

- key: classic.pool.dread_buildup
- category: ambient_chat
- currentVariants: 我背後開始發涼了, 這感覺越來越不對
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.fear_self_doubt

- key: classic.pool.fear_self_doubt
- category: ambient_chat
- currentVariants: 我是不是自己嚇自己, 越看越懷疑是我腦補
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.FEAR_SELF_DOUBT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.idle_boring

- key: classic.pool.idle_boring
- category: ambient_chat
- currentVariants: 今天這裡就是一直吊著人, 我一直在等下一個動靜
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.scene_flicker_react

- key: classic.pool.scene_flicker_react
- category: ambient_chat
- currentVariants: 亮度變了, 剛剛是不是暗一下, 那個光怪怪的, 我看到閃一下, 那個角落有動, 不是我眼花吧, 是不是燈壞了, 怎麼忽明忽暗, 那個影子怪怪的, 有東西動
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SCENE_FLICKER_REACT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_fan

- key: classic.pool.sfx_react_fan
- category: ambient_chat
- currentVariants: 風扇聲是不是怪怪的, 剛剛風扇聲好像變重了, 你們有沒有覺得聲音不太一樣, 可能我錯覺 但我聽了不舒服, 我戴耳機整個毛起來, 那個聲音忽然壓過來 我好不舒服, 剛剛那陣聲音讓我背脊發緊, 我怎麼聽到一種越靠越近的感覺, 這個嗡嗡聲讓我心裡一直發毛, 你們也有聽到那種悶悶的變化嗎, 那聲音一下輕一下重 我快不敢聽, 我耳機裡那股聲音怪到不行
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FAN
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_footsteps

- key: classic.pool.sfx_react_footsteps
- category: ambient_chat
- currentVariants: 有腳步聲吧, 你們有聽到走路聲嗎, 剛剛那個是踩地板嗎, 好像有人在走, 不是風聲, 那個不是錯覺吧, 我有聽到, 有人走過去, 那聲音靠近了, 好像在旁邊, 不要嚇我, 這太怪了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FOOTSTEPS
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_ghost

- key: classic.pool.sfx_react_ghost
- category: ambient_chat
- currentVariants: 不對勁, 有點怪, 你們有聽到嗎, 那不是我, 我起雞皮疙瘩了, 等一下, 剛剛那個是什麼, 我不敢看了, 有點毛, 那聲音不正常, 你們不要亂講, 我覺得怪怪的, 是不是有人, 這樣不太對, 好像有東西
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_GHOST
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.social_reply

- key: classic.pool.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也有同感, @{tag} 你這句太關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.system_prompt

- key: classic.pool.system_prompt
- category: ambient_chat
- currentVariants: 先穩住, 大家慢慢看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SYSTEM_PROMPT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.system.system_prompt

- key: classic.system.system_prompt
- category: ambient_chat
- currentVariants: 先穩住 這間房的節奏又變了, 大家先別急 我們慢慢盯, 聊天室先安靜一下看畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: SYSTEM_POOLS.system_prompt
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.safe_fallback

- key: classic.pool.safe_fallback
- category: fallback
- currentVariants: 先等一下 我雞皮疙瘩起來了, 這氣氛讓我不敢眨眼, 我整個人僵住了, 有人也覺得心裡發毛嗎, 先別刷太快 我還在抖, 我剛剛差點把手機丟出去, 這種安靜最可怕, 我耳機戴著整個不舒服, 你們先講話 我有點不敢看, 我現在只想先深呼吸, 這畫面越看越不對, 我真的有被嚇到
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: SAFE_FALLBACK_POOL
- sourceOfTruth: registry
- ownership: shared_tooling
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Safe fallback pool used by classic selection/lint reroll.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → player-facing message content.
- constraints: Use short reset/fallback language only. | short-recovery | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.qna.fear_challenge_flow.s1.runtime_wrapper

- key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: FEAR_CHALLENGE
- qnaFlowId: fear_challenge_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.ghost_ping_flow.s1.runtime_wrapper

- key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: GHOST_PING
- qnaFlowId: ghost_ping_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.light_glitch_flow.s1.runtime_wrapper

- key: classic.qna.light_glitch_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: LIGHT_GLITCH
- qnaFlowId: light_glitch_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.name_call_flow.s1.runtime_wrapper

- key: classic.qna.name_call_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: NAME_CALL
- qnaFlowId: name_call_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s1.runtime_wrapper

- key: classic.qna.tv_event_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.tv_event_flow.s2.runtime_wrapper

- key: classic.qna.tv_event_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: TV_EVENT
- qnaFlowId: tv_event_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s1.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.viewer_spike_flow.s2.runtime_wrapper

- key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VIEWER_SPIKE
- qnaFlowId: viewer_spike_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s1.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s1
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

#### classic.qna.voice_confirm_flow.s2.runtime_wrapper

- key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
- category: qna_prompt
- currentText: @{taggedUser} {question}（選項：{optionLabels}）
- sourceFile: src/app/App.tsx
- sourceSymbol: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- sourceOfTruth: runtime_wrapper
- ownership: mode_specific
- ownerMode: classic
- status: inferred_runtime_wrapper
- eventKey: VOICE_CONFIRM
- qnaFlowId: voice_confirm_flow
- questionId: s2
- tokens: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
- messagePurpose: Classic question prompt variants.
- tonePack: classic_qna_prompt
- runtimeWrapper: inferred_runtime_wrapper :: line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`
- importability: classic review-only / not importable
- usageContext: QNA_ABORTED (fallback primary; allowed fallback, ambient_chat) → runtime adapter visibility.
- constraints: Use short reset/fallback language only. | short-recovery | Review template tone + token framing only; do not treat wrapper as editable import source.
- reviewSlot: pending

### Runtime wrapper review

- wrapper key: classic.qna.fear_challenge_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.fear_challenge_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.ghost_ping_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.ghost_ping_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.light_glitch_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.light_glitch_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.name_call_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.name_call_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.tv_event_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.tv_event_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.viewer_spike_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.viewer_spike_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s1.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s1.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.
- wrapper key: classic.qna.voice_confirm_flow.s2.runtime_wrapper
  - wraps base content: classic.qna.voice_confirm_flow.s2.prompt
  - fixed template: @{taggedUser} {question}（選項：{optionLabels}）
  - dynamic tokens / options / labels: @{taggedUser} (Tagged player mention wrapper.); {question} (Picked QnA question variant.); {optionLabels} (Joined option labels.)
  - review focus: template tone + token framing, then confirm the base prompt content still reads correctly.
  - importability: classic review-only / not importable
  - why not importable: actual line is assembled at runtime in App.tsx, so the packet is documentation/audit only and cannot safely override the runtime template.

## AMBIENT_ONLY

- stepId: AMBIENT_ONLY
- stepPurpose: Classic free-running ambient chat when no event or QnA owns the moment.
- canReply: no
- gateType: ambient_gate
- allowedCategories: ambient_chat, donate, fake_ai
- primaryCategory: ambient_chat
- optionalCategories: donate, fake_ai
- runtimeSelectionPolicy: variant_pool
- playerExperienceSummary: 玩家只看到自由流動的聊天室，主聲音是觀眾 / 假 AI / donate 等背景 chatter，沒有事件或題目主線搶焦點。
- reviewNotesForStep: 最不能破壞的是「純環境」感；內容可以豐富，但不能像新事件 opener 或新題目 prompt。
- sourceFilesInStep: src/chat/ChatPools.ts, src/content/fakeAI/replies.json, src/content/pools/donatePools.json
- stepEntryCount: 87
- stepStatuses: active
- categoryOwnershipSummary:
  - ambient_chat: mode_specific / active / allowedStepIds=EVENT_REACTION_WINDOW, QNA_AWAITING_REPLY, QNA_RESOLVED, QNA_ABORTED, AMBIENT_ONLY
  - donate: mode_specific / active / allowedStepIds=QNA_AWAITING_REPLY, QNA_RESOLVED, AMBIENT_ONLY
  - fake_ai: mode_specific / active / allowedStepIds=QNA_ASKING, QNA_RESOLVED, AMBIENT_ONLY
- runtimeWrapperVisibility: no inferred wrapper is primary for this step.

### Review framing

- 玩家通常看到什麼：玩家只看到自由流動的聊天室，主聲音是觀眾 / 假 AI / donate 等背景 chatter，沒有事件或題目主線搶焦點。
- 主要聲音：觀眾 / 環境聊天
- 體驗目的：Ambient free chat.
- 最不能破壞：最不能破壞的是「純環境」感；內容可以豐富，但不能像新事件 opener 或新題目 prompt。

### Message entries

#### classic.persona.caretaker.dread_buildup

- key: classic.persona.caretaker.dread_buildup
- category: ambient_chat
- currentVariants: 這裡壓力真的高
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.idle_boring

- key: classic.persona.caretaker.idle_boring
- category: ambient_chat
- currentVariants: 太緊就先喝口水, 先別硬撐
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.caretaker.social_reply

- key: classic.persona.caretaker.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.caretaker.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.dread_buildup

- key: classic.persona.chaotic.dread_buildup
- category: ambient_chat
- currentVariants: 這氣氛邪到爆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.idle_boring

- key: classic.persona.chaotic.idle_boring
- category: ambient_chat
- currentVariants: 我腦內警報狂叫, 不行我要先尖叫
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chaotic.social_reply

- key: classic.persona.chaotic.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我跟你一起崩潰
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chaotic.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.dread_buildup

- key: classic.persona.chill.dread_buildup
- category: ambient_chat
- currentVariants: 安靜到我背脊發涼
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.idle_boring

- key: classic.persona.chill.idle_boring
- category: ambient_chat
- currentVariants: 我先慢慢盯著看, 這氣氛越靜越怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.chill.social_reply

- key: classic.persona.chill.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先別慌 我也在看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.chill.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.dread_buildup

- key: classic.persona.detective.dread_buildup
- category: ambient_chat
- currentVariants: 像有人從暗處經過
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.idle_boring

- key: classic.persona.detective.idle_boring
- category: ambient_chat
- currentVariants: 先記這個位置, 這裡有可疑陰影
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.detective.social_reply

- key: classic.persona.detective.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你的線索有用
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.detective.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.dread_buildup

- key: classic.persona.empath.dread_buildup
- category: ambient_chat
- currentVariants: 我知道這裡很壓
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.idle_boring

- key: classic.persona.empath.idle_boring
- category: ambient_chat
- currentVariants: 大家先放慢呼吸, 看不下去就休息一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.empath.social_reply

- key: classic.persona.empath.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你先穩住 我在
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.empath.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.dread_buildup

- key: classic.persona.foodie.dread_buildup
- category: ambient_chat
- currentVariants: 胃突然縮一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.idle_boring

- key: classic.persona.foodie.idle_boring
- category: ambient_chat
- currentVariants: 我零食差點掉地上, 這氣氛比辣鍋還衝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.foodie.social_reply

- key: classic.persona.foodie.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我連水都不敢喝
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.foodie.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.dread_buildup

- key: classic.persona.gamer.dread_buildup
- category: ambient_chat
- currentVariants: 感覺要觸發事件
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.idle_boring

- key: classic.persona.gamer.idle_boring
- category: ambient_chat
- currentVariants: 這像王前前搖, 警戒條快滿了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.gamer.social_reply

- key: classic.persona.gamer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也覺得是陷阱
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.gamer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.dread_buildup

- key: classic.persona.hype.dread_buildup
- category: ambient_chat
- currentVariants: 感覺等等要爆開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.idle_boring

- key: classic.persona.hype.idle_boring
- category: ambient_chat
- currentVariants: 欸我現在超清醒, 這氣氛直接拉滿
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.hype.social_reply

- key: classic.persona.hype.social_reply
- category: ambient_chat
- currentVariants: @{tag} 別走 感覺要來了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.hype.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.dread_buildup

- key: classic.persona.impatient.dread_buildup
- category: ambient_chat
- currentVariants: 別拖 真的快出事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.idle_boring

- key: classic.persona.impatient.idle_boring
- category: ambient_chat
- currentVariants: 快回放剛剛那下, 我想直接看重點
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.impatient.social_reply

- key: classic.persona.impatient.social_reply
- category: ambient_chat
- currentVariants: @{tag} 對 就是那裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.impatient.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.dread_buildup

- key: classic.persona.latecomer.dread_buildup
- category: ambient_chat
- currentVariants: 我是不是錯過關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.idle_boring

- key: classic.persona.latecomer.idle_boring
- category: ambient_chat
- currentVariants: 我剛進來就這麼硬, 有人補前情嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.latecomer.social_reply

- key: classic.persona.latecomer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 可以幫我補一下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.latecomer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.dread_buildup

- key: classic.persona.meme.dread_buildup
- category: ambient_chat
- currentVariants: 這裡很像恐怖梗開場
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.idle_boring

- key: classic.persona.meme.idle_boring
- category: ambient_chat
- currentVariants: 我腦內已經自動配音, 聊天室等下要炸
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.meme.social_reply

- key: classic.persona.meme.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你這句太真了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.meme.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.dread_buildup

- key: classic.persona.minimalist.dread_buildup
- category: ambient_chat
- currentVariants: 不妙
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.idle_boring

- key: classic.persona.minimalist.idle_boring
- category: ambient_chat
- currentVariants: 怪, 有感
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.minimalist.social_reply

- key: classic.persona.minimalist.social_reply
- category: ambient_chat
- currentVariants: @{tag} 懂
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.minimalist.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.dread_buildup

- key: classic.persona.nervous.dread_buildup
- category: ambient_chat
- currentVariants: 我腦袋一直補畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.idle_boring

- key: classic.persona.nervous.idle_boring
- category: ambient_chat
- currentVariants: 我手心又出汗了, 現在這種沒事最可怕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.nervous.social_reply

- key: classic.persona.nervous.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你有看到剛剛那下嗎
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.nervous.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.dread_buildup

- key: classic.persona.observer.dread_buildup
- category: ambient_chat
- currentVariants: 前後看起來有落差
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.idle_boring

- key: classic.persona.observer.idle_boring
- category: ambient_chat
- currentVariants: 畫面邊緣有點飄, 亮度剛剛掉一拍
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.observer.social_reply

- key: classic.persona.observer.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你講的點有對上
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.observer.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.dread_buildup

- key: classic.persona.polite.dread_buildup
- category: ambient_chat
- currentVariants: 失禮了 但真的怪
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.idle_boring

- key: classic.persona.polite.idle_boring
- category: ambient_chat
- currentVariants: 借過我補一句 這裡很冷, 請大家留意右下角
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.polite.social_reply

- key: classic.persona.polite.social_reply
- category: ambient_chat
- currentVariants: @{tag} 感謝提醒 我有看到
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.polite.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.dread_buildup

- key: classic.persona.quiet.dread_buildup
- category: ambient_chat
- currentVariants: 這裡不太對勁
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.idle_boring

- key: classic.persona.quiet.idle_boring
- category: ambient_chat
- currentVariants: 嗯 我有感, 我會一直看著這裡
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.quiet.social_reply

- key: classic.persona.quiet.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也聽到了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.quiet.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.dread_buildup

- key: classic.persona.skeptical.dread_buildup
- category: ambient_chat
- currentVariants: 這感覺不像單純錯覺
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.idle_boring

- key: classic.persona.skeptical.idle_boring
- category: ambient_chat
- currentVariants: 先不要太快下結論, 我想再看一次
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.skeptical.social_reply

- key: classic.persona.skeptical.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先看前後反應再說
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.skeptical.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.dread_buildup

- key: classic.persona.sleepy.dread_buildup
- category: ambient_chat
- currentVariants: 這下把我嚇醒
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.idle_boring

- key: classic.persona.sleepy.idle_boring
- category: ambient_chat
- currentVariants: 我本來快睡著了, 現在眼睛直接張開
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.sleepy.social_reply

- key: classic.persona.sleepy.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我剛剛也抖一下
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.sleepy.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.dread_buildup

- key: classic.persona.storyteller.dread_buildup
- category: ambient_chat
- currentVariants: 節奏像在等人回頭
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.idle_boring

- key: classic.persona.storyteller.idle_boring
- category: ambient_chat
- currentVariants: 這房間像在憋氣, 畫面像有人貼牆走
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.storyteller.social_reply

- key: classic.persona.storyteller.social_reply
- category: ambient_chat
- currentVariants: @{tag} 你那句很像前兆
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.storyteller.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.dread_buildup

- key: classic.persona.troll.dread_buildup
- category: ambient_chat
- currentVariants: 我看等等一定有事
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.idle_boring

- key: classic.persona.troll.idle_boring
- category: ambient_chat
- currentVariants: 這鏡頭很會折磨人, 欸這畫面是在釣人吧
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.persona.troll.social_reply

- key: classic.persona.troll.social_reply
- category: ambient_chat
- currentVariants: @{tag} 先深呼吸 不然先關彈幕
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: PERSONA_POOLS.troll.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.dread_buildup

- key: classic.pool.dread_buildup
- category: ambient_chat
- currentVariants: 我背後開始發涼了, 這感覺越來越不對
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.DREAD_BUILDUP
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.fear_self_doubt

- key: classic.pool.fear_self_doubt
- category: ambient_chat
- currentVariants: 我是不是自己嚇自己, 越看越懷疑是我腦補
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.FEAR_SELF_DOUBT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.idle_boring

- key: classic.pool.idle_boring
- category: ambient_chat
- currentVariants: 今天這裡就是一直吊著人, 我一直在等下一個動靜
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.IDLE_BORING
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.scene_flicker_react

- key: classic.pool.scene_flicker_react
- category: ambient_chat
- currentVariants: 亮度變了, 剛剛是不是暗一下, 那個光怪怪的, 我看到閃一下, 那個角落有動, 不是我眼花吧, 是不是燈壞了, 怎麼忽明忽暗, 那個影子怪怪的, 有東西動
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SCENE_FLICKER_REACT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_fan

- key: classic.pool.sfx_react_fan
- category: ambient_chat
- currentVariants: 風扇聲是不是怪怪的, 剛剛風扇聲好像變重了, 你們有沒有覺得聲音不太一樣, 可能我錯覺 但我聽了不舒服, 我戴耳機整個毛起來, 那個聲音忽然壓過來 我好不舒服, 剛剛那陣聲音讓我背脊發緊, 我怎麼聽到一種越靠越近的感覺, 這個嗡嗡聲讓我心裡一直發毛, 你們也有聽到那種悶悶的變化嗎, 那聲音一下輕一下重 我快不敢聽, 我耳機裡那股聲音怪到不行
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FAN
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_footsteps

- key: classic.pool.sfx_react_footsteps
- category: ambient_chat
- currentVariants: 有腳步聲吧, 你們有聽到走路聲嗎, 剛剛那個是踩地板嗎, 好像有人在走, 不是風聲, 那個不是錯覺吧, 我有聽到, 有人走過去, 那聲音靠近了, 好像在旁邊, 不要嚇我, 這太怪了
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_FOOTSTEPS
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.sfx_react_ghost

- key: classic.pool.sfx_react_ghost
- category: ambient_chat
- currentVariants: 不對勁, 有點怪, 你們有聽到嗎, 那不是我, 我起雞皮疙瘩了, 等一下, 剛剛那個是什麼, 我不敢看了, 有點毛, 那聲音不正常, 你們不要亂講, 我覺得怪怪的, 是不是有人, 這樣不太對, 好像有東西
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SFX_REACT_GHOST
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.social_reply

- key: classic.pool.social_reply
- category: ambient_chat
- currentVariants: @{tag} 我也有同感, @{tag} 你這句太關鍵
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SOCIAL_REPLY
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.pool.system_prompt

- key: classic.pool.system_prompt
- category: ambient_chat
- currentVariants: 先穩住, 大家慢慢看
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: TYPE_FALLBACK_POOLS.SYSTEM_PROMPT
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.system.system_prompt

- key: classic.system.system_prompt
- category: ambient_chat
- currentVariants: 先穩住 這間房的節奏又變了, 大家先別急 我們慢慢盯, 聊天室先安靜一下看畫面
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: SYSTEM_POOLS.system_prompt
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Classic ambient chat pool.
- tonePack: classic_ambient
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.1

- key: classic.donate.1
- category: donate
- currentText: 很厲害，繼續加油！
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.10

- key: classic.donate.10
- category: donate
- currentText: 收下我的愛心星星。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.2

- key: classic.donate.2
- category: donate
- currentText: 欸 那邊真的亮了一點，整體順很多。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.3

- key: classic.donate.3
- category: donate
- currentText: 聊天室為你感到驕傲。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.4

- key: classic.donate.4
- category: donate
- currentText: 謝謝你沒有放棄。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.5

- key: classic.donate.5
- category: donate
- currentText: 這個節奏必須斗內。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.6

- key: classic.donate.6
- category: donate
- currentText: 超穩，這題答得漂亮。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.7

- key: classic.donate.7
- category: donate
- currentText: 後排送上應援。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.8

- key: classic.donate.8
- category: donate
- currentText: 房間氣氛真的變好了。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.donate.9

- key: classic.donate.9
- category: donate
- currentText: 再撐一下，感覺整個空間會更穩。
- sourceFile: src/content/pools/donatePools.json
- sourceSymbol: donatePools.messages
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Donation inserts used in classic ambient windows.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.corner

- key: classic.fake_ai.anchor.corner
- category: fake_ai
- currentVariants: 角落那邊怎麼那麼暗, 你是不是一直避開看角落, 角落那裡不太對
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.corner.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.door

- key: classic.fake_ai.anchor.door
- category: fake_ai
- currentVariants: 門縫那邊好像有動靜, 不要一直看門那裡, 門後面很暗
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.door.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.under_table

- key: classic.fake_ai.anchor.under_table
- category: fake_ai
- currentVariants: 桌子下面是不是有聲音, 你剛剛是不是往桌子那邊看, 桌子那邊太安靜了, 不要一直盯著桌腳
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.under_table.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.anchor.window

- key: classic.fake_ai.anchor.window
- category: fake_ai
- currentVariants: 窗邊的光怪怪的, 你有聽到窗那邊的聲音嗎, 不要靠窗太近
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.anchors.window.zhOnly
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.thai_flood

- key: classic.fake_ai.thai_flood
- category: fake_ai
- currentVariants: ฉันกำลังมองคุณอยู่, ฉันอยู่ข้างหลังคุณ, คุณเห็นฉันไหม, ข้างหลัง ข้างหลัง ข้างหลัง, อย่าหันกลับมา, คุณไม่ได้อยู่คนเดียว, ฉันเห็นคุณ, เงาอยู่ตรงนั้น, มันใกล้ขึ้นเรื่อยๆ, คุณแน่ใจเหรอ
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.thaiFlood
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.urban_legend.th

- key: classic.fake_ai.urban_legend.th
- category: fake_ai
- currentVariants: เขาว่ากันว่าที่นี่ไม่ว่าง, เงาไม่เคยหายไป, มันเคยเกิดขึ้นมาก่อน, อย่ามองนานเกินไป
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.urbanLegend_th
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

#### classic.fake_ai.urban_legend.zh

- key: classic.fake_ai.urban_legend.zh
- category: fake_ai
- currentVariants: 有人說這間老屋的傳聞都從那個位置開始, 你知道嗎 以前有人在這裡失蹤過, 這個地方有個很老的說法
- sourceFile: src/content/fakeAI/replies.json
- sourceSymbol: replies.urbanLegend_zh
- sourceOfTruth: registry
- ownership: mode_specific
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Fake AI suspense replies for classic chat.
- tonePack: classic_fake_ai
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: AMBIENT_ONLY (ambient_chat primary; allowed ambient_chat, donate, fake_ai) → player-facing message content.
- constraints: Use only pooled classic ambient content or donate/fake_ai inserts. | pool-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

### Runtime wrapper review

- No dedicated inferred runtime wrapper entry is emitted directly in this step. If the runtime still assembles a closing / abort / resolved line, that behavior remains runtime-owned and non-importable.

## FALLBACK_ONLY

- stepId: FALLBACK_ONLY
- stepPurpose: Safe fallback line when other classic selection paths are blocked or linted.
- canReply: no
- gateType: ambient_gate
- allowedCategories: fallback
- primaryCategory: fallback
- optionalCategories: none
- runtimeSelectionPolicy: single
- playerExperienceSummary: 玩家看到的是安全保底訊息，通常發生在其他來源不可用或被 guard 擋下時。主聲音偏系統安全網，不追求戲劇性。
- reviewNotesForStep: 最不能破壞的是安全、簡短、可無縫接回正常流程；此處不應承擔事件或 QnA 的主要敘事工作。
- sourceFilesInStep: src/chat/ChatPools.ts
- stepEntryCount: 1
- stepStatuses: active
- categoryOwnershipSummary:
  - fallback: shared_tooling / active / allowedStepIds=QNA_ABORTED, FALLBACK_ONLY
- runtimeWrapperVisibility: no inferred wrapper is primary for this step.

### Review framing

- 玩家通常看到什麼：玩家看到的是安全保底訊息，通常發生在其他來源不可用或被 guard 擋下時。主聲音偏系統安全網，不追求戲劇性。
- 主要聲音：安全 fallback / 系統保底
- 體驗目的：Guaranteed safe fallback.
- 最不能破壞：最不能破壞的是安全、簡短、可無縫接回正常流程；此處不應承擔事件或 QnA 的主要敘事工作。

### Message entries

#### classic.pool.safe_fallback

- key: classic.pool.safe_fallback
- category: fallback
- currentVariants: 先等一下 我雞皮疙瘩起來了, 這氣氛讓我不敢眨眼, 我整個人僵住了, 有人也覺得心裡發毛嗎, 先別刷太快 我還在抖, 我剛剛差點把手機丟出去, 這種安靜最可怕, 我耳機戴著整個不舒服, 你們先講話 我有點不敢看, 我現在只想先深呼吸, 這畫面越看越不對, 我真的有被嚇到
- sourceFile: src/chat/ChatPools.ts
- sourceSymbol: SAFE_FALLBACK_POOL
- sourceOfTruth: registry
- ownership: shared_tooling
- ownerMode: classic
- status: active
- eventKey: n/a
- qnaFlowId: n/a
- questionId: n/a
- tokens: none
- messagePurpose: Safe fallback pool used by classic selection/lint reroll.
- tonePack: 未設定
- runtimeWrapper: none
- importability: classic review-only / not importable
- usageContext: FALLBACK_ONLY (fallback primary; allowed fallback) → player-facing message content.
- constraints: Stay aligned with safe fallback pool / lint reroll usage. | lint-safe | Keep flow intent, category ownership, and existing runtime selection assumptions intact.
- reviewSlot: pending

### Runtime wrapper review

- No dedicated inferred runtime wrapper entry is emitted directly in this step. If the runtime still assembles a closing / abort / resolved line, that behavior remains runtime-owned and non-importable.

