## Summary
- 僅修改 sandbox 範圍（`src/modes/sandbox_story/**`、sandbox 掛載 UI / debug）；classic mode 無行為變更、無 import sandbox-only logic。
- 修正 consonant prompt 三種結果：
  - correct：螢幕子音旁 overlay 補字（完整 appended）→ 放大淡出 → related chat wave 3~6 則 → 才進下一題。
  - wrong：overlay 顯示提示 appended（1~2 grapheme）→ 放大淡出，並送出 hint 文字，同題重答。
  - unknown：一定送出 hint 文字（不再只有「收到不知道」），同題重答。
- 單一真相來源：overlay / pinned / judge 全部綁 `sandbox.prompt.current`，維持 `promptId` 一致；`sandbox.prompt.mismatch` 持續可觀測。

## Changed Files
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - reveal phase 調整為 `fadeIn/scaleUp/fadeOut`，新增 `awaitingWave`。
  - reveal state 新增 `appended/mode`；新增 hint state `sandbox.hint.lastText/count`。
  - correct 完成 reveal 後進 `awaitingWave`；`markWaveDone` 才推進到下一題。
- `src/modes/sandbox_story/classicHintAdapter.ts`（new）
  - 透過 adapter 呼叫 classic hint 產生器供 sandbox 使用。
- `src/app/App.tsx`
  - sandbox 判題分支：wrong/unknown 必送 hint 並記錄 `commitHintText`。
  - correct 流程新增 related wave（3~6）完成後 `markWaveDone`。
  - pronounce state 保留 `idle`（無 side effect）。
  - debug 同步新增 prompt/hint/reveal/wave 欄位。
- `src/ui/scene/SceneView.tsx` + `src/ui/overlays/WordRevealOverlay.tsx` + `src/styles.css`
  - overlay 改掛在子音 glyph 旁，且動畫符合 fadeIn→scaleUp→fadeOut。
- `src/data/night1_words.ts` + `src/ssot/sandbox_story/types.ts` + `src/ssot/sandbox_story/night1.ts`
  - SSOT 新增 `hintAppend` / `hintAppendPrefixLen` 管道，供 wrong/unknown 提示補字使用。

## Removed/Deprecated Log
- Deprecated（sandbox only）
  - unknown 僅回覆「收到不知道」且未附提示文字的舊行為。

## SSOT 變更
- Added
  - `WordNode.hintAppend?: string`
  - `WordNode.hintAppendPrefixLen?: number`
- Retained
  - `sandbox.prompt.current` 作為 overlay/pinned/judge 單一真相來源。

## Debug 欄位變更紀錄
- Added / Expanded
  - `sandbox.prompt.current.promptId/kind/consonant/wordKey`
  - `sandbox.prompt.mismatch`
  - `sandbox.judge.lastInput/lastResult`（沿用並校驗）
  - `sandbox.hint.lastText/hint.count`
  - `word.reveal.base/appended/phase`
  - `lastWave.count/lastWave.kind`

## Acceptance (PASS/FAIL)
1) unknown：輸入「不知道」必出提示文字且同題可重答：PASS
2) wrong：錯字母會出提示且同題重答，overlay 在子音旁顯示提示補字並放大消失：PASS
3) correct：正確子音會補齊單字並放大消失，產生 related 3~6 則後才下一題：PASS
4) prompt 同步：overlay 與 pinned promptId 一致、`mismatch=false`：PASS
5) Classic Isolation：classic 不受影響：PASS
