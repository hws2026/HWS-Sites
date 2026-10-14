export const DESKTOP_REQUIRED_MESSAGE = 'The HWS suite requires a laptop or desktop computer. Sign-in and workspace access are disabled on phones and tablets.';

type DeviceSignals = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  mobile?: boolean;
};

// Device signals are best-effort, not a replacement for account authorization.
// Do not use viewport width or touch alone: desktop previews and touch laptops work.
export function isMobileDevice(signals: DeviceSignals) {
  const ua = signals.userAgent ?? '';
  if (signals.mobile === true || /^(android|ios|ipados)$/i.test(signals.platform ?? '')) return true;
  if (/Android|iPhone|iPad|iPod|\bMobile\b|\bTablet\b|IEMobile|Windows Phone|BlackBerry|BB10|PlayBook|Kindle|Silk\/|webOS|Opera Mini/i.test(ua)) return true;
  return (signals.maxTouchPoints ?? 0) > 1 && (signals.platform === 'MacIntel' || /Macintosh/i.test(ua));
}

export function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  const browser = navigator as Navigator & {userAgentData?: {mobile?: boolean; platform?: string}};
  return isMobileDevice({userAgent: browser.userAgent, platform: browser.userAgentData?.platform || browser.platform, maxTouchPoints: browser.maxTouchPoints, mobile: browser.userAgentData?.mobile});
}

export function isMobileRequest(headers: Headers) {
  return headers.get('X-HWS-Device') === 'mobile' || isMobileDevice({
    userAgent: headers.get('User-Agent') ?? '',
    platform: (headers.get('Sec-CH-UA-Platform') ?? '').replaceAll('"', ''),
    mobile: headers.get('Sec-CH-UA-Mobile') === '?1',
  });
}

export const isPublicSuitePath = (path: string) => path.startsWith('/demo/') || path.startsWith('/website/');
