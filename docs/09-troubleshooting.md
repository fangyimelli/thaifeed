# 09｜Troubleshooting（問題排查對照表）

## 這份文件在管什麼

將常見症狀對應到「先看哪些 debug 欄位、常見原因、應回頭改哪個 SSOT 檔案」。

## 症狀對照表

| 症狀 | 先看哪些欄位 | 常見原因 | 優先調整的 SSOT 檔案 |
|---|---|---|---|
| 永遠停在 loop3 | `plannedJump`、`dueAt/diffMs`、`unavailableJumps`、`why not jumped` | JUMP 候選全被 gate、pick 邏輯抽不到、timer/watchdog 漏觸發 | `src/config/oldhousePlayback.ts`、`src/ui/scene/SceneView.tsx`、`src/core/player/playerCore.ts` |
| 插播後不回主循環 | `lastFallback`、`ended handler`、`isSwitching` | ended 未觸發、fallback timer 未設或被覆蓋、lock 未釋放 | `src/core/player/playerCore.ts`、`src/ui/scene/SceneView.tsx` |
| 事件按鈕沒反應 | `event.lastEvent/reason`、`event.blocked`、`event.queue` | 事件未註冊、被 cooldown/guard 擋下、Event Tester 沒接到正確 key | `src/director/EventRegistry.ts`、`src/director/EventEngine.ts` |
| pre-effect 有跑但 tag 失敗 | `event.sfx`、`chat.lastPickedType`、`event.abort reason` | starter tag 流程中斷、tag 規則不符 active users、事件未回復狀態 | `src/director/EventEngine.ts`、`src/chat/ChatRules.ts`、`src/chat/ChatSelector.ts` |
| 手機送出偶發無反應 | `isSending`、`activeElement`、`visualViewport.height`、`chat scroll` | 送出流程非單一路徑、IME 判斷漏網、鍵盤關閉後未補捲底 | `src/app/App.tsx`、`src/ui/chat/ChatPanel.tsx`、`src/utils/isMobile.ts` |
| 鬼聲來源不合規（同時多音源） | `activeKey`、videoA/videoB muted/volume、`event.sfxCooldowns` | inactive video 未靜音、SFX 互斥未生效、audio lane 未切換 | `src/core/player/playerCore.ts`、`src/audio/AudioEngine.ts`、`src/audio/SfxRegistry.ts` |

## 快速排查流程

1. 先從 Debug overlay 定位哪個子系統異常（player/audio/chat/event/mobile）。
2. 用本表對應到 SSOT 檔案，不要直接在外層加 workaround。
3. 修完後跑一次對應驗收，並更新：
   - 相關 docs 分頁
   - README 入口索引
   - `docs/10-change-log.md`
