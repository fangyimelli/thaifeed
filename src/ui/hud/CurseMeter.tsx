type Props = {
  curse: number;
};

export default function CurseMeter({ curse }: Props) {
  return (
    <div className="curse-meter">
      <span>Curse</span>
      <div className="bar">
        <div className="fill" style={{ width: `${curse}%` }} />
      </div>
      <strong>{curse}</strong>
    </div>
  );
}
