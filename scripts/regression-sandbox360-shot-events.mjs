import fs from 'node:fs';

const viewerFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/Sandbox360Viewer.tsx', import.meta.url), 'utf8');
const appFile = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');

const assertHas = (file, token, message) => {
  if (!file.includes(token)) throw new Error(message);
};

assertHas(viewerFile, 'type RoomEventRuntimeState = Record<RoomEventType, { active: boolean; triggerCount: number; triggerSeq: number }>;', 'viewer must consume room event runtime SSOT from parent');
assertHas(viewerFile, 'roomEventState: RoomEventRuntimeState;', 'viewer must read room event runtime SSOT from parent');
assertHas(viewerFile, 'roomEventObservability: RoomEventObservabilityState;', 'viewer must read room event observability from parent SSOT');
assertHas(viewerFile, 'onTriggerRoomEvent: (eventType: RoomEventType, options?: TriggerRoomEventOptions) => boolean;', 'viewer must trigger room events via parent gate callback');
assertHas(viewerFile, 'onViewerDebugStateChange?: (payload:', 'viewer must emit debug projection snapshot to debug container');
assertHas(viewerFile, 'window.__sandbox360 = debugApi;', 'sandbox360 debug API should stay mounted');
assertHas(viewerFile, 'forceRoomEvent: (eventType) => onTriggerRoomEvent(eventType, { force: true, source: \'manual\' })', 'force room event must delegate to force gate callback');
assertHas(viewerFile, 'key={`TV_STATIC_OVERLAY-${roomEventState.TV_STATIC.triggerSeq}`}', 'renderer overlay must re-mount on each trigger sequence to force effect replay');
assertHas(viewerFile, 'data-active={roomEventState.TV_STATIC.active ? \'true\' : \'false\'}', 'renderer overlay must consume shared room event active state');
assertHas(viewerFile, 'const tvScreenRect = useMemo<OverlayRect>(() => {', 'viewer must resolve TV screen rect from TV anchor in scene space');
assertHas(viewerFile, 'const resolveTvEffectRect = ({ rect, camera, handheld }: ResolveTvEffectRectInput): ResolveTvEffectRectResult => {', 'viewer must keep a single resolveTvEffectRect final path');
assertHas(viewerFile, 'const preTransformTvRect = useMemo(() => toScreenRectStyle(resolvedTvRects.preTransformRect), [resolvedTvRects.preTransformRect, toScreenRectStyle]);', 'viewer must expose pre-transform tv rect');
assertHas(viewerFile, 'const finalResolvedTvRect = useMemo(() => toScreenRectStyle(resolvedTvRects.finalResolvedRect), [resolvedTvRects.finalResolvedRect, toScreenRectStyle]);', 'viewer must expose final resolved tv rect');
assertHas(viewerFile, 'const tvRendererRect = finalResolvedTvRect;', 'renderer must consume final resolved rect');
assertHas(viewerFile, 'rendererUsesResolvedRect', 'viewer debug payload must expose renderer resolved-rect gate state');
assertHas(viewerFile, 'effectContentUsesResolvedRect', 'viewer debug payload must expose effect-content resolved-rect gate state');
assertHas(viewerFile, 'effectVisibleBounds', 'viewer debug payload should include effect visible bounds');
assertHas(viewerFile, "const TV_TARGET_REGION_KIND: TvTargetRegionKind = 'tv_screen_inner';", 'viewer target region semantic must stay tv_screen_inner');
assertHas(viewerFile, "tvRectSource: 'TV_ANCHOR(tv_screen_inner scene-space)->resolveTvEffectRect(preTransform+handheld+final)'", 'viewer rect source must explicitly document tv_screen_inner base rect');
assertHas(viewerFile, 'tvTargetRegionKind: TV_TARGET_REGION_KIND,', 'viewer debug payload must expose tv target region kind');
assertHas(viewerFile, 'transitionState', 'viewer debug payload should include structured transition state');
assertHas(viewerFile, 'className="sandbox360OverlayTvNoiseContent"', 'tv effect should render through explicit inner content layer');
assertHas(viewerFile, 'className="sandbox360OverlayTvBoundsViz"', 'tv bounds visualization should render explicit dual-frame overlay');
assertHas(viewerFile, 'Δx {rectDiff.x} / Δy {rectDiff.y} / Δw {rectDiff.w} / Δh {rectDiff.h}', 'tv bounds visualization should surface explicit deltas');
if (viewerFile.includes('resolvedTvScreenRect')) {
  throw new Error('legacy resolvedTvScreenRect naming should be removed in viewer');
}
if (viewerFile.includes('sandbox360ShotState')) {
  throw new Error('main view should not retain standalone shot state overlay');
}

if (viewerFile.includes('className="sandbox360Debug"')) {
  throw new Error('main view overlay debug panel must be removed (moved to debug page/container)');
}
if (viewerFile.includes('className="sandbox360RoomEventButtons"')) {
  throw new Error('main view room event debug buttons must be removed');
}
if (viewerFile.includes('className="sandbox360ShotButtons"')) {
  throw new Error('main view shot debug buttons must be removed');
}

assertHas(appFile, 'type Sandbox360RoomEventState = Record<Sandbox360RoomEventType, Sandbox360RoomEventRuntime>;', 'app should keep a typed room event SSOT');
assertHas(appFile, 'const [sandbox360RoomEvents, setSandbox360RoomEvents] = useState<Sandbox360RoomEventState>({', 'app must own sandbox360 room event SSOT');
assertHas(appFile, 'const [sandbox360RoomEventDebug, setSandbox360RoomEventDebug] = useState({', 'app must own sandbox360 room event debug SSOT');
assertHas(appFile, 'baseSceneWidth: 0,', 'app overlay debug state should include base scene width');
assertHas(appFile, 'baseSceneHeight: 0,', 'app overlay debug state should include base scene height');
assertHas(appFile, 'tvScreenRectRatio: { x: 0, y: 0, w: 0, h: 0 },', 'app overlay debug state should include tv ratio');
assertHas(appFile, 'baseTvSceneRect: { x: 0, y: 0, w: 0, h: 0 },', 'app overlay debug state should include base scene tv rect');
assertHas(appFile, 'preTransformTvRect: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include pre-transform tv rect');
assertHas(appFile, 'finalResolvedTvRect: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include final resolved tv rect');
assertHas(appFile, 'renderedEffectRect: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include rendered effect rect');
assertHas(appFile, 'effectVisibleBounds: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include effect visible bounds');
assertHas(appFile, "tvTargetRegionKind: 'tv_outer_frame' as 'tv_outer_frame' | 'tv_body' | 'tv_screen_inner',", 'app overlay debug state should include tv target region semantic');
assertHas(appFile, 'rendererUsesResolvedRect: false,', 'app overlay debug state should expose renderer resolved-rect identity flag');
assertHas(appFile, 'effectContentUsesResolvedRect: false,', 'app overlay debug state should expose effect-content resolved-rect identity flag');
assertHas(appFile, 'const triggerSandbox360RoomEvent = useCallback((eventType: Sandbox360RoomEventType', 'app must own room event gate + force pipeline');
assertHas(appFile, 'triggerSeq: prev[eventType].triggerSeq + 1', 'force/event triggers must increment sequence to replay visual effect');
assertHas(appFile, 'renderedActive: true,', 'debug state should explicitly reflect active render status');
assertHas(appFile, 'const clearSandbox360ShotFlowTimers = useCallback(() => {', 'shot flow timers must be managed centrally');
assertHas(appFile, "triggerSandbox360RoomEvent('LIGHT_FLASH_LEFT', { source: 'shot_flow' });", 'shot flow -> effect mapping must remain authoritative');
assertHas(appFile, "triggerSandbox360RoomEvent('TV_STATIC', { source: 'shot_flow' });", 'right stay -> tv static mapping must remain authoritative');
assertHas(appFile, "triggerSandbox360RoomEvent('DOOR_SHADOW', { source: 'shot_flow' });", 'right->center mapping must remain authoritative');
assertHas(appFile, "triggerSandbox360RoomEvent('DOLL_REFLECT', { source: 'shot_flow' });", 'left->center mapping must remain authoritative');
assertHas(appFile, '{mode === \'sandbox_360_test\' && (', 'debug panel must include sandbox_360_test section');
assertHas(appFile, 'Sandbox360 Viewer / Effect SSOT', 'debug panel must show consolidated sandbox360 fields');
assertHas(appFile, 'live controls location: main_view_top_left', 'debug panel must indicate control ownership split');
assertHas(appFile, 'className="sandbox360-live-controls"', 'main view should retain sandbox direct control buttons');
assertHas(appFile, 'FORCE TV', 'main view must expose force effect trigger control');
assertHas(appFile, 'onViewerDebugStateChange={(payload) => {', 'viewer debug snapshot must be projected into app debug state');
assertHas(appFile, 'preTransformTvRect: payload.preTransformTvRect,', 'app should consume pre-transform tv rect from viewer SSOT');
assertHas(appFile, 'finalResolvedTvRect: payload.finalResolvedTvRect,', 'app should consume final resolved tv rect from viewer SSOT');
assertHas(appFile, 'renderedEffectRect: payload.renderedEffectRect,', 'app should consume rendered effect rect from viewer SSOT');
assertHas(appFile, 'effectVisibleBounds: payload.effectVisibleBounds,', 'app should consume effect visible bounds from viewer SSOT');
assertHas(appFile, 'tvTargetRegionKind: payload.tvTargetRegionKind,', 'app should consume tv target region semantic from viewer SSOT');
assertHas(appFile, 'TV effect bounds visualization:', 'debug page must expose tv effect bounds visualization toggle');
assertHas(appFile, 'rectDiffX / rectDiffY / rectDiffW / rectDiffH:', 'debug page must show rect diff observability');
assertHas(appFile, 'tvTargetRegionKind: {sandbox360OverlayDebug.tvTargetRegionKind}', 'debug page must show tv target region semantic');
assertHas(appFile, 'rendererUsesResolvedRect: {String(sandbox360OverlayDebug.rendererUsesResolvedRect)}', 'debug panel should show renderer rect identity gate');
assertHas(appFile, 'effectContentUsesResolvedRect: {String(sandbox360OverlayDebug.effectContentUsesResolvedRect)}', 'debug panel should show effect content rect identity gate');
if (appFile.includes('resolvedTvScreenRect')) {
  throw new Error('legacy resolvedTvScreenRect naming should be removed from app debug schema');
}

console.log('regression-sandbox360-shot-events: ok');
