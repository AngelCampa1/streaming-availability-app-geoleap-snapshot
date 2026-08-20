import { readFileSync } from 'fs';
import { join } from 'path';

// Extract the SUSPICIOUS_SEARCH_PATTERN from the source file so tests always
// reflect the live regex rather than a hardcoded copy.
const pageSource = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf-8');
const patternMatch = pageSource.match(/const SUSPICIOUS_SEARCH_PATTERN\s*=\s*(\/.*?\/[a-z]*);/);
const SUSPICIOUS_SEARCH_PATTERN: RegExp = patternMatch
  ? new RegExp(
      patternMatch[1].replace(/^\//, '').replace(/\/[a-z]*$/, ''),
      patternMatch[1].match(/\/([a-z]*)$/)?.[1] ?? ''
    )
  : /(?:never-match)/;

describe('SearchPage - SEO', () => {
  let pageContent: string;

  beforeAll(() => {
    pageContent = readFileSync(
      join(__dirname, '..', 'page.tsx'),
      'utf-8'
    );
  });

  it('contains an h1 element', () => {
    expect(pageContent).toMatch(/<h1[\s>]/);
  });

  it('h1 has sr-only class for visual hiding', () => {
    expect(pageContent).toContain('className="sr-only"');
  });

  it('h1 has meaningful content', () => {
    expect(pageContent).toContain('Search Streaming Content');
  });
});

describe('SUSPICIOUS_SEARCH_PATTERN', () => {
  describe('XSS patterns  -  should match', () => {
    it('matches alert()', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test("alert('xss')")).toBe(true);
    });

    it('matches javascript: protocol', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('javascript:void(0)')).toBe(true);
    });

    it('matches onerror= attribute', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('<img onerror=alert(1)>')).toBe(true);
    });

    it('matches onload= attribute', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('<body onload=alert(1)>')).toBe(true);
    });

    it('matches <script tag', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('<script>evil()</script>')).toBe(true);
    });
  });

  describe('SQL injection patterns  -  should match', () => {
    it("matches '; DROP TABLE pattern", () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test("'; DROP TABLE users; --")).toBe(true);
    });

    it("matches '; DELETE FROM pattern", () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test("'; DELETE FROM sessions")).toBe(true);
    });

    it("matches '; INSERT INTO pattern", () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test("'; INSERT INTO users VALUES")).toBe(true);
    });

    it('matches UNION SELECT pattern', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('UNION SELECT * FROM users')).toBe(true);
    });

    it("matches ' OR 1=1 pattern", () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test("' OR 1=1")).toBe(true);
    });

    it('is case-insensitive for SQL keywords', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('union select password from users')).toBe(true);
    });
  });

  describe('legitimate searches  -  should NOT match', () => {
    it('does not match a normal movie title', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('Breaking Bad')).toBe(false);
    });

    it('does not match a title with dashes', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('Spider-Man: No Way Home')).toBe(false);
    });

    it('does not match a title with numbers', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('2001: A Space Odyssey')).toBe(false);
    });

    it('does not match standalone DROP without quote-semicolon prefix', () => {
      // "Drop" by itself is a legitimate word in titles
      expect(SUSPICIOUS_SEARCH_PATTERN.test('Drop the Ball')).toBe(false);
    });

    it('does not match standalone OR', () => {
      expect(SUSPICIOUS_SEARCH_PATTERN.test('This or That')).toBe(false);
    });
  });
});
