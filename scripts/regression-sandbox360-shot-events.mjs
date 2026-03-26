import fs from 'node:fs';

const viewerFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/Sandbox360Viewer.tsx', import.meta.url), 'utf8');
const appFile = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const calibrationFile = fs.readFileSync(new URL('../src/modes/sandbox_360_test/tvAnchorCalibration.ts', import.meta.url), 'utf8');

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
assertHas(viewerFile, 'const tvScreenGeometryByShot = useMemo(() => ({', 'viewer must resolve tv quad by shot from calibration');
assertHas(viewerFile, 'const resolveTvScreenInnerGeometryFromBaseCalibration = ({', 'viewer must keep single base calibration resolve path');
assertHas(viewerFile, 'const TV_SCREEN_GEOMETRY_BY_SHOT = \'TV_SCREEN_GEOMETRY_BY_SHOT\';', 'viewer must expose single authored screen geometry source token');
assertHas(viewerFile, 'TV_SCREEN_INNER_QUAD_BY_SHOT.CENTER', 'viewer must consume authored base-scene absolute calibration by shot');
assertHas(viewerFile, 'return interpolateQuad(currentQuad, targetQuad, transitionProgress);', 'viewer must interpolate geometry between shots during transition');
assertHas(viewerFile, 'calibrationSource: TV_ANCHOR_CALIBRATION.source,', 'viewer debug payload must expose calibration source');
assertHas(viewerFile, 'tvGeometryKind: TV_GEOMETRY_KIND,', 'viewer debug payload must expose geometry kind');
assertHas(viewerFile, 'baseTvScreenInnerQuad: baseTvScreenQuad,', 'viewer debug payload must expose base screen-inner quad alias');
assertHas(viewerFile, 'baseTvScreenQuad,', 'viewer debug payload must expose base quad');
assertHas(viewerFile, 'resolvedTvScreenQuad,', 'viewer debug payload must expose resolved quad');
assertHas(viewerFile, 'resolvedTvBoundingRect,', 'viewer debug payload must expose resolved bounding rect');
assertHas(viewerFile, 'rendererUsesResolvedQuad', 'viewer debug payload must expose renderer resolved-quad gate state');
assertHas(viewerFile, 'effectContentUsesResolvedQuad', 'viewer debug payload must expose effect-content resolved-quad gate state');
assertHas(viewerFile, 'effectVisibleBounds', 'viewer debug payload should include effect visible bounds');
assertHas(viewerFile, 'baseTvScreenInnerRect: ScreenRectStyle;', 'viewer debug payload must expose base screen-inner rect');
assertHas(viewerFile, 'resolvedTvScreenInnerRect: ScreenRectStyle;', 'viewer debug payload must expose resolved screen-inner rect');
assertHas(viewerFile, 'const clampRectWithin = useCallback((rect: NumericScreenRect, container: NumericScreenRect): NumericScreenRect => {', 'viewer must clamp visible effect bounds within resolved tv screen-inner rect');
assertHas(viewerFile, 'const clampedVisible = clampRectWithin(measuredNumeric, resolvedTvScreenInnerRectNumeric);', 'viewer effect visible bounds must be clamped to resolved tv screen-inner rect');
assertHas(viewerFile, "const TV_GEOMETRY_KIND: TvGeometryKind = 'quad';", 'viewer geometry kind must stay quad');
assertHas(viewerFile, "const TV_TARGET_REGION_KIND: TvTargetRegionKind = TV_ANCHOR_CALIBRATION.tvTargetRegionKind;", 'viewer target region semantic must stay tv_screen_inner');
assertHas(viewerFile, 'TV_SCREEN_GEOMETRY_BY_SHOT', 'viewer should document per-shot quad source');
assertHas(viewerFile, 'tvTargetRegionKind: TV_TARGET_REGION_KIND,', 'viewer debug payload must expose tv target region kind');
assertHas(viewerFile, 'rendererGeometrySource,', 'viewer debug payload must expose renderer geometry source');
assertHas(viewerFile, 'rendererGeometryKind,', 'viewer debug payload must expose renderer geometry kind');
assertHas(viewerFile, 'rendererFallbackReason,', 'viewer debug payload must expose fallback reason');
assertHas(viewerFile, 'rendererUsesResolvedGeometry', 'viewer should expose renderer resolved geometry identity');
assertHas(viewerFile, 'effectContentUsesResolvedGeometry', 'viewer should expose effect content resolved geometry identity');
assertHas(viewerFile, 'transitionState', 'viewer debug payload should include structured transition state');
assertHas(viewerFile, 'className="sandbox360OverlayTvNoiseContent"', 'tv effect should render through explicit inner content layer');
assertHas(viewerFile, 'className="sandbox360OverlayTvBoundsViz"', 'tv bounds visualization should render explicit dual-frame overlay');
assertHas(viewerFile, 'className="sandbox360OverlayTvBoundsVizCorner"', 'tv bounds visualization should expose quad corners');
assertHas(viewerFile, 'effectsDebugMap: EffectsDebugMap;', 'viewer payload should expose unified effects debug map');
assertHas(viewerFile, 'const effectsDebugMap = useMemo<EffectsDebugMap>(() => {', 'viewer should build effects debug ssot map');
if (viewerFile.includes('className="sandbox360OverlayTvDebug"')) {
  throw new Error('main view tv debug red box must be removed');
}
assertHas(viewerFile, 'clipPath: `polygon(', 'tv effect content must use quad polygon clip path');
if (viewerFile.includes('TV_SCREEN_QUAD_BY_SHOT')) {
  throw new Error('legacy TV_SCREEN_QUAD_BY_SHOT wording should be removed');
}
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
assertHas(appFile, 'calibrationSource: \'-\',', 'app overlay debug state should include calibration source');
assertHas(appFile, "tvGeometryKind: 'rect' as 'rect' | 'quad',", 'app overlay debug state should include geometry kind');
assertHas(appFile, 'baseTvScreenInnerQuad:', 'app overlay debug state should include base tv screen-inner quad');
assertHas(appFile, 'baseTvScreenInnerRect: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include base screen-inner rect');
assertHas(appFile, 'baseTvScreenQuad:', 'app overlay debug state should include base tv screen quad');
assertHas(appFile, 'resolvedTvScreenQuad:', 'app overlay debug state should include resolved tv screen quad');
assertHas(appFile, 'resolvedTvScreenInnerRect: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include resolved screen-inner rect');
assertHas(appFile, 'effectsDebugMap: EMPTY_EFFECTS_DEBUG_MAP', 'app overlay debug state should include unified effect map');
assertHas(appFile, 'resolvedTvBoundingRect: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include resolved bounding rect');
assertHas(appFile, 'renderedEffectRect: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include rendered effect rect');
assertHas(appFile, 'effectVisibleBounds: { left: \'-\', top: \'-\', width: \'-\', height: \'-\' },', 'app overlay debug state should include effect visible bounds');
assertHas(appFile, "tvTargetRegionKind: 'tv_outer_frame' as 'tv_outer_frame' | 'tv_body' | 'tv_screen_inner',", 'app overlay debug state should include tv target region semantic');
assertHas(appFile, 'rendererUsesResolvedQuad: false,', 'app overlay debug state should expose renderer resolved-quad identity flag');
assertHas(appFile, 'effectContentUsesResolvedQuad: false,', 'app overlay debug state should expose effect-content resolved-quad identity flag');
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
assertHas(appFile, 'calibrationSource: payload.calibrationSource,', 'app should consume calibration source');
assertHas(appFile, 'baseTvScreenInnerQuad: payload.baseTvScreenInnerQuad,', 'app should consume base tv screen-inner quad');
assertHas(appFile, 'baseTvScreenInnerRect: payload.baseTvScreenInnerRect,', 'app should consume base tv screen-inner rect');
assertHas(appFile, 'resolvedTvScreenQuad: payload.resolvedTvScreenQuad,', 'app should consume resolved tv quad from viewer SSOT');
assertHas(appFile, 'resolvedTvScreenInnerRect: payload.resolvedTvScreenInnerRect,', 'app should consume resolved tv screen-inner rect from viewer SSOT');
assertHas(appFile, 'resolvedTvBoundingRect: payload.resolvedTvBoundingRect,', 'app should consume resolved tv bounding rect from viewer SSOT');
assertHas(appFile, 'renderedEffectRect: payload.renderedEffectRect,', 'app should consume rendered effect rect from viewer SSOT');
assertHas(appFile, 'effectVisibleBounds: payload.effectVisibleBounds,', 'app should consume effect visible bounds from viewer SSOT');
assertHas(appFile, 'tvTargetRegionKind: payload.tvTargetRegionKind,', 'app should consume tv target region semantic from viewer SSOT');
assertHas(appFile, 'rendererGeometrySource: payload.rendererGeometrySource,', 'app should consume renderer geometry source');
assertHas(appFile, 'rendererGeometryKind: payload.rendererGeometryKind,', 'app should consume renderer geometry kind');
assertHas(appFile, 'rendererFallbackReason: payload.rendererFallbackReason,', 'app should consume renderer fallback reason');
assertHas(appFile, 'rendererUsesResolvedGeometry: payload.rendererUsesResolvedGeometry,', 'app should consume renderer resolved geometry identity');
assertHas(appFile, 'effectContentUsesResolvedGeometry: payload.effectContentUsesResolvedGeometry,', 'app should consume effect resolved geometry identity');
assertHas(appFile, 'effectsDebugMap: payload.effectsDebugMap', 'app should consume effects debug map payload');
assertHas(appFile, 'TV effect bounds visualization:', 'debug page must expose tv effect bounds visualization toggle');
assertHas(appFile, 'quadDiff: {sandbox360OverlayDebug.quadDiff}', 'debug page must show quad diff observability');
assertHas(appFile, 'rendererUsesResolvedQuad: {String(sandbox360OverlayDebug.rendererUsesResolvedQuad)}', 'debug panel should show renderer quad identity gate');
assertHas(appFile, 'effectContentUsesResolvedQuad: {String(sandbox360OverlayDebug.effectContentUsesResolvedQuad)}', 'debug panel should show effect content quad identity gate');
assertHas(appFile, 'rendererGeometrySource: {sandbox360OverlayDebug.rendererGeometrySource}', 'debug panel should show renderer geometry source');
assertHas(appFile, 'rendererUsesResolvedGeometry: {String(sandbox360OverlayDebug.rendererUsesResolvedGeometry)}', 'debug panel should show renderer resolved geometry identity');
assertHas(appFile, 'calibrationSource: {sandbox360OverlayDebug.calibrationSource}', 'debug panel should show calibration source');
assertHas(appFile, 'baseTvScreenInnerRect: left={sandbox360OverlayDebug.baseTvScreenInnerRect.left}', 'debug panel should show base screen-inner rect');
assertHas(appFile, 'resolvedTvScreenInnerRect: left={sandbox360OverlayDebug.resolvedTvScreenInnerRect.left}', 'debug panel should show resolved screen-inner rect');
assertHas(appFile, '<strong>GLOBAL EFFECT RESOLVE</strong>', 'debug panel should show unified effect resolve block');
assertHas(appFile, 'Object.entries(sandbox360OverlayDebug.effectsDebugMap)', 'debug panel should render unified effect map entries');
if (appFile.includes('resolvedTvScreenRect')) {
  throw new Error('legacy resolvedTvScreenRect naming should be removed from app debug schema');
}

assertHas(calibrationFile, 'export const BASE_SCENE_WIDTH = 2048;', 'tv calibration must use 2048 base width');
assertHas(calibrationFile, 'export const BASE_SCENE_HEIGHT = 1365;', 'tv calibration must use 1365 base height');
assertHas(calibrationFile, "source: 'manual_authored_base_scene_absolute_screen_inner_quad_from_user_red_box_center_2048x1365',", 'tv calibration source must describe user red-box center base rect');
assertHas(calibrationFile, 'CENTER_SCREEN_INNER_RECT', 'tv calibration should be anchored by explicit center screen-inner rect');

console.log('regression-sandbox360-shot-events: ok');
