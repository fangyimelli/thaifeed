const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const userAgentMobile = MOBILE_UA_REGEX.test(navigator.userAgent);

  return coarsePointer || userAgentMobile;
}
