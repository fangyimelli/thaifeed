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
  quadByShot: Record<'left' | 'center' | 'right', TvScreenQuad>;
};

export const TV_ANCHOR_CALIBRATION: TvAnchorCalibration = {
  version: 'tv-screen-quad-calibration.v2026-03-25.3',
  calibratedAt: '2026-03-25T18:00:00.000Z',
  source: 'manual_red_box_ssot_user_review_screen_inner_quad_by_shot',
  tvGeometryKind: 'quad',
  tvTargetRegionKind: 'tv_screen_inner',
  referenceScene: {
    width: 4096,
    height: 2048
  },
  quadByShot: {
    left: {
      topLeft: { x: 2229, y: 1022 },
      topRight: { x: 2410, y: 1017 },
      bottomRight: { x: 2414, y: 1110 },
      bottomLeft: { x: 2225, y: 1114 }
    },
    center: {
      topLeft: { x: 2232, y: 1022 },
      topRight: { x: 2408, y: 1019 },
      bottomRight: { x: 2411, y: 1110 },
      bottomLeft: { x: 2230, y: 1112 }
    },
    right: {
      topLeft: { x: 2234, y: 1024 },
      topRight: { x: 2407, y: 1021 },
      bottomRight: { x: 2410, y: 1109 },
      bottomLeft: { x: 2232, y: 1112 }
    }
  }
};
