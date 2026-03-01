# ThaiFeed 團隊維護手冊入口

> 官方維護手冊以 `/docs` 為準。

## 專案定位（短版）

ThaiFeed 是以偽直播形式呈現的互動 Demo，核心是老屋恐怖氛圍與泰文子音互動循環；程式採模組分層與 SSOT 維護。

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Required Assets（最短版）

至少要有 **3 支影片 + 3 支音效**：

- 影片：
  - `assets/scenes/oldhouse_room_loop.mp4`
  - `assets/scenes/oldhouse_room_loop2.mp4`
  - `assets/scenes/oldhouse_room_loop3.mp4`
- 音效：
  - `assets/sfx/fan_loop.wav`
  - `assets/sfx/footsteps.wav`
  - `assets/sfx/ghost_female.wav`

請放在 `public/assets/...`；路徑一律使用相對路徑 `assets/...`，**禁止寫死 `/assets/...`**。

## Base path（部署路徑）

素材 URL 由統一 base path 機制解析，請勿在功能碼自行拼接絕對路徑。詳見：

- [03｜Player System](./docs/03-player-system.md)
- [02｜SSOT Map](./docs/02-ssot-map.md)

## Maintenance Manual（/docs 索引）

- [00｜專案定位與維護哲學](./docs/00-philosophy.md)
- [01｜架構總覽](./docs/01-architecture-overview.md)
- [02｜SSOT Map](./docs/02-ssot-map.md)
- [03｜Player System](./docs/03-player-system.md)
- [04｜Audio System](./docs/04-audio-system.md)
- [05｜Chat System](./docs/05-chat-system.md)
- [06｜Event System](./docs/06-event-system.md)
- [07｜Debug System](./docs/07-debug-system.md)
- [08｜Mobile Layout](./docs/08-mobile-layout.md)
- [09｜Troubleshooting](./docs/09-troubleshooting.md)
- [10｜Change Log](./docs/10-change-log.md)

## Debug 入口

- 主頁右上角 `Debug` 按鈕（overlay）
- Player 最小驗證頁：`/debug/player`

## 開發協作

- 變更提交流程與 PR Checklist：請看 [CONTRIBUTING.md](./CONTRIBUTING.md)
