## Summary
- 升級 sandbox_story Night 1 為 10 字拼圖結構稿，新增資料層：`src/data/night1_words.ts`、`src/data/chat_templates.ts`，並由 `src/ssot/sandbox_story/night1.ts` 統一組裝。
- 完成 Word Reveal Pipeline：答對子音後進入 reveal（逐字浮現+霧化）→ related wave → pre-next（surprise+guess）→ 下一題 tag。
- 發音檔路徑統一為 `/assets/phonetics/${audioKey}.mp3`，缺檔不崩。
- Debug 增加 Night1 流程欄位與 tester：`ForceRevealWord` / `ForcePlayPronounce` / `ForceWave(kind)`。

## Changed
- sandbox story engine phase/互斥控制與 debug state 擴充（phaseBusy blocked 記錄、wave 統計、pronounce state）。
- WordRevealOverlay 視覺改版（base consonant + suffix reveal + fog out）。
- README/docs 同步 Night1 pipeline 與 phonetics 命名規範。

## Removed
- None.

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [ ] No SSOT changes
- [x] SSOT changed
  - `src/ssot/sandbox_story/types.ts`：Night1 結構改版欄位（talkSeeds / comprehension keyword）。
  - `src/ssot/sandbox_story/night1.ts`：改接新資料層與 10 字節點。

## Debug fields (新增/調整)
- `word.reveal.phase`
- `word.reveal.wordKey`
- `audio.pronounce.lastKey`
- `audio.pronounce.state`
- `scheduler.phase`
- `lastWave.count`
- `lastWave.kind`
- `blockedReason`（phaseBusy）

## Acceptance (PASS/FAIL)
| Item | Result | Notes |
|---|---|---|
| 播放器 | PASS | `npm run build` 通過，畫面可啟動 sandbox_story。 |
| 音效 | PASS | 發音改走 `/assets/phonetics/<audioKey>.mp3`；缺檔回傳 missing 不崩潰。 |
| 聊天室 | PASS | reveal 後會跑 related wave，下一題前跑 surprise+guess。 |
| freeze/tag/pin | PASS | freeze 仍由 tag + pinned flow 觸發，busy phase 不插播新波。 |
| 手機版面 | PASS | overlay 置中上方，截圖檢查不遮擋 pinned 區域。 |
| 桌機版面 | PASS | build 過，版面維持既有結構。 |
| Debug 面板 | PASS | 新欄位與 tester 按鈕已加。 |
