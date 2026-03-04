export type PronounceState = 'playing' | 'idle' | 'error';

export async function playPronounceAudio(audioKey: string): Promise<{ state: PronounceState; reason?: string }> {
  if (!audioKey?.trim()) return { state: 'error', reason: 'missing_audio_key' };
  const src = `/assets/phonetics/${audioKey}.mp3`;
  try {
    const audio = new Audio(src);
    await audio.play();
    return { state: 'playing' };
  } catch (error) {
    return { state: 'error', reason: error instanceof Error ? error.message : 'play_failed' };
  }
}
