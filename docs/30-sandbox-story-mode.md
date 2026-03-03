# 30｜Sandbox Story Mode

## Repo Mapping

- Mode 介面：`src/modes/types.ts`
- Classic 包裝器：`src/modes/classic/classicMode.ts`
- Sandbox Story Engine：`src/modes/sandbox_story/sandboxStoryMode.ts`
- Story SSOT 型別：`src/ssot/sandbox_story/types.ts`
- Story SSOT 實例（Night1）：`src/ssot/sandbox_story/night1.ts`

## Story Engine 架構（Phase-based Scheduler）

`sandbox_story` 為資料驅動模式，第一階段先完成路由與排程骨架：

- 由 `createSandboxStoryMode()` 讀取 `NIGHT1`。
- 內部狀態：
  - `nodeIndex`：目前故事節點索引。
  - `scheduler.phase`：目前 phase。
- 第一階段 phase：
  - `boot`
  - `awaitingQuestionReady`
  - `revealingWord`
  - `chatWaveRelated`
  - `awaitingComprehensionTag`
  - `pinnedFreezeAwaitAnswer`
  - `resolvingComprehension`
  - `ghostMotionPlaying`
  - `postMotionWrapUp`

目前 `ghostMotionPlaying` 先保留為空行為（stub），後續再接動畫/鬼動。

## SSOT 結構

`WordNode` 必備欄位：

- `id`
- `char`
- `word`
- `highlightChar`
- `audioKey`
- `story.identity`
- `story.emotion`
- `story.hintZH`
- `relatedTalk`
- `comprehensionQuestion`

`comprehensionQuestion` 結構：

- `text`
- `options`
- `correctOptionId`
- `ghostMotionOnCorrect`

`NightScript` 由以下四個頂層組成：

- `meta`
- `nodes`
- `ghostMotions`
- `chatTemplates`
