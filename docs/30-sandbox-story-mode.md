# 30｜Sandbox Story Mode

## Repo Mapping

- Mode 介面：`src/modes/types.ts`
- Classic 包裝器：`src/modes/classic/classicMode.ts`
- Sandbox Story Engine：`src/modes/sandbox_story/sandboxStoryMode.ts`
- Sandbox Classic 子音適配器：`src/modes/sandbox_story/classicConsonantAdapter.ts`
- Story SSOT 型別：`src/ssot/sandbox_story/types.ts`
- Story SSOT 實例（Night1）：`src/ssot/sandbox_story/night1.ts`
- classic 子音題出題顯示（聊天室 boot 文案來源）：`src/core/state/reducer.ts`（`initialState.messages`）
- classic 子音答案判定：`src/core/systems/answerParser.ts`（`isAnswerCorrect` / `matchAnswerContains`）
- classic 子音資料與 alias 載入：`src/core/systems/consonantSelector.ts`（`resolvePlayableConsonant`）
- classic 正規化規則：`src/utils/inputNormalize.ts`（`normalizeInputForMatch`）
- classic 子音 alias SSOT：`src/content/pools/consonantAliasesCommon.json`

## Classic Reuse：Consonant Q/A

### classic 支援輸入格式（規則摘要）

- 泰文子音：normalized input 若包含 `targetConsonant.letter` 即視為命中。
- 注音：若包含該字任一 `bopomofo` alias 即命中。
- 拼音：
  - token 長度 >= 2：substring 命中即可。
  - token 長度 = 1：需 `allowSingleLetter=true` 且符合 roman boundary（避免誤判）。
- 正規化流程：lowercase + NFKC + 去空白 + 去標點/符號 + 去注音聲調符號。

### classic 題幹文字生成/顯示

classic 目前沒有獨立「子音題工廠函式」可直接 import；題幹呈現由 `initialState.messages` 的系統訊息與聊天室互動流程共同構成。sandbox 端以 adapter 沿用 classic 語氣，並用 `runTagStartFlow` 以聊天室 tag + pinned + freeze 方式顯示。

### sandbox adapter 如何呼叫 classic

- `getClassicConsonantPrompt(ctx)`：
  - 以 classic 既有語氣產生 prompt（給 tag 訊息與 pinned）。
  - expectedChar 以 sandbox node 的 `char` 對齊。
- `tryParseClassicConsonantAnswer(input, ctx)`：
  - 直接呼叫 classic `isAnswerCorrect`（非重寫 parser）。
  - debug 回傳 `kind/matchedAlias/inputNorm` 供 debug 面板顯示。

### fallback 說明

- 未使用 fallback parser：classic `isAnswerCorrect` 已可 import，sandbox 直接重用。
- 因 classic 無單一可 export 的「題幹生成函式」，sandbox 只在題幹顯示層做 adapter，並在文件記錄此限制。

## Story Engine 架構（Phase-based Scheduler）

`sandbox_story` 目前 phase：

- `boot`
- `awaitingConsonantTagPrompt`
- `pinnedFreezeAwaitConsonant`
- `revealingWord`
- `chatWaveRelated`
- `awaitingComprehensionTag`
- `pinnedFreezeAwaitAnswer`
- `resolvingComprehension`
- `ghostMotionPlaying`
- `postMotionWrapUp`

流程重點：

1. 先由 classic consonant adapter 出子音題。
2. freeze 等玩家輸入，parser 以 classic 規則判定。
3. 只有 `matchedChar === node.char` 才進入 `revealingWord`。
4. 後半段接 SSOT：字詞顯示 / 發音 / relatedTalk / 理解題 / 鬼動。

## Debug Tester（Sandbox Story）

在 `?mode=sandbox_story&debug=1` 下，Debug Panel 新增：

- `ForceAskConsonantNow`
- `SimulateConsonantAnswer(text)`
- `ForceRevealCurrent`
- `ForceAskComprehensionNow`
- `ForceGhostMotion`
- `ForceAdvanceNode`
- `ExportSSOT`
- `ImportSSOT`

Debug 欄位新增：

- `sandbox.consonant.nodeChar`
- `sandbox.consonant.promptText`
- `sandbox.consonant.parse.ok`
- `sandbox.consonant.parse.matchedChar`
- `sandbox.consonant.parse.kind`
- `sandbox.consonant.parse.matchedAlias`
- `sandbox.consonant.parse.inputNorm`
- `freeze.active / pinned.text`

## SSOT 修改方式（Sandbox）

- 來源資料仍以 `src/ssot/sandbox_story/night1.ts` 為主，`meta.version` 用於追蹤版本。
- 若要在執行時覆寫：先用 `ExportSSOT` 產生 JSON，再於瀏覽器修改 `localStorage['thaifeed.sandbox_story.ssot']`，最後按 `ImportSSOT` 套用。
- 匯入格式需符合 `NightScript` 結構，至少要包含 `nodes`。
