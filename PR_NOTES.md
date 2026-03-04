## Summary
- 本次僅修改 sandbox_story 範圍，將 reveal 強制收斂為 A：單一 overlay、同字級雙段字、同步閃爍、整體一起放大淡出。
- 移除舊有 `renderMode`（pair/fullWord）分流，避免 B 路徑與 A 並存造成視覺衝突。
- 加入 Thai grapheme splitter（`Intl.Segmenter` 優先，`Array.from` fallback）並擴充 debug 欄位。

## Changed
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - reveal state 改為 `baseGrapheme/restText/restLen/splitter`。
  - appended 計算固定以第一個 grapheme 之後為 rest。
  - wrong/unknown 維持 hint rest（1~2 grapheme 或節點 hint），correct 則顯示完整 rest。
  - reveal phase tick 改為 `reveal.visible` 驅動，wrong/unknown 也完整跑 enter/pulse/exit。
- `src/ui/overlays/WordRevealOverlay.tsx`
  - 重做為單一 overlay，結構固定：`revealGlyph--base + revealGlyph--rest`。
- `src/ui/scene/SceneView.tsx`
  - reveal 期間隱藏子音泡泡（guard 只在 sandbox reveal 活躍時成立）。
- `src/styles.css`
  - base/rest 共用 `revealGlyph` 字級/行高。
  - pulse 套在父層（2x），exit 套在父層（scale+fade+translate）。
- `src/app/App.tsx`
  - scene props 改為傳 `baseText/restText`。
  - debug 改為輸出 `word.reveal.baseGrapheme/restText/restLen/splitter` 與 `ui.consonantBubble.visible`。

## Removed
- Item: sandbox reveal `renderMode`（pair/fullWord）分流與其 debug 欄位。
- Reason: 本次需求強制 A 單一路徑，禁止 B 作為預設或保底。
- Impact: reveal 一律同版型與同動畫，不再出現雙元素/雙字級視覺偏差。
- Alternative: 無（本次明確禁止 A/B 共存）。

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [ ] No SSOT changes
- [x] SSOT changed (list files + reasons below)
  - `src/modes/sandbox_story/sandboxStoryMode.ts`
    - reveal state SSOT：`baseGrapheme/restText/restLen/splitter`
    - grapheme splitter SSOT：`segmenter|arrayfrom`

## Debug 欄位變更紀錄
- Added
  - `ui.consonantBubble.visible`
  - `word.reveal.baseGrapheme`
  - `word.reveal.restText`
  - `word.reveal.restLen`
  - `word.reveal.splitter`
- Removed
  - `word.reveal.renderMode`
  - `word.reveal.baseChar`
  - `word.reveal.restTextLen`

## Acceptance
- Debug fields checked: yes（已確認新增欄位可由 sandbox debug 寫入）
- Desktop check: build pass
- Mobile check: build pass（RWD CSS 規則已同步）
