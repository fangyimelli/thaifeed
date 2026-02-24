type Props = {
  viewerCountLabel: string;
};

export default function LiveHeader({ viewerCountLabel }: Props) {
  return (
    <header className="live-header">
      <div className="live-tag">LIVE</div>
      <h1>深夜老屋觀察</h1>
      <div className="viewer-count">👁 {viewerCountLabel}</div>
    </header>
  );
}
