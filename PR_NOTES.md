## Summary
- Sandbox Story Mode 整合 classic 子音答題規則：先做子音題 freeze，答對後才進入 SSOT 單字揭露與後續節點。
- Classic 行為不修改；sandbox 透過 adapter 讀取 classic parser/資料。
- Sandbox Story Mode Debug Panel 新增 Fear Meter Monitor（僅 sandbox_story 顯示）。

## Changed
- `src/modes/sandbox_story/classicConsonantAdapter.ts`（NEW）
- `src/modes/sandbox_story/sandboxStoryMode.ts`（UPDATE：新增子音 phase + parse debug state）
- `src/app/App.tsx`（UPDATE：sandbox 子音題流程、freeze/pinned、debug 欄位、tester）
- `src/styles.css`（UPDATE：Fear debug block 樣式）
- `docs/30-sandbox-story-mode.md`（UPDATE）
- `docs/10-change-log.md`（UPDATE）
- `README.md`（UPDATE）

## Impact Scope
- 僅 sandbox mode（`sandbox_story`）
- classic mode 0 變動（未修改 `src/modes/classic/*` 與 classic runtime 檔案）
- Fear Monitor 與 Add/Reset tools 皆只在 sandbox Debug Panel 出現

## Acceptance
- 播放器：PASS
- 音效：PASS
- 聊天室：PASS（sandbox 子音題 freeze，答對才推進）
- 手機版面：PASS
- 桌機版面：PASS
- Debug：PASS（新增 sandbox.consonant.* + tester）
- Debug：PASS（新增 Fear System / Fear Meter / Triggers / Add+Reset Fear）
- Docs：PASS
- classic mode 0 變動：PASS（見 `git diff -- src/modes/classic` 為空）

## Checks
1. `npm run build`
2. `git diff -- src/modes/classic`
3. `git diff -- src/modes/sandbox_story src/app/App.tsx src/styles.css docs/10-change-log.md README.md PR_NOTES.md`
