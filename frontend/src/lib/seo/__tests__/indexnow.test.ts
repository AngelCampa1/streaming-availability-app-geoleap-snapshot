import { submitToIndexNow } from '../indexnow';

describe('submitToIndexNow', () => {
  let fetchSpy: jest.SpyInstance;

  function mockResponse(status: number, ok?: boolean) {
    return {
      ok: ok ?? (status >= 200 && status < 300),
      status,
      clone() { return this; },
      json: async () => ({}),
      text: async () => '',
      headers: new Headers(),
    };
  }

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns success for empty URL array', async () => {
    const result = await submitToIndexNow([]);
    expect(result).toEqual({ success: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends POST request to IndexNow endpoint', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(200));

    await submitToIndexNow(['/platforms/netflix']);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.indexnow.org/indexnow');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('prepends host to relative URLs', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(200));

    await submitToIndexNow(['/platforms/netflix']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.urlList[0]).toBe('https://geoleap.app/platforms/netflix');
  });

  it('passes absolute URLs unchanged', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(200));

    await submitToIndexNow(['https://geoleap.app/countries/us']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.urlList[0]).toBe('https://geoleap.app/countries/us');
  });

  it('includes correct host and key in request body', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(200));

    await submitToIndexNow(['/test']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.host).toBe('geoleap.app');
    expect(body.key).toBeDefined();
    expect(body.keyLocation).toContain('geoleap.app');
  });

  it('returns success for 202 status', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(202, false));

    const result = await submitToIndexNow(['/test']);
    expect(result.success).toBe(true);
  });

  it('returns error for non-ok, non-202 status', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(429, false));

    const result = await submitToIndexNow(['/test']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('429');
  });

  it('handles fetch errors gracefully', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const result = await submitToIndexNow(['/test']);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('handles non-Error thrown objects', async () => {
    fetchSpy.mockRejectedValueOnce('something went wrong');

    const result = await submitToIndexNow(['/test']);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });

  it('rejects absolute URLs for other domains', async () => {
    const result = await submitToIndexNow(['https://evil.com/page']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No valid URLs');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('filters out external URLs but keeps valid ones', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(200));

    await submitToIndexNow(['/valid', 'https://evil.com/bad', 'https://geoleap.app/also-valid']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.urlList).toHaveLength(2);
    expect(body.urlList).toContain('https://geoleap.app/valid');
    expect(body.urlList).toContain('https://geoleap.app/also-valid');
  });

  it('sends multiple URLs in a single request', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(200));

    await submitToIndexNow(['/a', '/b', '/c']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.urlList).toHaveLength(3);
  });
});
