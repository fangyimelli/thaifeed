## Summary
- 新增 `docs/20-classic-mode-architecture.md`，以目前 repo 實際程式為準，完整記錄 classic mode 的架構：入口、模組邊界、runtime data flow、state machine、chat/tag/reply/freeze 契約、video/audio/debug 契約、extension points 與已知問題。
- 更新 `README.md`，新增 Architecture Docs 區塊並加入新文件索引。
- 更新 `docs/10-change-log.md`，記錄本次 docs-only 變更。

## Changed
- `docs/20-classic-mode-architecture.md`（NEW）
- `README.md`（UPDATE：新增 Architecture Docs 連結）
- `docs/10-change-log.md`（UPDATE：新增本次 Changed/Docs 紀錄）
- `PR_NOTES.md`（UPDATE）

## Removed
- Item: 無（本次未刪除/停用/移除任何功能）
- Reason: N/A
- Impact: N/A
- Alternative: N/A

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [x] No SSOT changes
- [ ] SSOT changed (list files + reasons below)

## Debug 欄位變更
- 本次無新增/移除 debug 欄位（僅文件化既有欄位來源與排查流程）。
- 三次 PR 規則：不涉及欄位增刪。

## Impact Scope
- 類型：docs-only
- 程式邏輯：未改動
- UI 行為：未改動
- 資料/素材：未改動

## Acceptance
- 播放器：PASS（未改動）
- 音效：PASS（未改動）
- 聊天室：PASS（未改動）
- 手機版面：PASS（未改動）
- 桌機版面：PASS（未改動）
- Debug 面板：PASS（未改動）
- Docs：PASS（新增 `docs/20-classic-mode-architecture.md` 且 README 有索引）

## Checks
1. `npm run build`
2. `npm run lint`（若專案未提供 lint script，略過並註記）
3. `git diff -- docs/20-classic-mode-architecture.md README.md docs/10-change-log.md PR_NOTES.md`
