## Summary
- 僅修改 sandbox 範圍（sandbox_story mode state、sandbox 掛載 overlay、sandbox debug 欄位）；classic mode 無流程變更。
- 重做 WordRevealOverlay 並落地 A/B 規格管線：
  - 提供 `renderMode: "pair" | "fullWord"`。
  - 預設強制 `fullWord`（B 保底）確保可驗收。
  - 單一 text container 呈現，同字級同層級。
- reveal 時序改為 `enter -> pulse -> exit`：
  - enter 200ms fade in
  - pulse 同步閃爍 2 次（2 x 250ms）
  - exit 900ms scale up + fade out + translateY

## Changed Files
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - reveal phase 改名：`fadeIn/scaleUp/fadeOut` → `enter/pulse/exit`。
  - reveal state 新增：`renderMode/baseChar/restTextLen`。
  - 以 `Array.from(wordText)` 取得 `baseChar/rest`，並預設 `renderMode=fullWord`。
  - 若存在 Thai 組字疑慮（如 Mark 分離）直接 fallback fullWord。
- `src/ui/overlays/WordRevealOverlay.tsx`
  - 重做 overlay，使用單一 `<div class="word-reveal-text">` + spans。
  - fullWord 模式下顯示完整字，第一個 grapheme accent 上色。
- `src/ui/scene/SceneView.tsx`
  - overlay props 新增 `renderMode` 傳遞。
- `src/styles.css`
  - 動畫重做：`phase-enter` / `phase-pulse` / `phase-exit`。
  - pulse 改為同一文字容器同步閃爍 2 次；exit 改為 900ms 放大淡出。
- `src/app/App.tsx`
  - sandbox debug 新增：`word.reveal.renderMode/baseChar/restTextLen`。
  - scene 掛載 overlay 時傳入 `renderMode`。
  - pronounce 保留無 side effect。
- `README.md` / `docs/10-change-log.md`
  - 補上本次 A/B 規格、debug 欄位、Removed/Deprecated 記錄。

## Removed/Deprecated Log
- Deprecated（sandbox only）
  - 舊 `fadeIn/scaleUp/fadeOut` reveal phase 命名。
  - 舊「子音 + 小補字」雙容器非同字級顯示（預設改 fullWord）。

## SSOT 變更
- `SandboxRevealPhase`: `idle | enter | pulse | exit | done`
- 新增 sandbox reveal debug/狀態欄位：
  - `renderMode: "pair" | "fullWord"`
  - `baseChar: string`
  - `restTextLen: number`

## Debug 欄位變更紀錄
- Added
  - `word.reveal.renderMode`
  - `word.reveal.baseChar`
  - `word.reveal.restTextLen`
- Updated
  - `word.reveal.phase` 值域改為 `idle|enter|pulse|exit|done`

## Acceptance (PASS/FAIL)
1) 顯示尺寸：補字與子音同大小（或 fullWord 保底）: PASS（fullWord 預設）
2) 閃爍：至少 2 次同步 pulse: PASS（`phase-pulse` 2 iterations）
3) 動畫：變大後漸漸消失: PASS（`phase-exit` 900ms）
4) base 子音上色：fullWord 下第一個 grapheme 不同色: PASS
5) Classic Isolation: PASS（變更僅 sandbox 流程與 sandbox 掛載）

## Debug 驗收值（預期）
- `word.reveal.renderMode = fullWord`
- `word.reveal.baseChar = <wordText 第一個 grapheme>`
- `word.reveal.restTextLen = <wordText.length(Array.from)-1>`
- `word.reveal.phase` 會依序進入 `enter -> pulse -> exit -> done`
