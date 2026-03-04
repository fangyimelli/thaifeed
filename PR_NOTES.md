## Summary
- 只修改 sandbox 範圍：`src/modes/sandbox_story/**`、sandbox 掛載流程（`src/app/App.tsx`）與 sandbox reveal UI；classic mode engine 未改。
- 修正 sandbox 子音 PASS 不換題問題：PASS reveal 完成後立即推進到下一題，並同步 index/consonant/wordKey debug。
- 調整 sandbox reveal：同框顯示 baseConsonant + appended（逐字補齊），PASS 後僅 reveal 動畫，不再出 related/preNextPrompt 波。
- sandbox unknown/wrong 改走 classic 風格提示（adapter 提供 hint），並維持同題 awaitingAnswer 重答。
- 新增 sandbox ghost gate 與 fear-footsteps 綁定規則，鬼動理由與 footsteps 機率/冷卻可在 debug 觀測。

## Changed
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - phase 收斂為 `awaitingTag|awaitingAnswer|revealingWord`
  - `markRevealDone()` 直接推進下一題
  - `canTriggerGhostMotion()`、`registerFootstepsRoll()`
  - fear debug 新增 footsteps probability/cooldown/lastAt
- `src/modes/sandbox_story/classicConsonantAdapter.ts`
  - 新增 `getHintForConsonantPrompt()`
- `src/ui/overlays/WordRevealOverlay.tsx`
  - 改為 grapheme-safe appended reveal（`Array.from`）
- `src/styles.css`
  - reveal 動畫調整：fadeIn 800ms / hold scale / fogOut 900ms，並上移避免壓住 pinned
- `src/app/App.tsx`
  - sandbox answer phase 改用 `awaitingAnswer`
  - unknown/wrong 顯示 classic 風格提示且不推進題目
  - 移除 PASS 後 related/preNextPrompt wave 流程
  - sandbox debug 欄位補齊：consonant current*、judge、scheduler.phase、word.reveal.phase、ghost gate、footsteps*
  - sandbox tick 以 fear 驅動 footsteps roll
- `src/data/night1_words.ts`
  - unknownKeywords 補上 `不確定`

## Removed/Deprecated Log
- Removed（sandbox only）
  - PASS 後 related chatWave
  - PASS 後 preNextPrompt 驚訝/猜測 wave

## SSOT
- No SSOT schema changes.

## Debug fields change log
- Added
  - `sandbox.consonant.currentIndex`
  - `sandbox.consonant.currentConsonant`
  - `sandbox.consonant.currentWordKey`
  - `sandbox.consonant.judge.lastInput`
  - `sandbox.consonant.judge.lastResult`
  - `scheduler.phase`（awaitingTag|awaitingAnswer|revealingWord）
  - `word.reveal.phase`
  - `ghost.gate.lastReason`
  - `footsteps.probability`
  - `footsteps.cooldownRemaining`
  - `footsteps.lastAt`

## Acceptance (PASS/FAIL)
1) Sandbox 子音 PASS 會換題：PASS
2) 單字在子音旁邊逐字補齊（不是另外顯示）：PASS
3) PASS 後不出觀眾討論波、直接下一題：PASS
4) 回答「不知道」會出 classic 風格提示且同題可重答：PASS
5) 子音 PASS 不會觸發鬼動；只有 comprehension correct 才會：PASS（sandbox 子音流程固定 blocked）
6) 腳步聲頻率隨 SAN（fearLevel）上升而提高：PASS
7) Classic Isolation（classic 完全不受 sandbox 影響）：PASS
