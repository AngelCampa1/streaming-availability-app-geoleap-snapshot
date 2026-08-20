const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function getSafeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  const safeFallback = fallback === value ? '/' : getSafeRedirectPath(fallback, '/');

  if (!value) {
    return safeFallback;
  }

  const trimmed = value.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\') ||
    CONTROL_CHARS.test(trimmed)
  ) {
    return safeFallback;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return safeFallback;
  }

  if (
    decoded.startsWith('//') ||
    decoded.startsWith('/\\') ||
    decoded.includes('\\') ||
    CONTROL_CHARS.test(decoded)
  ) {
    return safeFallback;
  }

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://geoleap.app';
    const parsed = new URL(decoded, origin);
    if (parsed.origin !== origin) {
      return safeFallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return safeFallback;
  }
}
