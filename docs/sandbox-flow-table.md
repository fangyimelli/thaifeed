# Sandbox Experience-First Flow Table (SSOT)

## Night 開場
- PREJOIN: 玩家進場，不出題。
- PREHEAT (30 秒): 熟客聊天 / VIP 打招呼 / 舊事件回顧 / 真假討論。
- 30 秒後才允許進入題 1。

## 每題固定 10 段節奏
1. **A 畫面出字**：overlay 只顯示新泰文子音（glyph）。
2. **B 聊天室暴動 1**：4~8 則亂猜讀音。
3. **C 正式 tag 第一層**：單一 emitter（mod_live）只發 1 則。
4. **D WAIT_REPLY Freeze**：0 輸出，reply gate armed，sanityPressure 持續上升。
5. **E backlog flush**：玩家一回覆，技術故障 backlog 一次刷出。
6. **F 立刻補字**：立刻從子音補成單字。
7. **G 聊天室暴動 2**：4~8 則亂猜字義。
8. **H VIP 總結**：VIP 單句收束，不重複 tag。
9. **I 聊天室推理**：3~6 則討論身份或動機。
10. **J 正式 tag 第二層**：單一 emitter 只發 1 則；玩家答完即推下一題。

## 題號主題
- 題 1~3：身份 / 性別 / 對象線索（不正式給選項）。
- 題 4：第一次正式猜身份。
- 題 5~8：動機線索。
- 題 9：正式猜動機。
- 題 10：恐怖總結（「看你後面 / 我在你後面 / 我正在看你」語氣）。

## 角色分工
- VIP：開場熟客感 + 暴動後總結。
- mod_live：正式 tag 提問者（每層只 1 則）。
- viewer：暴動、亂猜、懷疑真假（WAIT_REPLY 期間不得發言）。

## Auto Play Night
- `autoplayNightEnabled=true` 時，Night 自動跑到題 10。
- WAIT_REPLY 會保留 freeze/backlog/san 壓力，再自動注入 mock reply 推進。
- Debug 必看：`autoplayNightEnabled`, `autoplayNightStatus`, `waitingForMockReply`, `questionIndex`, `phase`。
