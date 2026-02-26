const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

const normalizeWithTrailingSlash = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

const getBaseHref = () => {
  if (typeof document === 'undefined') return '';
  const baseEl = document.querySelector('base[href]');
  if (!baseEl) return '';
  return baseEl.getAttribute('href') ?? '';
};

const getViteBaseUrl = () => {
  if (typeof import.meta === 'undefined') return '';
  const viteBase = import.meta.env?.BASE_URL;
  return typeof viteBase === 'string' ? viteBase : '';
};

const resolveBaseUrl = () => {
  const baseHref = getBaseHref();
  if (baseHref) return normalizeWithTrailingSlash(baseHref);

  const viteBaseUrl = getViteBaseUrl();
  if (viteBaseUrl) return normalizeWithTrailingSlash(viteBaseUrl);

  if (typeof document !== 'undefined' && document.baseURI) {
    return normalizeWithTrailingSlash(document.baseURI);
  }

  return '/';
};

export const ASSET_BASE_URL = resolveBaseUrl();

export const joinUrl = (base: string, relativePath: string) => {
  if (!relativePath) return base;
  if (ABSOLUTE_URL_PATTERN.test(relativePath) || relativePath.startsWith('//')) return relativePath;

  const normalizedRelative = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

  if (typeof window === 'undefined') {
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${normalizedRelative}`;
  }

  try {
    return new URL(normalizedRelative, base).toString();
  } catch {
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${normalizedRelative}`;
  }
};

export const resolveAssetUrl = (relativePath: string) => joinUrl(ASSET_BASE_URL, relativePath);
