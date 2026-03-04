## Summary
- 補齊 `sandbox_story` 子音 QnA 真流程：題目 tag + pinned render 後 freeze，玩家回覆走同一條 parse+judge（correct/wrong/unknown），並在 correct 時進入既有 WordRevealPipeline（無新增音效）。
- Consonant Prompt/SSOT 新增 `correctKeywords`、`unknownKeywords`，Night1 每題可定義 keyword。
- Debug 欄位補齊：`scheduler.phase`、`consonant.prompt.current`、`consonant.judge.lastInput/lastResult`、`word.reveal.phase/wordKey`、`lastWave.count/kind`、`blockedReason`。

## Changed
- `src/data/night1_words.ts`：每題增加 `correctKeywords`、`unknownKeywords`（含「不知道」族群）。
- `src/ssot/sandbox_story/types.ts`、`src/ssot/sandbox_story/night1.ts`：WordNode 接入 keyword 欄位。
- `src/modes/sandbox_story/classicConsonantAdapter.ts`：改為 sandbox keyword prompt + normalize parse + judge（correct/wrong/unknown）。
- `src/modes/sandbox_story/sandboxStoryMode.ts`：新增 consonant judge debug state，`commitConsonantJudgeResult` 串接 reveal。
- `src/app/App.tsx`：
  - sandbox 回覆改走 parse+judge+apply 同一路徑（包含 Debug simulate）。
  - correct：unfreeze 後 reveal → related wave → preNextPrompt → 下一題/awaitingTag。
  - unknown：走可持續推進路徑（不會卡死）。
  - wrong：pressure/retry 提示（不會卡死）。
  - Debug 面板補齊 judge 與 prompt.current 欄位。
- `src/ui/scene/SceneView.tsx`：補充 sandbox debug 型別。

## Removed
- None.

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [ ] No SSOT changes
- [x] SSOT changed
  - `src/ssot/sandbox_story/types.ts`
  - `src/ssot/sandbox_story/night1.ts`
  - `src/data/night1_words.ts`

## Debug fields (新增/調整)
- `scheduler.phase`（awaitingAnswer|revealingWord|chatWave|preNextPrompt|awaitingTag）
- `consonant.prompt.current`
- `consonant.judge.lastInput`
- `consonant.judge.lastResult`（correct|wrong|unknown|timeout|none）
- `word.reveal.phase`
- `word.reveal.wordKey`
- `lastWave.count`
- `lastWave.kind`
- `blockedReason`

## Acceptance (PASS/FAIL)
| Item | Result | Notes |
|---|---|---|
| ForceAskConsonantNow 題目流程 | PASS | tag + pinned 完成後才 freeze（沿用 `runTagStartFlow` append→scroll→pin→freeze）。 |
| 正確子音（如 บ） | PASS | Judge=correct，先 unfreeze，再 reveal → related wave → preNextPrompt → awaitingTag。 |
| 回覆「不知道」 | PASS | Judge=unknown，走可持續推進路徑（轉入 related wave，不會卡死）。 |
| 回覆錯誤內容 | PASS | Judge=wrong，給 retry 提示並保持可再次作答，不會卡死。 |
| Build | PASS | `npm run build` 通過。 |
