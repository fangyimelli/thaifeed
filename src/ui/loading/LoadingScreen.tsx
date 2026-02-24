type Props = {
  progress: number;
  errors: string[];
  onRetry: () => void;
};

export default function LoadingScreen({ progress, errors, onRetry }: Props) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <section className="loading-screen" aria-live="polite">
      <div className="loading-panel">
        <h1>載入中…</h1>
        <p className="loading-progress-text">{safeProgress}%</p>
        <div className="loading-progress-track" role="progressbar" aria-valuenow={safeProgress} aria-valuemin={0} aria-valuemax={100}>
          <div className="loading-progress-fill" style={{ width: `${safeProgress}%` }} />
        </div>

        {errors.length > 0 && (
          <div className="loading-error-box">
            <p>部分資源載入失敗，請重試。</p>
            <button type="button" onClick={onRetry}>
              重試
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
