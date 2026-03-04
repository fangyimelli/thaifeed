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

## Debug Tester（Sandbox Story）

在 `?mode=sandbox_story&debug=1` 下，Debug Panel 新增：

- `ForceRevealCurrent`：立即顯示當前字詞 Overlay，並嘗試播放發音。
- `ForceAskComprehensionNow`：直接跳到理解題提問階段。
- `ForceGhostMotion`：強制執行當前節點的鬼動包（含 SFX、黑幕閃爍、影片切換）。
- `ForceAdvanceNode`：推進到下一個節點。
- `ExportSSOT`：將目前 NightScript 匯出至 `localStorage`。
- `ImportSSOT`：從 `localStorage` 匯入 NightScript，失敗時不拋錯。

Debug 欄位新增：

- `sandbox.reveal.visible`
- `sandbox.reveal.phase`
- `sandbox.ghostMotion.lastId`
- `sandbox.ghostMotion.state`
- `sandbox.ssot.version`

## SSOT 修改方式（Sandbox）

- 來源資料仍以 `src/ssot/sandbox_story/night1.ts` 為主，`meta.version` 用於追蹤版本。
- 若要在執行時覆寫：先用 `ExportSSOT` 產生 JSON，再於瀏覽器修改 `localStorage['thaifeed.sandbox_story.ssot']`，最後按 `ImportSSOT` 套用。
- 匯入格式需符合 `NightScript` 結構，至少要包含 `nodes`。
