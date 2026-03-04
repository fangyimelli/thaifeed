## Summary
- 只修改 sandbox 範圍：`src/modes/sandbox_story/**` 與 sandbox 掛載邏輯（`src/app/App.tsx`），未改 classic engine。
- 修正 sandbox_story Overlay 與 pinned 題目不一致：兩者改用同一個 `sandbox.prompt.current`（PromptCoordinator）單一真相來源。
- 加入 sandbox pinned writer guard：sandbox 期間只允許 `sandboxPromptCoordinator` 寫 pinned，其他來源阻擋並寫 debug。
- 「不知道」流程保持同一 promptId，不會切換成 comprehension 其他題型。

## Root-cause 排查
1) Overlay 子音來源
- 先前 `SceneView` 讀 `state.currentConsonant.letter`，未綁 sandbox prompt，會與 sandbox 題目不同步。

2) pinned 題目來源
- 由 `runTagStartFlow(... setPinnedReply ...)` 觸發，原本 qna/event/sandbox 都能更新 `lastQuestionMessageId`，sandbox 無 writer guard。

3) scheduler.phase 寫入檢查
- sandbox `awaitingAnswer` 期間仍可能被其他流程（qna/event）嘗試寫 pinned；現在 guard 會阻擋並標記 `phaseBusy` / `writerNotAllowed`。

4) 「不知道」覆寫檢查
- 先前 unknown 會送提示並可能重新走其他出題路徑；現在 unknown 保持 `sandbox.prompt.current` 不變，promptId 不變。

## Changed
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - 新增 `SandboxPrompt` 與 `state.prompt.current`。
  - 新增 prompt 一致性 debug 狀態：overlay/pinned promptId + mismatch。
  - 新增 coordinator API：`setCurrentPrompt/getCurrentPrompt/commitPromptOverlay/commitPromptPinnedRendered/commitPinnedWriter`。
- `src/app/App.tsx`
  - sandbox 出題時建立 `SandboxPrompt`，messageId 與 promptId 綁定。
  - 新增 `setPinnedQuestionMessage()` writer guard（sandbox only）。
  - Overlay 顯示改讀 `getSandboxOverlayConsonant()`（來自 prompt.current）。
  - sandbox 答題解析改讀 current prompt（不是直接依 node state）。
  - debug 新增 `sandbox.prompt.*` 與 `pinned.lastWriter.*`。
- `src/ui/scene/SceneView.tsx`
  - 擴充 debug 型別，加入 `sandbox.prompt.*` 結構。
- `README.md`
  - 新增 Sandbox PromptCoordinator / pinned writer guard / 一致性 debug 欄位。
- `docs/10-change-log.md`
  - 新增本次變更記錄。

## Removed/Deprecated Log
- Removed（sandbox only）
  - 無（本次為整合修正，不新增移除項）。

## SSOT
- Added（sandbox only）
  - `sandbox.prompt.current`（PromptCoordinator 單一真相來源）。
- Classic SSOT
  - 無變更。

## Debug fields change log
- Added
  - `sandbox.prompt.current.kind`
  - `sandbox.prompt.current.promptId`
  - `sandbox.prompt.overlay.consonantShown`
  - `sandbox.prompt.pinned.promptIdRendered`
  - `sandbox.prompt.mismatch`
  - `sandbox.prompt.pinned.lastWriter.source`
  - `sandbox.prompt.pinned.lastWriter.writerBlocked`
  - `sandbox.prompt.pinned.lastWriter.blockedReason`

## Acceptance (PASS/FAIL)
1) sandbox_story 畫面顯示「ฉ」時，pinned 同題子音題：PASS
2) 回覆「不知道」後 promptId 不變、同題維持：PASS
3) Debug `sandbox.prompt.mismatch` 永遠為 false：PASS
4) Classic Isolation（classic pinned/overlay 行為不變，且 classic 不 import sandbox coordinator）：PASS
