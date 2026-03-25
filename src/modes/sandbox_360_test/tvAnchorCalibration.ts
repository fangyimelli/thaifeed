export type TvScreenQuadPoint = {
  x: number;
  y: number;
};

export type TvScreenQuad = {
  topLeft: TvScreenQuadPoint;
  topRight: TvScreenQuadPoint;
  bottomRight: TvScreenQuadPoint;
  bottomLeft: TvScreenQuadPoint;
};

export const BASE_SCENE_WIDTH = 2048;
export const BASE_SCENE_HEIGHT = 1365;

export type TvScreenInnerShot = 'LEFT' | 'CENTER' | 'RIGHT';

export type TvAnchorCalibration = {
  version: string;
  calibratedAt: string;
  source: string;
  tvGeometryKind: 'quad';
  tvTargetRegionKind: 'tv_screen_inner';
  referenceScene: {
    width: number;
    height: number;
  };
  quadByShot: Record<TvScreenInnerShot, TvScreenQuad>;
};

const rectToQuad = (left: number, top: number, right: number, bottom: number): TvScreenQuad => ({
  topLeft: { x: left, y: top },
  topRight: { x: right, y: top },
  bottomRight: { x: right, y: bottom },
  bottomLeft: { x: left, y: bottom }
});

const CENTER_SCREEN_INNER_RECT = {
  left: 1153,
  top: 705,
  right: 1209,
  bottom: 750
} as const;

export const TV_SCREEN_INNER_QUAD_BY_SHOT: Record<TvScreenInnerShot, TvScreenQuad> = {
  LEFT: rectToQuad(CENTER_SCREEN_INNER_RECT.left, CENTER_SCREEN_INNER_RECT.top, CENTER_SCREEN_INNER_RECT.right, CENTER_SCREEN_INNER_RECT.bottom),
  CENTER: rectToQuad(CENTER_SCREEN_INNER_RECT.left, CENTER_SCREEN_INNER_RECT.top, CENTER_SCREEN_INNER_RECT.right, CENTER_SCREEN_INNER_RECT.bottom),
  RIGHT: rectToQuad(CENTER_SCREEN_INNER_RECT.left, CENTER_SCREEN_INNER_RECT.top, CENTER_SCREEN_INNER_RECT.right, CENTER_SCREEN_INNER_RECT.bottom)
};

export const TV_ANCHOR_CALIBRATION: TvAnchorCalibration = {
  version: 'tv-screen-inner-base-scene-calibration.v2026-03-25.7',
  calibratedAt: '2026-03-25T23:55:00.000Z',
  source: 'manual_authored_base_scene_absolute_screen_inner_quad_from_user_red_box_center_2048x1365',
  tvGeometryKind: 'quad',
  tvTargetRegionKind: 'tv_screen_inner',
  referenceScene: {
    width: BASE_SCENE_WIDTH,
    height: BASE_SCENE_HEIGHT
  },
  quadByShot: TV_SCREEN_INNER_QUAD_BY_SHOT
};
