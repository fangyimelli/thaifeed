> 2026-03-26 sandbox_360_test 補充（第十二波）：紅框娃娃櫃本體修復。移除圓臉資產渲染，改為櫃內原娃娃 scene clone motion（限定 cabinet anchors，不做 viewport 臉貼圖）。

## 2026-03-26 Sandbox360 doll cabinet body fix（scene clone motion in red-box cabinet）

### Scope
- `sandbox_360_test` only（classic / sandbox_story untouched）。

### Root cause
- 主渲染來源仍是 `dollCabinetRenderLibrary` 的獨立 SVG 圓臉，不是櫃內原有娃娃本體。
- 因此即使 anchor 正確，視覺仍像外掛前景臉層，與需求不符。

### What changed
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - doll 主渲染改為 `cabinet_scene_clone_motion_v2`：每個 controlled doll 在自身 slot 直接 clone scene 像素，並在該 slot 內做微動/凝視偏移。
  - `dollGazeSsot` 新增 `activeCabinetRegion='dollCabinet'`，每隻 binding 新增 `motionPreset`。
  - gaze state 新增 `subtleMotion`（idle 與 tracking 之間的櫃內微動狀態）。
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - 移除 `sandbox360OverlayDollHeadAsset` / eye / highlight 資產層。
  - 新增 `sandbox360OverlayDollBodyClone` + `sandbox360OverlayDollGazeTint`（皆限制在 slot mask）。
- `src/app/App.tsx`
  - debug 面板新增 `dollGazeSsot.activeCabinetRegion` 與每隻 `motion` 欄位。
- `scripts/regression-sandbox360-shot-events.mjs`
  - guard 改為鎖定 scene-clone token，並禁止 head-asset 路徑回歸。
- Removed:
  - `src/modes/sandbox_360_test/dollCabinetRenderLibrary.ts`

### Removed / Deprecated
- Removed round-face render library route（不再允許 viewport/HUD 式娃娃臉替代）。

> 2026-03-26 sandbox_360_test 補充（第十一波）：360 娃娃凝視 hard-fix。移除殘留單體前景臉路徑，新增 per-doll scene binding SSOT + viewport 可見比 gate（center-in-view + ratio>=0.45），避免畫面邊角漂浮圓臉。

## 2026-03-26 Sandbox360 doll gaze hard-fix（scene-anchor binding + strict viewport gate）

### Scope
- `sandbox_360_test` only（classic / sandbox_story untouched）。

### What changed
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - 新增 `dollSceneBindings`：每隻娃娃輸出 `anchor / requestedVariant / resolvedVariant / gazeState / visibility / applyStatus / applyReason`。
  - render gate 改為 strict：`anchor center in viewport` 且 `visibleRatio >= 0.45` 才渲染。
  - debug payload 新增 `dollGazeSsot`（`mode=360`、`overlayFloatingFaceRemoved=true`、`controlledDolls`、`bindings`）。
- `src/app/App.tsx`
  - Debug panel 新增 `dollGazeSsot.*` 與每隻 doll binding 行，直接驗證是否套用到 scene anchor。
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - 移除舊 `.sandbox360OverlayDoll` 路徑，避免單體前景假方案殘留。
- `scripts/regression-sandbox360-shot-events.mjs`
  - 補 guard：`dollSceneBindings`、`dollGazeSsot`、strict gate token、legacy CSS 路徑禁止回歸。

### Removed / Deprecated
- Removed `.sandbox360OverlayDoll` CSS（legacy single-overlay fake gaze path）。

> 2026-03-26 sandbox_360_test 補充（第十波）：修復 360 娃娃凝視錨點。移除舊 cabinet/slot 百分比容器主路徑，改為 scene-space slot anchor + viewport culling，避免漂浮前景臉/HUD 感。

## 2026-03-26 Sandbox360 doll gaze anchor fix（scene-space SSOT）

### Scope
- `sandbox_360_test` only（classic / sandbox_story untouched）。

### What changed
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - Added `dollSlotAnchors` scene-space map from cabinet region to per-slot authored anchors.
  - Render path switched to `sandbox360OverlayDollWorldLayer` + `sandbox360OverlayDollAnchor`.
  - Added off-screen culling (`slotVisibleRect`) so dolls do not appear when anchor is outside viewport.
  - `effectsDebugMap.doll.geometrySource` now reports scene-space anchor resolver path.
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - Added `sandbox360OverlayDollWorldLayer` / `sandbox360OverlayDollAnchor` styles.
  - Removed reliance on legacy cabinet-slot percent grid styling as primary gaze renderer.
- `scripts/regression-sandbox360-shot-events.mjs`
  - Added regression guards for:
    - scene-space anchor SSOT token,
    - off-screen culling token,
    - prohibition of legacy `sandbox360OverlayDollCabinet` / `sandbox360OverlayDollSlot` render tokens.

### Removed / Deprecated
- Deprecated `sandbox360OverlayDollCabinet` + `sandbox360OverlayDollSlot` primary render path.

> 2026-03-26 sandbox_360_test 補充（第九波）：完成 Doll Cabinet Look-at-Player 正式系統（authored variants + stage/gate/trigger + SSOT + debug projection）。`DOLL_REFLECT` 降級為 cue，主路徑改為 per-doll variant map。

## 2026-03-26 Sandbox360 右側娃娃櫃「都看向我」MVP（頭部小角度變體 + 眼神 overlay）

### Scope
- `sandbox_360_test` only（classic mode untouched）。

### What changed
- 新增 `src/modes/sandbox_360_test/dollCabinetRenderLibrary.ts`，建立 slot × variant 正式 render path。
- 先鎖定 4 隻關鍵娃娃：`doll_02/03/05/06`（top_center/top_right/bottom_center/bottom_right）。
- 每隻具備 4 種正式 variant：`neutral / glance_to_player / stare_player / hard_stare`，並加上 eye/highlight overlay。
- `Sandbox360Viewer` 改為渲染 authored 變體資產層（`img`），不再用 CSS primitive 頭/眼作主路徑。
- variant fallback 契約：
  - `missing variant -> neutral`
  - `missing neutral -> hidden(no-op)`（不顯示 broken block）
- `dollCabinetSystem` stage 感知調整：
  - stage1：1 隻 glance
  - stage2：2 隻 stare
  - stage3：3~4 隻多數 stare
  - stage4：hard stare scare + cooldown
- Debug 新增 renderer/variant 來源與 fallback 可觀測欄位：
  - `renderedDollSlots`
  - `renderedVariantAssets`
  - `missingVariantAssets`
  - `fallbackVariantMap`
  - `variantRenderSource`
- regression guard `scripts/regression-sandbox360-shot-events.mjs` 補強上述契約與 anti-regression token。

### Removed / Deprecated
- Deprecated CSS primitive doll head/eyes 主渲染路徑（改由 authored variant path 主導）。

## 2026-03-26 Sandbox360 display responsibility split (main clean / debug SSOT)

### Root cause
- 主畫面同時承擔「效果渲染」與「紅框校正可視化」，造成常態畫面持續疊紅框，且 Debug 與 renderer 觀測邏輯出現雙軌。
- TV 以外 effect（FLASH/DOLL/DOOR）的定位資料沒有集中 schema，Debug 很難直接對照 renderer 真正使用值。

### What changed
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - 移除主畫面常駐 TV 紅框節點（`sandbox360OverlayTvDebug`）。
  - 建立 `effectsDebugMap`（tv/flash/doll/door）並由 viewer resolve/render path 直接投影到 debug payload。
  - TV 與其他 effect 統一輸出：base/resolved/rendered/visible、geometry source、force/fallback/block、shot/transition 關聯。
  - bounds visualization 保留 Debug toggle 控制，不回到常駐紅框模式。
- `src/modes/sandbox_360_test/effectDebugSchema.ts`
  - 新增統一 effect debug schema（SSOT 型別）。
- `src/app/App.tsx`
  - 接收並呈現 `effectsDebugMap`，Debug 面板新增 `GLOBAL EFFECT RESOLVE` 區塊，集中顯示各 effect 實際定位資料。
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - 移除 TV 紅框樣式，保留僅 Debug visualization 使用的樣式。
- `scripts/regression-sandbox360-shot-events.mjs`
  - 新增 guard：主畫面不得回歸 TV 紅框、必須存在 unified `effectsDebugMap` 並於 Debug 呈現。

## 2026-03-25 Sandbox360 TV red-box follow-up calibration

### What changed
- `src/modes/sandbox_360_test/tvAnchorCalibration.ts`
  - 依使用者紅框，將 `TV_SCREEN_INNER_QUAD_BY_SHOT` 再次人工收斂（CENTER/LEFT/RIGHT）。
  - metadata 升級到 `v2026-03-25.6`，`source` 標記 `red_box_followup`。

## 2026-03-25 Sandbox360 TV base scene absolute calibration SSOT（screen-inner）

### Root cause
- 前版雖已是 quad，但語義仍偏 `tvAnchor`，且 debug 沒直接暴露「base scene authored calibration」本體；驗收時不夠直觀。

### What changed
- `src/modes/sandbox_360_test/tvAnchorCalibration.ts`
  - 新增 `BASE_SCENE_WIDTH=4096`、`BASE_SCENE_HEIGHT=2048`。
  - 明確定義 `TV_SCREEN_INNER_QUAD_BY_SHOT.{LEFT|CENTER|RIGHT}`（base scene absolute px）。
  - calibration metadata 升版：`tv-screen-inner-base-scene-calibration.v2026-03-25.5`。
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - 唯一路徑改為 `resolveTvScreenInnerGeometryFromBaseCalibration(...)`。
  - shot 幾何來源改吃 `TV_SCREEN_INNER_QUAD_BY_SHOT`，transition 維持 quad interpolation。
  - debug payload 新增 `calibrationSource`、`baseTvScreenInnerQuad`、`resolvedTvScreenInnerGeometry`。
- `src/app/App.tsx`
  - debug state/panel 同步顯示上述欄位，驗證 renderer/effect 皆使用 resolve 結果。
- `scripts/regression-sandbox360-shot-events.mjs`
  - 新增 guard 鎖定 base calibration resolve path 與 debug schema 透傳。

## 2026-03-25 Sandbox360 TV 主 render geometry 強制切換（screen-inner authored）

### Bug root cause
- debug 有 quad，但 renderer 驗證資訊不足；且 transition 期間基礎 quad 未插值，會在 shot 交界吃到不正確幾何。

### Fix summary
- viewer 主路徑改為 `TV_SCREEN_GEOMETRY_BY_SHOT` + transition interpolation。
- renderer/debug/hit/clip/visualization 全部依賴同一 `resolvedTvScreenQuad` 與 `resolvedTvBoundingRect`。
- debug 新增 renderer 幾何責任欄位，明確區分 source/kind/fallback。
- calibration 升版 `v2026-03-25.4`，收斂 CENTER 內框過大與左上外擴。

## 2026-03-25 Sandbox 360 TV quad / 四角定位主路徑落地

### Root cause
- 單一 TV rect（x/y/w/h）在此場景只提供外接框，難以描述實際螢幕面板四角。
- 在 shot transition + handheld transform 下，rect 微調會持續漂移，且 debug/renderer 容易各自推導局部幾何。

### What changed
- `src/modes/sandbox_360_test/tvAnchorCalibration.ts`
  - 改為 `quadByShot`（LEFT/CENTER/RIGHT）作者標定四角。
  - 新增 `tvGeometryKind='quad'`、`tvTargetRegionKind='tv_screen_inner'` metadata。
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - 實作唯一幾何路徑 `resolveTvEffectGeometry(...)`，輸出 `resolvedTvScreenQuad` 與 `resolvedTvBoundingRect`。
  - TV noise content 改為 quad polygon clip-path。
  - debug/visualization 統一依賴 resolved quad，新增 corner + quad overlay 可視化。
- `src/app/App.tsx`
  - sandbox360 overlay debug schema 改為 quad 欄位，並在 debug panel 顯示 base/resolved quad 與 quadDiff。
- `scripts/regression-sandbox360-shot-events.mjs`
  - 新增/調整 guard：geometry kind、single resolve path、quad payload、resolved-quad renderer/effect flag、quad visualization token。

## 2026-03-25 Sandbox 360 TV screen-inner red-box alignment fix

### Root cause
- Previous cleanup unified resolver/debug/renderer, but the **base anchor semantic** was still oversized (closer to `tv_body`) instead of `tv_screen_inner`.
- Because all consumers shared that same wrong base rect, values looked consistent while visual region remained too large/right.

### What changed
- `src/modes/sandbox_360_test/tvAnchorCalibration.ts`
  - Bumped calibration to `tv-anchor-calibration.v2026-03-25.2`.
  - Recalibrated anchor to smaller/left/up screen-inner target region.
  - Source metadata now explicitly states `screen_inner_only`.
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - Added `tvTargetRegionKind` schema and hard-set to `tv_screen_inner`.
  - Updated `tvRectSource` string to explicitly describe `TV_ANCHOR(tv_screen_inner scene-space)`.
- `src/app/App.tsx`
  - Added `tvTargetRegionKind` in overlay debug state, payload ingestion, and debug panel rendering.
- `scripts/regression-sandbox360-shot-events.mjs`
  - Added semantic guards for `tv_screen_inner` target-region contract and debug chain propagation.

## 2026-03-25 Sandbox 360 TV final rect semantics closure（QA gap fix）

### Scope
- `sandbox_360_test` only.
- No changes in classic / `sandbox_story`.

### Root cause
- Previous SSOT pass still left semantic gap: `resolveTvEffectRect` ended at camera-space pre-transform rect, while handheld transform lived on `.sandbox360TransformLayer`.
- Debug fields labeled as final were not true renderer final rect; measured bounds were post-transform, creating non-error semantic diff.

### What changed
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - Upgraded single resolver to `resolveTvEffectRect({ rect, camera, handheld })`.
  - Resolver now emits `preTransformTvRect` and `finalResolvedTvRect` (handheld-aware).
  - Renderer/debug/overlay all consume `finalResolvedTvRect`.
  - Added schema fields: `baseSceneWidth`, `baseSceneHeight`, `tvScreenRectRatio`, `effectVisibleBounds`, `transitionState`, `rendererUsesResolvedRect`, `effectContentUsesResolvedRect`.
  - Upgraded `transformChain` into structured steps with `data`.
  - Upgraded visualization to explicit dual-frame + Δx/Δy/Δw/Δh readout (`sandbox360OverlayTvBoundsViz*`).
- `src/app/App.tsx`
  - Synced debug SSOT shape to new schema (`preTransformTvRect` / `finalResolvedTvRect` / `effectVisibleBounds` / structured `transitionState`).
  - Debug panel now explicitly distinguishes base scene rect, intermediate rect, final resolved rect, renderer rect, and visible bounds.
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - Added dual-frame visualization styles for renderer rect vs visible bounds.
- `scripts/regression-sandbox360-shot-events.mjs`
  - Added guard for final rect resolver contract, new schema fields, resolved-rect usage flags, visualization deltas, and legacy naming removal.

### Removed / Deprecated Log
- Deprecated ambiguous naming `resolvedTvScreenRect` in sandbox_360_test viewer/debug schema; replaced with explicit `preTransformTvRect` / `finalResolvedTvRect`.

## 2026-03-25 Sandbox 360 TV final render alignment root-cause fix

### Scope
- `sandbox_360_test` only.
- No changes in classic / `sandbox_story`.

### Root cause
- Previous fix aligned debug and renderer rect fields, but did not measure the final TV effect content bounds.
- TV noise content lived in a pseudo-element path without explicit transform observability, so pixel-level drift could remain invisible even when rect fields matched.

### What changed
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - Added single-path resolver: `resolveTvEffectRect({ rect, camera })`.
  - Added explicit content layer: `.sandbox360OverlayTvNoiseContent` (no extra offset transform).
  - Added rendered bounds measurement and debug payload fields:
    - `baseTvSceneRect`
    - `resolvedTvScreenRect`
    - `renderedEffectRect`
    - `effectContentInset`
    - `effectInnerTransform`
    - `rectDiffX/Y/W/H`
    - `tvRectSource`
    - `transformChain`
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - Moved TV noise visual content from `::before` to explicit inner layer.
  - Added visualization outlines for debug-only bounds inspection mode.
- `src/app/App.tsx`
  - Added TV bounds visualization toggle in Debug panel.
  - Added all new observability fields to Debug panel output.
  - Passed visualization toggle down to viewer.
- `scripts/regression-sandbox360-shot-events.mjs`
  - Added guards for `resolveTvEffectRect` single path, rendered rect observability, rect diff fields, transform chain, and visualization toggle.

## 2026-03-25 Sandbox 360 effect force replay + live controls ownership split

### Scope
- `sandbox_360_test` only.
- No changes in classic / `sandbox_story`.

### Summary
- `src/app/App.tsx`
  - Consolidated room-event runtime SSOT to `sandbox360RoomEvents` with `active + triggerCount + triggerSeq` per event.
  - Force/normal trigger path now updates the same SSOT and debug observability (`effect.renderedActive`, `event.active`, `event.seq`).
  - Added main-view top-left live controls (Shot + Trigger + `FORCE TV`) to keep direct scene operation in frontend view.
  - Removed sandbox_360_test trigger controls from Debug panel (debug now observes, does not own scene controls).
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - Viewer now reads `roomEventState` (shared SSOT) instead of local count-only behavior.
  - Overlay nodes use `triggerSeq` key remount so repeated/forced triggers replay visual effects reliably.
  - Removed main-view shot-state text overlay (`sandbox360ShotState`) to keep large state inspection inside Debug panel only.
- `scripts/regression-sandbox360-shot-events.mjs`
  - Guard updated for room-event SSOT shape, trigger sequence replay token, main-view controls ownership, and no shot-state overlay regression.

### Removed / Deprecated Log
- Deprecated sandbox_360_test main-view `sandbox360ShotState` overlay text; debug observability is centralized in Debug panel.

### Verification
- `npm run test:sandbox360-shot-events`
- `npm run build`

## 2026-03-25 Sandbox 360 TV anchor lock + handheld transition smoothing

### Scope
- `sandbox_360_test` only.
- No changes in classic, `sandbox_story`, or shared `submitChat`.

### Summary
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - Added authoritative scene-space (manual calibrated) `TV_ANCHOR = { x: 2256, y: 1054, w: 220, h: 118 }` (reference scene: 4096x2048, aligned to user red-box SSOT).
  - TV static overlay and TV debug box now read the same authoritative anchor (`overlaySceneRects.tv`).
  - Added debug fields: `TV_ANCHOR`, `tvDebugRect`, `tvOverlayRect`, `tv.sharedTransformContainer`, and `transition.durationMs`.
- `src/app/App.tsx`
  - Replaced spring-based shot interpolation with duration-based transition (`280ms`) driven by authoritative state:
    - `shotTransitionStartedAt`
    - `shotTransitionDurationMs`
    - `shotTransitionFromPosX`
  - Reduced handheld offset/rotation/scale amplitude to keep framing stable.
- `src/modes/sandbox_360_test/sandbox360Mode.ts`
  - Added transition fields into viewer initial state + hydration guards.
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - Added `.sandbox360OverlayTvDebug` to visualize TV anchor in debug flow.
- `scripts/regression-sandbox360-shot-events.mjs`
  - Added guards for TV anchor SSOT, shared TV anchor usage (debug/static), TV rect observability fields, transform-layer coupling, and duration-based transition tokens.

### Removed / Deprecated Log
- Deprecated spring constants path for sandbox_360_test shot transition (`shotSpringStiffness`, `shotSpringDamping`) to avoid dual transition authority.
- Deprecated old estimated TV anchor (`{ x: 2240, y: 1154, w: 418, h: 244 }`) to avoid estimated/manual dual-anchor paths.

## 2026-03-25 Sandbox 360 題目層顯示回歸修正（viewer root 分層 + z-index guard）

### Scope
- `sandbox_360_test` only.
- No changes in classic, `sandbox_story`, or QNA engine.

### Summary
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - viewer root 改為明確三段：`SceneLayer`（scene image）→ `OverlayLayer`（room overlays）→ `UiLayer`（QuestionPanel/PinnedReply/ChatLayer）。
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - 新增 `scene/overlay` layer CSS，並固定 z-index 契約：scene=1、overlay=2、ui-layer=30、question=40。
  - `ui-layer` 仍維持 `pointer-events:none`，`QuestionPanel` 仍維持 `pointer-events:auto`。
- `scripts/regression-sandbox360-shot-events.mjs`
  - 新增 DOM 結構 guard（`SceneLayer` / `OverlayLayer`）。
  - 新增 z-index guard，防止題目層再次被 scene/overlay 覆蓋。

### Verification
- `npm run test:sandbox360-shot-events`
- `npm run build`

## 2026-03-25 Sandbox 360 題目 UI layer 回復（viewer/overlay 保持）

### Scope
- `sandbox_360_test` only.
- No changes in classic, `sandbox_story`, or QNA engine.

### Summary
- `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - 建立 `sandbox360UiLayer` 內的三層結構：`sandbox360QuestionPanel` / `sandbox360PinnedReply` / `sandbox360ChatLayer`。
  - 題目層改為 viewer 內 overlay UI 顯示，並新增 `question.visible`、`question.consonant` debug 欄位。
- `src/modes/sandbox_360_test/sandbox360Viewer.css`
  - `ui-layer` 使用 `position:absolute + inset:0 + pointer-events:none`。
  - `QuestionPanel` 設 `pointer-events:auto` 並提高 z-index，確保題目浮在 scene/overlay 之上。
- `src/app/App.tsx`
  - `sandbox_360_test` viewer 補傳 `questionConsonant`、`questionVisible`、`pinnedReplyText`。
  - `getSandboxOverlayConsonant/getSandboxAuthoritativePromptVisible` 新增 `sandbox_360_test` 分支，使用 sandbox360 mode authoritative prompt/replyGate。
- `scripts/regression-sandbox360-shot-events.mjs`
  - guard 新增 ui-layer 結構與 pointer-events 規則檢查，防止 question layer 再次回歸消失。

### Verification
- `npm run test:sandbox360-shot-events`
- `npm run build`

## 2026-03-25 Sandbox 360 zoom-crop framing authority + short transition

### Scope
- `sandbox_360_test` only.
- No changes in classic or `sandbox_story`.

### Summary
- Raised authoritative zoom baseline to `SANDBOX360_SCALE = 1.75`.
- Updated shot framing constants to `LEFT=36`, `CENTER=52`, `RIGHT=66` (zoomed fixed observation points).
- Shot apply now sets target-only + `isTransitioning=true`; RAF tick performs short ease-out interpolation (`transitionDuration = 0.28`) and settles to authoritative `currentShot` only when close enough.
- Viewer debug panel now includes: `currentShot`, `targetShot`, `currentPosX`, `targetPosX`, `scale`, `isTransitioning`.
- Tuned overlay geometry under zoom (`sandbox360Viewer.css`) to reduce visible RIGHT doll-area misalignment.
- Extended regression guard script to enforce new scale/framing/transition authority tokens.

### Verification
- `npm run test:sandbox360-shot-events`
- `npm run build`

## 2026-03-25 Sandbox 360 namespace-only trigger API convergence

### Scope
- sandbox_360_test only (plus required docs/guard sync).
- No changes to classic, sandbox_story, shared submitChat, or verified shot/overlay behavior.

### Summary
- Removed legacy global mount `window.triggerRoomEvent` from `Sandbox360Viewer`.
- Added sandbox-local API namespace `window.__sandbox360` exposing:
  - `triggerRoomEvent(eventType)`
  - `overlay.triggerRoomEvent(eventType)`
  - `viewer.triggerShot(shot)` and `viewer.shot.left/center/right()`
  - `debug.triggerRoomEvent(eventType)` and `debug.triggerShot(shot)`
- LEFT/CENTER/RIGHT + FLASH/TV/DOLL/DOOR debug buttons continue to run the same local handlers/event rules.
- Regression guard now rejects any reintroduction of `window.triggerRoomEvent`.

### Verification
- `node scripts/regression-sandbox360-shot-events.mjs`
- `rg -n 'window\.triggerRoomEvent|window\.__sandbox360' src/modes/sandbox_360_test/Sandbox360Viewer.tsx`

## 2026-03-25 Sandbox 360 shot-driven overlay events

### Scope
- Enforced integration mode: patch on current branch.
- Scoped only to `sandbox_360_test`.
- No changes in classic mode, sandbox_story, parser, or chat flow.

### Summary
- Added `onShotChange(prevShot, nextShot)` listener in `Sandbox360Viewer` and connected transition/dwell event triggers.
- Added state refs for `lastShot`, `shotEnterTime`, and `eventCooldownMap`.
- Added per-event cooldown gate to prevent back-to-back retrigger.
- Kept debug event buttons and global `triggerRoomEvent` API, now guarded by same cooldown SSOT.
- Added regression guard script `scripts/regression-sandbox360-shot-events.mjs` and npm script `test:sandbox360-shot-events`.

### Verification
- `npm run test:sandbox360-shot-events`
- `npm run build`

## 2026-03-22 Classic flow-first review packet

### Scope
- Classic review workflow only.
- No classic runtime text rewrite.
- No editable/importable promotion for classic entries.
- Sandbox/shared review packet, writer workspace, and import workflow stay intact.

### Implemented
- Extended `scripts/generate-chat-content-artifacts.mjs` to emit:
  - `docs/classic-flow-message-review.md` for flow/player-experience-first classic review.
  - `docs/classic-message-review.md` for source/category-first classic review.
- Each classic flow step now exposes allowed categories, primary/optional category, selection policy, player-facing review notes, message entry metadata, ownership, status, runtime wrapper visibility, and explicit `classic review-only / not importable` labeling.
- Classic inferred runtime wrappers are now called out in a dedicated runtime-wrapper section with wrapped base key, fixed template, dynamic tokens, review focus, and reason they cannot be imported.
- Regression guards now fail if classic flow review docs disappear, major steps are omitted, wrapper visibility is lost, or classic review-only boundaries drift.

### Boundary notes
- Classic remains review-first and non-importable.
- No new classic editable path was added.
- Sandbox/shared writer workspace and `docs/sandbox-shared-message-review.md` remain unchanged in role and import boundary.

## 2026-03-22 Mode ownership split blueprint (phase 1)

### Scope
- Establish classic/sandbox mode-owned flow definitions and content maps without full runtime rewrite.
- Preserve shared schema/tooling/UI shell/review-import-export workflow.

### Implemented
- Added classic/sandbox flow definition files with step purpose, enter/exit conditions, gateType, uiSurface, blocked reasons, next-step candidates, messagePurpose, tone/tonePack placeholders, and allowed message categories.
- Added classic/sandbox content maps and mode ownership metadata for active/shared/legacy/runtime_wrapper boundaries.
- Extended artifact generation to publish classic flow table, sandbox flow table, and mode ownership map.
- Updated manifest/schema metadata so runtime/docs/review tooling can see ownerMode/ownership/messagePurpose/selectionPolicy fields.
- Added phase-1 App adapter usage: reply UI authority now consults mode flow metadata rather than treating App as sole flow ownership source.
- Added regression guards for definition/map existence, step/category ownership separation, and generated docs presence.

### Boundary notes
- Classic review-first import boundary remains unchanged.
- Sandbox/shared import path remains `writer workspace -> draft sync -> import`.
- Legacy/parallel/runtime-wrapper sources stay explicitly marked; no fake full migration.

## 2026-03-22 Sandbox/shared writer workspace round 1

### Root Cause Report
- 上一輪已把 sandbox/shared 文案抽到 editable content layer，但實際創作時仍要在 draft/manifest 欄位裡自行推測用途、流程位置與 UI 限制。
- import script 會先重跑 artifact generation，容易在匯入前把手動 draft 修改洗回 authored baseline，不利安全創作。

### What changed
- 新增 `src/content/chat-content/editable/sandbox-chat-writer-workspace.json`，只收錄可直接編修且可 import 的 sandbox/shared key，並分成 7 個創作批次。
- 每個 key 補齊 `usageContext`、`scenePurpose`、`toneGoal`、`constraints`、`suggestedLength`、`notesForWriter`、`relatedFlowStep`、`relatedGateType`、`relatedUiSurface`、`proposedRewrite`、`altRewriteIdeas`、`bannedPatterns`。
- 新增 `docs/sandbox-chat-writer-workspace.md` 與 `npm run sync:chat-writer-workspace`，workspace 只做創作規劃；既有 import 邊界維持 `draft -> authored -> generate artifacts`。
- `scripts/import-chat-content-editable.mjs` 改為直接驗證目前 draft，不再先覆寫 drafts。
- `scripts/chat-content-regression-guards.mjs` 補 writer workspace guards，鎖定 editable/importable coverage、token/import target 不漂移、classic review-only 不可混入。

### Flow / boundary impact check
- sandbox / shared runtime content 仍由 `appRuntimeContent.ts` 讀 `authoredChatContent.json`，flow / gate / state authority 不變。
- classic mode 仍是 review-first；workspace 不包含 classic key，也不可直接 import classic registry。
- workspace 不直接進 runtime，不會把 writer notes / context 欄位混進正式 content。

### Required docs sync
- README updated.
- docs/10-change-log.md updated.
- docs/sandbox-flow-table.md updated.
- docs/chat-content-editing-guide.md updated.
- docs/chat-content-import-policy.md updated.
- docs/chat-content-editable-preview.md regenerated.
- docs/sandbox-chat-writer-workspace.md added.

### Scope
- Focused on writer workspace / batch grouping / documentation / regression guards only.
- No classic registry overwrite.
- No flow / gate / state expansion.

## 2026-03-22 Editable chat draft + import workflow (project-level enforced integration)

### Scope
- Classic mode + sandbox mode.
- No intentional flow / gate / state behavior change.
- Goal: turn the manifest into a sustainable authoring + safe import workflow.

### Implemented
- Added human-facing editable drafts by mode under `src/content/chat-content/editable/`.
- Added writable content-layer source: `authoredChatContent.json`.
- Rewired `appRuntimeContent.ts` to consume authored content instead of inline literal ownership.
- Added `scripts/import-chat-content-editable.mjs` with validation for missing keys, duplicate keys, token mismatch, category mismatch, and locked ownership.
- Extended artifact generation to emit editable preview docs.
- Added docs for editing guide and import policy.

### Ownership summary
- Sandbox/shared extracted copy: direct editable import path.
- Classic registry content: draft-visible, review-first, manual migration required.
- Runtime wrapper / legacy / parallel: explicitly marked locked or reference-only.

### Verification
- `npm run generate:chat-content-artifacts`
- `npm run import:chat-content-editable`
- `npm run test:chat-content-guards`
- `npm run test:sandbox-guards`
- `npm run build`

## 2026-03-22 Chat content manifest extraction

### Scope
- Classic mode + sandbox mode.
- No intentional flow/gate/state behavior change.
- Goal: create an editable, backfillable, verifiable content layer for real chat-visible text.

### Implemented
- Added `src/content/chat-content/schema.ts` shared schema.
- Added `src/content/chat-content/chatContentManifest.ts` registry covering classic, sandbox, and shared chat sources.
- Added `src/content/chat-content/appRuntimeContent.ts` for App-owned runtime templates and fixed strings.
- Rewired extracted sandbox/App strings to use the content layer:
  - preheat sequence
  - VIP summary lines
  - glitch burst lines
  - tag question template
  - reveal prompt template
  - help-hint template/fallback
  - sandbox debug smoke text
- Rewired ChatPanel UI text to use the shared content layer.
- Added generated artifacts:
  - `src/content/chat-content/chatContentManifest.generated.json`
  - `docs/chat-content-audit-manifest.md`
- Added regression guard + artifact generation scripts.

### Runtime/source classification added
- `active`
- `legacy`
- `parallel`
- `inferred_runtime_wrapper`

### Verification
- `npm run generate:chat-content-artifacts`
- `npm run test:chat-content-guards`
- `npm run test:sandbox-guards`
- `npm run build`

### Deprecated/Removed ownership
- Removed direct ownership of extracted sandbox fixed strings from `src/app/App.tsx`.
- Removed direct ownership of shared chat UI text from `src/ui/chat/ChatPanel.tsx`.
- Retained but explicitly marked legacy/parallel sources in the manifest where dual-track content still exists.

## 2026-03-25 sandbox_360_test handheld camera integration

### Scope
- sandbox_360_test only.
- no classic mode changes.
- no sandbox_story changes.

### Implemented
- Added authoritative handheld camera fields into sandbox_360 viewer state:
  - `cameraOffsetX`, `cameraOffsetY`
  - `cameraRotationDeg`
  - `cameraScaleOffset`
  - `cameraVelocityX`, `cameraVelocityY`
- Replaced shot position interpolation with spring-damping to create short turn-feel movement and small overshoot/recover behavior.
- Added persistent micro handheld synthesis at rest (sway + jitter + breathing scale).
- Added `sandbox360TransformLayer` so overlays and scene share identical final transform.
- Extended sandbox_360_test debug readout with handheld values for verification.

### Verification
- Static inspection: `rg` confirmed new handheld state exists in:
  - `src/modes/sandbox_360_test/sandbox360Mode.ts`
  - `src/modes/sandbox_360_test/Sandbox360Viewer.tsx`
  - `src/app/App.tsx`
- Static inspection: overlay alignment now routes through `sandbox360TransformLayer`.


## 2026-03-25 sandbox_360_test effect-force + debug-ssot integration

- 把 sandbox_360_test room effect force/cooldown/blocked reason 收斂到 App authoritative gate。
- 移除主畫面右下角 debug 大面板（含 shot/event buttons），改由 Debug Panel 呈現完整欄位。
- viewer 與 debug panel 共同讀同一份 state：`sandbox360ViewerState` + `sandbox360RoomEvents` + `sandbox360RoomEventDebug` + `sandbox360OverlayDebug`。
- 補 regression guard：確保不回歸到 viewer 本地 debug overlay 與雙軌 effect gate。
