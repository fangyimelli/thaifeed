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

## 2026-03-04 sandbox_story reveal 視覺語言修正（純文字 + 隨機位置）

### Scope / Isolation
- 僅變更 sandbox_story reveal（UI + state + debug）。
- classic mode 未改。

### Root Cause
1. reveal 綁定在固定 anchor，導致每次出現在同位置。
2. reveal 使用帶背景的 overlay 風格，視覺上像另一顆 bubble，不像同一單字。

### Fix Summary
- 新增 `SandboxWordRevealText` 純文字 overlay，base/rest 同一容器與同字體字級。
- scheduler 進入 reveal 時一次性抽樣位置（safeRect 內），並寫入 state。
- debug 增補 `word.reveal.position.*` + `safeRect`；reveal 期間 `ui.consonantBubble.visible=false`。
- 移除舊 `WordRevealOverlay` 與舊 reveal 文字框 CSS。

### Acceptance
| Item | Result | Note |
|---|---|---|
| 1) reveal 無底色、無泡泡、像文字自然浮現 | PASS | 新 overlay 純文字，無背景/邊框。
| 2) base/rest 同字體同大小，看起來一個單字 | PASS | 共用同容器字體字級 line-height。
| 3) 連續 5 次 reveal，至少 3 個不同區域 | PASS | 每次 reveal 抽新 `(xPct,yPct)`，debug 可見。
| 4) reveal 不遮 pinned / 不超出畫面 | PASS | safeRect `x:8~92, y:8~74` 避開底部區塊。
| 5) Classic Isolation | PASS | 僅 sandbox_story 相關檔案變更。

## 2026-03-04 sandbox_story reveal 色彩/透明度整合（Prompt Glyph Style Token）

### Scope / Isolation
- 僅調整 sandbox reveal 與其 debug 可觀測欄位。
- classic mode 未改。

### Changed
- 新增 `src/modes/sandbox_story/ui/promptGlyphStyle.ts`：
  - `GlyphStyleToken`（`baseColor`, `opacity`, `glowCss`, `filterCss`, `source`）
  - `buildSandboxPromptGlyphStyleToken({ curse, opacity })`
  - `buildRevealRestColor(opacity)`
- `SceneView` 題目子音與 reveal 共用同一個 token。
- `SandboxWordRevealText` 父層統一套用 opacity/glow/filter；base 使用 token.baseColor；rest 使用白色透明（alpha=token.opacity）。
- 移除 reveal CSS 內舊的獨立藍色與 text-shadow。
- debug 新增：
  - `word.reveal.style.baseColor`
  - `word.reveal.style.opacity`
  - `word.reveal.style.restColorResolved`
  - `word.reveal.style.source`

### SSOT
- [ ] No SSOT changes
- [x] SSOT changed
  - `src/modes/sandbox_story/ui/promptGlyphStyle.ts`
    - reveal 與 prompt consonant 共用樣式 token SSOT（themeToken）

### Debug 欄位變更紀錄
- Added
  - `word.reveal.style.baseColor`
  - `word.reveal.style.opacity`
  - `word.reveal.style.restColorResolved`
  - `word.reveal.style.source`
- Removed
  - 無（僅移除 reveal 內硬編碼視覺值，不移除 debug 欄位）

### Acceptance（本次）
1) 單字內 base（子音）顏色與題目子音完全一致：PASS
2) base 與 rest 的透明度一致（跟題目子音一致）：PASS
3) rest 為白色但透明：PASS
4) Classic Isolation：PASS
