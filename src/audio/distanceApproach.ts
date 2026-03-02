import { SFX_REGISTRY } from './SfxRegistry';

export type PlayResult =
  | { ok: true; key: ApproachKey; startedAt: number; durationMs: number; sourceType: 'webaudio' | 'htmlaudio' }
  | {
    ok: false;
    key: string;
    reason: 'paused' | 'cooldown' | 'audio_locked' | 'asset_missing' | 'decode_failed' | 'play_rejected' | 'volume_zero' | 'unknown';
    detail?: string;
  };

export type ApproachProfile = {
  durationMs: number;
  startGain: number;
  endGain: number;
  startLPFCutoffHz: number;
  endLPFCutoffHz: number;
  startPan: number;
  endPan: number;
  startPlaybackRate: number;
  endPlaybackRate: number;
};

type ApproachKey = 'footsteps' | 'ghost_female';

const DEFAULT_PROFILE: Record<ApproachKey, ApproachProfile> = {
  footsteps: {
    durationMs: 4600,
    startGain: 0.12,
    endGain: 0.72,
    startLPFCutoffHz: 380,
    endLPFCutoffHz: 7200,
    startPan: 0,
    endPan: 0,
    startPlaybackRate: 0.96,
    endPlaybackRate: 1.04
  },
  ghost_female: {
    durationMs: 3400,
    startGain: 0.1,
    endGain: 0.68,
    startLPFCutoffHz: 300,
    endLPFCutoffHz: 6800,
    startPan: 0,
    endPan: 0,
    startPlaybackRate: 0.98,
    endPlaybackRate: 1.06
  }
};

class DistanceApproachPlayer {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bufferCache = new Map<ApproachKey, AudioBuffer>();
  private activeSources = new Map<ApproachKey, AudioBufferSourceNode>();
  private masterVolume = 1;
  private lastApproach: { key: ApproachKey; startGain: number; endGain: number; currentGain: number; startedAt: number; durationMs: number } | null = null;

  private getOrCreateContext() {
    if (this.context) return this.context;
    this.context = new window.AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
    this.masterGain.connect(this.context.destination);
    return this.context;
  }

  async resumeFromGesture() {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
    const context = this.getOrCreateContext();
    if (context.state !== 'running') {
      await context.resume();
    }
  }

  private async ensureBuffer(key: ApproachKey) {
    const cached = this.bufferCache.get(key);
    if (cached) return cached;
    const spec = SFX_REGISTRY[key];
    const context = this.getOrCreateContext();
    const response = await fetch(spec.file);
    if (!response.ok) throw new Error(`fetch_failed:${response.status}`);
    const arr = await response.arrayBuffer();
    const buffer = await context.decodeAudioData(arr.slice(0));
    this.bufferCache.set(key, buffer);
    return buffer;
  }

  async playSfxApproach(key: ApproachKey, opts?: { profileOverride?: Partial<ApproachProfile> }): Promise<PlayResult> {
    const context = this.getOrCreateContext();
    if (context.state !== 'running') {
      try {
        await context.resume();
      } catch (error) {
        return { ok: false, key, reason: 'audio_locked', detail: error instanceof Error ? error.message : String(error) };
      }
    }
    let sourceBuffer: AudioBuffer;
    try {
      sourceBuffer = await this.ensureBuffer(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, key, reason: message.startsWith('fetch_failed') ? 'asset_missing' : 'decode_failed', detail: message };
    }
    const source = context.createBufferSource();
    source.buffer = sourceBuffer;

    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    const panner = context.createStereoPanner();

    source.connect(gain);
    gain.connect(filter);
    filter.connect(panner);
    panner.connect(this.masterGain ?? context.destination);

    const defaults = DEFAULT_PROFILE[key];
    const randomizedStartPan = (Math.random() * 0.7) - 0.35;
    const durationMs = Math.round((opts?.profileOverride?.durationMs ?? defaults.durationMs) * (1 + ((Math.random() * 0.3) - 0.15)));
    const resolved: ApproachProfile = {
      ...defaults,
      ...opts?.profileOverride,
      durationMs,
      startPan: opts?.profileOverride?.startPan ?? randomizedStartPan,
      endPan: opts?.profileOverride?.endPan ?? randomizedStartPan * 0.2,
      endGain: Math.min(0.9, opts?.profileOverride?.endGain ?? defaults.endGain),
      startGain: Math.max(0.05, opts?.profileOverride?.startGain ?? defaults.startGain),
      startLPFCutoffHz: Math.max(200, opts?.profileOverride?.startLPFCutoffHz ?? defaults.startLPFCutoffHz),
      endLPFCutoffHz: Math.max(200, opts?.profileOverride?.endLPFCutoffHz ?? defaults.endLPFCutoffHz),
      startPlaybackRate: Math.max(0.95, Math.min(1.08, opts?.profileOverride?.startPlaybackRate ?? defaults.startPlaybackRate)),
      endPlaybackRate: Math.max(0.95, Math.min(1.08, opts?.profileOverride?.endPlaybackRate ?? defaults.endPlaybackRate))
    };

    if (this.masterVolume <= 0 || resolved.startGain <= 0 || resolved.endGain <= 0) {
      return { ok: false, key, reason: 'volume_zero', detail: `master=${this.masterVolume}, start=${resolved.startGain}, end=${resolved.endGain}` };
    }

    const t0 = context.currentTime;
    const t1 = t0 + resolved.durationMs / 1000;
    gain.gain.setValueAtTime(Math.max(0.0001, resolved.startGain), t0);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, resolved.endGain), t1);
    filter.frequency.setValueAtTime(Math.max(80, resolved.startLPFCutoffHz), t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, resolved.endLPFCutoffHz), t1);
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, resolved.startPan)), t0);
    panner.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, resolved.endPan)), t1);
    source.playbackRate.setValueAtTime(Math.max(0.75, resolved.startPlaybackRate), t0);
    source.playbackRate.linearRampToValueAtTime(Math.max(0.75, resolved.endPlaybackRate), t1);

    const active = this.activeSources.get(key);
    if (active) {
      try { active.stop(); } catch { /* noop */ }
    }
    source.start(t0);
    this.activeSources.set(key, source);
    this.lastApproach = {
      key,
      startGain: resolved.startGain,
      endGain: resolved.endGain,
      currentGain: resolved.startGain,
      startedAt: Date.now(),
      durationMs: resolved.durationMs
    };
    const startedAt = Date.now();
    const startedPerf = performance.now();
    const step = () => {
      if (!this.lastApproach || this.lastApproach.key !== key) return;
      const progress = Math.min(1, (performance.now() - startedPerf) / Math.max(1, resolved.durationMs));
      this.lastApproach.currentGain = resolved.startGain + (resolved.endGain - resolved.startGain) * progress;
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
    source.onended = () => {
      if (this.activeSources.get(key) === source) this.activeSources.delete(key);
    };

    return { ok: true, key, startedAt, durationMs: resolved.durationMs, sourceType: 'webaudio' };
  }

  stopAll() {
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch { /* noop */ }
    });
    this.activeSources.clear();
  }

  getPlayingKeys() {
    return [...this.activeSources.keys()];
  }

  setMasterVolume(value: number) {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
    }
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  getLastApproach() {
    return this.lastApproach;
  }
}

export const distanceApproachPlayer = new DistanceApproachPlayer();

export async function playSfxApproach(key: ApproachKey, opts?: { profileOverride?: Partial<ApproachProfile> }) {
  return distanceApproachPlayer.playSfxApproach(key, opts);
}
