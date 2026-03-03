## Summary
- 新增 Sandbox Story Mode Engine（Stage 1）：建立 mode routing 介面、sandbox story engine、SSOT story 結構與 Night1 測試資料。
- 新增 classic wrapper（只包裝既有流程，不改 classic 行為）。
- Debug panel 擴充 sandbox 可觀測欄位。
- 新增 sandbox story 文件並同步 README/變更紀錄。

## Changed
- `src/ssot/sandbox_story/types.ts`（NEW）
- `src/ssot/sandbox_story/night1.ts`（NEW）
- `src/modes/types.ts`（NEW）
- `src/modes/classic/classicMode.ts`（NEW）
- `src/modes/sandbox_story/sandboxStoryMode.ts`（NEW）
- `docs/30-sandbox-story-mode.md`（NEW）
- `src/app/App.tsx`（UPDATE：mode router wiring + sandbox debug state）
- `src/ui/scene/SceneView.tsx`（UPDATE：debug 面板欄位）
- `README.md`（UPDATE）
- `docs/10-change-log.md`（UPDATE）
- `PR_NOTES.md`（UPDATE）

## Removed
- Item: 無
- Reason: N/A
- Impact: N/A
- Alternative: N/A

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated
- [x] docs/30-sandbox-story-mode.md added

## SSOT
- [x] SSOT changed
  - `src/ssot/sandbox_story/types.ts`
  - `src/ssot/sandbox_story/night1.ts`

## Debug 欄位變更
- 新增：
  - `mode.id`
  - `sandbox.nodeIndex`
  - `sandbox.scheduler.phase`
  - `sandbox.currentNode.word`
  - `sandbox.currentNode.char`

## Impact Scope
- 類型：feature + docs
- 程式邏輯：新增 sandbox mode，不改 classic 既有行為
- UI 行為：debug panel 新增 sandbox 觀測欄位
- 資料：新增 sandbox story SSOT

## Acceptance
- 播放器：PASS（build 通過；本次未改播放器核心邏輯）
- 音效：PASS（build 通過；本次未改音效核心邏輯）
- 聊天室：PASS（build 通過；未改聊天室主流程）
- 手機版面：PASS（build 通過；未改 layout 主邏輯）
- 桌機版面：PASS（build 通過；未改 layout 主邏輯）
- Debug 面板：PASS（已新增並顯示 mode/sandbox 欄位）
- Docs：PASS（README + changelog + 新文件）

## Checks
1. `npm run build`
2. `git diff -- src/ssot/sandbox_story/types.ts src/ssot/sandbox_story/night1.ts src/modes/types.ts src/modes/classic/classicMode.ts src/modes/sandbox_story/sandboxStoryMode.ts src/app/App.tsx src/ui/scene/SceneView.tsx docs/30-sandbox-story-mode.md README.md docs/10-change-log.md PR_NOTES.md`
