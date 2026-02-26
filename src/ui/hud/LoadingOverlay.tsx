type Props = {
  visible: boolean;
  progress?: number;
  statusText?: string;
  errorTitle?: string;
  errors?: string[];
};

export default function LoadingOverlay({
  visible,
  progress,
  statusText,
  errorTitle,
  errors = []
}: Props) {
  if (!visible) return null;

  const hasErrors = errors.length > 0;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label="載入狀態">
      <div className="loading-overlay-content">
        {!hasErrors && <div className="loading-spinner" aria-hidden="true" />}
        <p>{statusText ?? '正在連線'}</p>
        {!hasErrors && <p>載入直播畫面中{typeof progress === 'number' ? ` (${progress}%)` : ''}</p>}
        {hasErrors && (
          <div className="loading-error-block" role="alert">
            <p>{errorTitle ?? '必要素材缺失，無法完成初始化。'}</p>
            <p>請確認以下檔案路徑：</p>
            <ul>
              {errors.map((item) => (
                <li key={item}>
                  <code>{item}</code>
                </li>
              ))}
            </ul>
            <p>請重新整理後重試。</p>
          </div>
        )}
      </div>
    </div>
  );
}
