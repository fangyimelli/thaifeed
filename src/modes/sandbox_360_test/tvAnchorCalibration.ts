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
  version: 'tv-anchor-calibration.v2026-03-25.2',
  calibratedAt: '2026-03-25T12:00:00.000Z',
  source: 'manual_red_box_ssot_user_review_screen_inner_only',
  referenceScene: {
    width: 4096,
    height: 2048
  },
  anchor: {
    x: 2232,
    y: 1022,
    w: 176,
    h: 88
  }
};
