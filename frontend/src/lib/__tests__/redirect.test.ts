import { getSafeRedirectPath } from '../redirect';

describe('getSafeRedirectPath', () => {
  it('allows same-origin relative paths', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('/upgrade?annual=true')).toBe('/upgrade?annual=true');
    expect(getSafeRedirectPath('/search#results')).toBe('/search#results');
  });

  it('rejects executable and cross-origin redirect values', () => {
    expect(getSafeRedirectPath('javascript:alert(document.domain)', '/')).toBe('/');
    expect(getSafeRedirectPath('JaVaScRiPt:alert(1)', '/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('data:text/html,<script>alert(1)</script>', '/')).toBe('/');
    expect(getSafeRedirectPath('https://evil.test/account', '/')).toBe('/');
    expect(getSafeRedirectPath('//evil.test/account', '/')).toBe('/');
    expect(getSafeRedirectPath('\\\\evil.test\\account', '/')).toBe('/');
  });

  it('rejects encoded protocol and control-character variants', () => {
    expect(getSafeRedirectPath('/%5cevil.test/account', '/')).toBe('/');
    expect(getSafeRedirectPath('/%2fevil.test/account', '/')).toBe('/');
    expect(getSafeRedirectPath('/safe\nSet-Cookie:bad=true', '/')).toBe('/');
  });

  it('falls back for empty or non-path input', () => {
    expect(getSafeRedirectPath(null, '/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('', '/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('dashboard', '/dashboard')).toBe('/dashboard');
  });
});
