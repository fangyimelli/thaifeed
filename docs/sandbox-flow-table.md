# Sandbox Flow Spec
Version: 2026-03-06
Last Updated By: Codex

> SSOT for sandbox flow. This document applies to sandbox mode only. Classic mode behavior is unchanged.

| Step | Description | Chat Frequency | Reply-To | Tech Backlog | Overlay | Example Messages |
|---|---|---|---|---|---|---|
| PREJOIN | 玩家尚未提交使用者名稱，sandbox 不得輸出聊天室訊息、不得預熱、不得出題。 | 0 output（完全靜止） | inactive | disabled | hidden | （無訊息） |
| PREHEAT | 玩家提交名稱後開始 30 秒預熱，只允許寒暄/打招呼/熟客互動，不得出題。 | 接近 classic 一般聊天頻率 | inactive | disabled | hidden | `👑 behindyou: 我先坐前排，今天先看節奏。` |
| TAG_PLAYER_1 | 預熱結束後進第一段 tag，對玩家提問並進入強制回覆。 | 單則 tag 後立即停住 | active（classic reply-to） | disabled | shown（子音提示可見） | `mod_live: @player 你先回一個你看到的子音。` |
| WAIT_REPLY_1 | 第一段等待玩家回覆。只要 reply-to active 必須 0 output。 | 0 output（freeze） | active（不可取消） | disabled | shown | （無訊息，等待玩家送出回覆） |
| POSSESSION_AUTOFILL | 玩家回覆後，自動填入單字到輸入框。 | 0~低頻（系統動作） | inactive | disabled | shown | （UI 自動填字，不發聊天） |
| POSSESSION_AUTOSEND | 自動送出填入內容，走同一送出管線。 | 低頻（單次送出） | inactive | disabled | shown | `you: หมา` |
| CROWD_REACT_WORD | 觀眾先針對單字做短討論，不可直接亂洗版。 | 短波段（4~8 則） | inactive | disabled | shown | `viewer_321: 這個拼音到底怎唸？` |
| TAG_PLAYER_2_PRONOUNCE | 第二段 tag（發音/延伸追問），再進 reply-to。 | 單則 tag 後立即停住 | active（classic reply-to） | disabled | shown | `👑 behindyou: @player 所以到底怎麼唸？` |
| WAIT_REPLY_2 | 第二段等待玩家回覆。 | 0 output（freeze） | active（不可取消） | disabled | shown | （無訊息，等待玩家送出回覆） |
| TAG_PLAYER_3_MEANING | 第三段 tag（問單字意思/指誰），再進 reply-to。 | 單則 tag 後立即停住 | active（classic reply-to） | enabled（進入下一步後可累積） | shown | `mod_live: @player 這個單字你覺得代表什麼？在指誰？` |
| WAIT_REPLY_3 | 第三段等待玩家回覆。此步才允許技術故障 backlog 累積。 | 0 output（freeze） | active（不可取消） | 每 30 秒累積 2 則到 backlog；不即時顯示 | shown | backlog 範例：`技術故障：訊號不穩，暫時卡住` / `奇怪卡了大約 5 分鐘` |
| FLUSH_TECH_BACKLOG | 玩家回覆後一次 flush backlog（最多 8 則，最後一則為卡住分鐘數）。 | 短波段（<=8 則） | inactive | flush then reset | shown | `mod_live: 奇怪卡了大約 10 分鐘` |
| ADVANCE_NEXT | 本題收束後推進下一題（回到 TAG_PLAYER_1）。 | 低頻（流程切換） | inactive | disabled | shown（下一題接續） | `👑 behindyou: 先記住這點，我們下一題。` |

## Rules Snapshot
- reply-to active 時，聊天室必須 0 output，且 reply-to 不可取消。
- 技術故障訊息只能在 `WAIT_REPLY_3` 累積，並在 `FLUSH_TECH_BACKLOG` 才顯示。
- 若 sandbox 與 classic 共享邏輯，必須沿用 classic reply-to 形式，不得建立 sandbox 專屬 pinned reply UI。
