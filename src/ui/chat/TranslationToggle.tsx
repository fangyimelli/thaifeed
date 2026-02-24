type Props = {
  expanded: boolean;
  onClick: () => void;
};

export default function TranslationToggle({ expanded, onClick }: Props) {
  return (
    <button className="translation-toggle" onClick={onClick} type="button">
      {expanded ? '收起翻譯' : '翻譯'}
    </button>
  );
}
