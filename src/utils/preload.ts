import { REQUIRED_AUDIO_ASSETS, REQUIRED_VIDEO_ASSETS } from '../config/oldhousePlayback';
import type { AssetManifestItem } from '../config/assetManifest';

type ProgressSnapshot = {
  progress: number;
  loaded: number;
  total: number;
  errors: string[];
  requiredErrors: string[];
  optionalErrors: string[];
};

export type MissingRequiredAsset = {
  name: string;
  type: 'video' | 'audio';
  relativePath: string;
  url: string;
  reason: string;
};

type PreloadOptions = {
  onProgress?: (state: ProgressSnapshot) => void;
};

const MEDIA_PRELOAD_TIMEOUT_MS = 3000;

type CachedAsset = HTMLImageElement | HTMLAudioElement | HTMLVideoElement;

declare global {
  interface Window {
    __assetCache?: Map<string, CachedAsset>;
  }
}

const assetCache =
  typeof window !== 'undefined'
    ? (window.__assetCache ??= new Map<string, CachedAsset>())
    : new Map<string, CachedAsset>();

function emitProgress(
  loaded: number,
  total: number,
  requiredErrors: string[],
  optionalErrors: string[],
  onProgress?: (state: ProgressSnapshot) => void
) {
  const progress = total === 0 ? 100 : Math.round((loaded / total) * 100);
  onProgress?.({
    progress,
    loaded,
    total,
    errors: [...requiredErrors, ...optionalErrors],
    requiredErrors: [...requiredErrors],
    optionalErrors: [...optionalErrors]
  });
}

async function verifyAssetByFetch(url: string): Promise<void> {
  let headStatus: number | null = null;

  try {
    const headResponse = await fetch(url, { method: 'HEAD' });
    if (headResponse.ok) return;
    headStatus = headResponse.status;

    if (headResponse.status !== 405 && headResponse.status !== 501) {
      throw new Error(`HEAD ${headResponse.status}`);
    }
  } catch {
    // fall through to GET verification
  }

  const getResponse = await fetch(url, { method: 'GET' });
  if (getResponse.ok) return;

  if (headStatus !== null) {
    throw new Error(`HEAD ${headStatus}; GET ${getResponse.status}`);
  }

  throw new Error(`GET ${getResponse.status}`);
}

async function verifyVideos(): Promise<MissingRequiredAsset[]> {
  const missing: MissingRequiredAsset[] = [];

  await Promise.all(REQUIRED_VIDEO_ASSETS.map(async (asset) => {
    try {
      await verifyAssetByFetch(asset.src);
    } catch (error) {
      missing.push({
        name: asset.name,
        type: 'video',
        relativePath: asset.relativePath,
        url: asset.src,
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  return missing;
}

async function verifyAudio(): Promise<MissingRequiredAsset[]> {
  const missing: MissingRequiredAsset[] = [];

  await Promise.all(REQUIRED_AUDIO_ASSETS.map(async (asset) => {
    try {
      await verifyAssetByFetch(asset.src);
    } catch (error) {
      missing.push({
        name: asset.name,
        type: 'audio',
        relativePath: asset.relativePath,
        url: asset.src,
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  return missing;
}

export async function verifyRequiredAssets(): Promise<MissingRequiredAsset[]> {
  const [missingVideos, missingAudio] = await Promise.all([verifyVideos(), verifyAudio()]);
  return [...missingVideos, ...missingAudio];
}

function preloadImage(src: string): Promise<HTMLImageElement> {
  const cached = assetCache.get(src);
  if (cached instanceof HTMLImageElement) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      assetCache.set(src, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error(src));
    image.src = src;
  });
}

function preloadAudio(src: string): Promise<HTMLAudioElement> {
  const cached = assetCache.get(src);
  if (cached instanceof HTMLAudioElement) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.muted = false;
    audio.volume = 1;
    audio.src = src;
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.clearTimeout(timeoutId);
      audio.onloadeddata = null;
      audio.oncanplaythrough = null;
      audio.onerror = null;
      fn();
    };

    const timeoutId = window.setTimeout(() => {
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        finish(() => {
          assetCache.set(src, audio);
          resolve(audio);
        });
        return;
      }
      finish(() => reject(new Error(src)));
    }, MEDIA_PRELOAD_TIMEOUT_MS);

    audio.onloadeddata = () => {
      finish(() => {
        assetCache.set(src, audio);
        resolve(audio);
      });
    };
    audio.oncanplaythrough = audio.onloadeddata;
    audio.onerror = () => finish(() => reject(new Error(src)));
    audio.load();
  });
}

function preloadVideo(src: string): Promise<HTMLVideoElement> {
  const cached = assetCache.get(src);
  if (cached instanceof HTMLVideoElement) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    video.playsInline = true;
    video.src = src;
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.clearTimeout(timeoutId);
      video.onloadeddata = null;
      video.oncanplaythrough = null;
      video.onerror = null;
      fn();
    };

    const onReady = () => {
      finish(() => {
        assetCache.set(src, video);
        resolve(video);
      });
    };

    const timeoutId = window.setTimeout(() => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        onReady();
        return;
      }
      finish(() => reject(new Error(src)));
    }, MEDIA_PRELOAD_TIMEOUT_MS);

    video.onloadeddata = onReady;
    video.oncanplaythrough = onReady;
    video.onerror = () => finish(() => reject(new Error(src)));
    video.load();
  });
}

function preloadAsset(asset: AssetManifestItem): Promise<CachedAsset> {
  if (asset.type === 'image') return preloadImage(asset.src);
  if (asset.type === 'audio') return preloadAudio(asset.src);
  return preloadVideo(asset.src);
}

export async function preloadAssets(
  manifest: AssetManifestItem[],
  options: PreloadOptions = {}
): Promise<ProgressSnapshot> {
  const total = manifest.length;
  let loaded = 0;
  const requiredErrors: string[] = [];
  const optionalErrors: string[] = [];

  emitProgress(loaded, total, requiredErrors, optionalErrors, options.onProgress);

  await Promise.all(
    manifest.map(async (asset) => {
      try {
        await preloadAsset(asset);
      } catch {
        if (asset.required) {
          requiredErrors.push(asset.src);
        } else {
          optionalErrors.push(asset.src);
        }
      } finally {
        loaded += 1;
        emitProgress(loaded, total, requiredErrors, optionalErrors, options.onProgress);
      }
    })
  );

  return {
    progress: total === 0 ? 100 : Math.round((loaded / total) * 100),
    loaded,
    total,
    errors: [...requiredErrors, ...optionalErrors],
    requiredErrors,
    optionalErrors
  };
}

export function getCachedAsset(src: string) {
  return assetCache.get(src);
}
