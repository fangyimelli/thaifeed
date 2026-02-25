type Props = {
  visible: boolean;
};

export default function LoadingOverlay({ visible }: Props) {
  if (!visible) return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label="載入中">
      <div className="loading-overlay-content">
        <div className="loading-spinner" aria-hidden="true" />
        <p>正在連線</p>
        <p>載入直播畫面中</p>
      </div>
    </div>
  );
}
