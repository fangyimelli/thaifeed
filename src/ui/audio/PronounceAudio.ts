import { resolveAssetUrl } from '../../config/assetUrls';

export type PronounceResult = 'played' | 'missing';

export async function playPronounce(audioKey: string): Promise<PronounceResult> {
  if (!audioKey?.trim()) return 'missing';
  const src = resolveAssetUrl(`assets/phonetics/${audioKey}.mp3`);
  try {
    const probe = await fetch(src, { method: 'HEAD' });
    if (!probe.ok) return 'missing';
    const audio = new Audio(src);
    await audio.play();
    return 'played';
  } catch {
    return 'missing';
  }
}
