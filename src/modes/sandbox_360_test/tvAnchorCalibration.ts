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

export const BASE_SCENE_WIDTH = 4096;
export const BASE_SCENE_HEIGHT = 2048;

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

export const TV_SCREEN_INNER_QUAD_BY_SHOT: Record<TvScreenInnerShot, TvScreenQuad> = {
  LEFT: {
    topLeft: { x: 2239, y: 1018 },
    topRight: { x: 2295, y: 1017 },
    bottomRight: { x: 2296, y: 1076 },
    bottomLeft: { x: 2238, y: 1077 }
  },
  CENTER: {
    topLeft: { x: 2240, y: 1019 },
    topRight: { x: 2294, y: 1018 },
    bottomRight: { x: 2295, y: 1076 },
    bottomLeft: { x: 2239, y: 1077 }
  },
  RIGHT: {
    topLeft: { x: 2241, y: 1020 },
    topRight: { x: 2293, y: 1019 },
    bottomRight: { x: 2294, y: 1075 },
    bottomLeft: { x: 2240, y: 1076 }
  }
};

export const TV_ANCHOR_CALIBRATION: TvAnchorCalibration = {
  version: 'tv-screen-inner-base-scene-calibration.v2026-03-25.6',
  calibratedAt: '2026-03-25T23:20:00.000Z',
  source: 'manual_authored_base_scene_absolute_screen_inner_quad_by_shot_red_box_followup',
  tvGeometryKind: 'quad',
  tvTargetRegionKind: 'tv_screen_inner',
  referenceScene: {
    width: BASE_SCENE_WIDTH,
    height: BASE_SCENE_HEIGHT
  },
  quadByShot: TV_SCREEN_INNER_QUAD_BY_SHOT
};
