export type TvAnchorCalibration = {
  version: string;
  calibratedAt: string;
  source: string;
  referenceScene: {
    width: number;
    height: number;
  };
  anchor: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

export const TV_ANCHOR_CALIBRATION: TvAnchorCalibration = {
  version: 'tv-anchor-calibration.v2026-03-25.1',
  calibratedAt: '2026-03-25T00:00:00.000Z',
  source: 'manual_red_box_ssot_user_review',
  referenceScene: {
    width: 4096,
    height: 2048
  },
  anchor: {
    x: 2256,
    y: 1054,
    w: 220,
    h: 118
  }
};
