# 08｜Mobile Layout（手機版面）

## 這份文件在管什麼

手機版高度計算、鍵盤互動、輸入列與捲底策略，以及 desktop/mobile 分流原則。

## 版面核心原則

- Mobile 與 Desktop 可分流布局，但業務邏輯不得分叉。
- 手機重點：
  1. 打字時仍看得到影片
  2. 輸入列可穩定出現
  3. 最後一則訊息不被輸入列蓋住

## 100dvh 與 visualViewport

- 容器高度優先使用 `100dvh` / `visualViewport.height` 變數驅動。
- 監聽 viewport resize，處理鍵盤開關造成的高度變化。
- 不使用 `window.scrollTo` 假裝收鍵盤。

## 輸入列與捲底策略

- 輸入列採常駐渲染；初始化中可禁用但不隱藏。
- chat scroll 需留出動態 `padding-bottom`（依 input 實高）。
- 送出後要做：append 捲底 → blur/關鍵盤 → 延遲補捲底。

## 手機不裁切修正

- mobile 下影片容器需限制 `width:100%`、`max-width:100vw`。
- 影片顯示優先 `object-fit: contain`，避免左右裁切。
- 避免在 mobile 套用會放大裁切的視覺 transform。

## Desktop/Mobile 分流原則

- Desktop（>=1024px）：維持雙欄、一般滾動，不套手機鍵盤補償。
- Mobile（<1024px）：三段式（header/video/chat+input）與鍵盤補償。
- 分流僅限 layout/CSS，不得複製 player/chat/event 邏輯。

## 驗收清單

1. 首次進站（初始化中）輸入列可見。
2. 鍵盤打開時影片仍可見。
3. 送出後聊天室保持在底部。
4. 手機橫直切換不出現黑邊或內容跳位。

## 相關文件

- [05 Chat System](./05-chat-system.md)
- [07 Debug System](./07-debug-system.md)
- [09 Troubleshooting](./09-troubleshooting.md)
