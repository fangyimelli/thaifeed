export type PronounceResult = 'played' | 'missing';

export async function playPronounce(audioKey: string): Promise<PronounceResult> {
  if (!audioKey?.trim()) return 'missing';
  const src = `/assets/phonetics/${audioKey}.mp3`;
  try {
    const audio = new Audio(src);
    await audio.play();
    return 'played';
  } catch {
    return 'missing';
  }
}
