import type { SceneInitError } from '../scene/SceneView';

export type LoadingState =
  | 'BOOT_START'
  | 'ASSETS_CHECKING'
  | 'ASSETS_READY'
  | 'NEED_USER_GESTURE'
  | 'RUNNING'
  | 'ERROR';

type Props = {
  state: LoadingState;
  stageText: string;
  error: SceneInitError | null;
};

export default function LoadingOverlay({ state, stageText, error }: Props) {
  if (state === 'RUNNING') return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label="載入狀態">
      <div className="loading-overlay-content">
        <div className="loading-label">直播準備中</div>
        <p>{stageText}</p>
        {state === 'NEED_USER_GESTURE' && <p>點一下畫面以開始</p>}

        {state === 'ERROR' && error && (
          <div className="loading-error-panel" role="alert" aria-live="assertive">
            <p>{error.summary}</p>
            {error.missingAssets.length > 0 && (
              <ul>
                {error.missingAssets.map((item) => (
                  <li key={`${item.name}-${item.url}`}>
                    <strong>{item.name}</strong>
                    <div>{item.url}</div>
                  </li>
                ))}
              </ul>
            )}
            <p>請重新整理頁面，或修正缺失檔案後再試一次。</p>
          </div>
        )}
      </div>
    </div>
  );
}
