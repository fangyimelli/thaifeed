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
  version: 'tv-screen-quad-calibration.v2026-03-25.4',
  calibratedAt: '2026-03-25T20:30:00.000Z',
  source: 'manual_red_box_ssot_user_review_screen_inner_quad_by_shot_center_realigned_strict_inner',
  tvGeometryKind: 'quad',
  tvTargetRegionKind: 'tv_screen_inner',
  referenceScene: {
    width: 4096,
    height: 2048
  },
  quadByShot: {
    left: {
      topLeft: { x: 2243, y: 1030 },
      topRight: { x: 2392, y: 1027 },
      bottomRight: { x: 2395, y: 1102 },
      bottomLeft: { x: 2241, y: 1105 }
    },
    center: {
      topLeft: { x: 2244, y: 1031 },
      topRight: { x: 2391, y: 1028 },
      bottomRight: { x: 2394, y: 1101 },
      bottomLeft: { x: 2242, y: 1104 }
    },
    right: {
      topLeft: { x: 2246, y: 1032 },
      topRight: { x: 2389, y: 1029 },
      bottomRight: { x: 2392, y: 1100 },
      bottomLeft: { x: 2244, y: 1103 }
    }
  }
};
