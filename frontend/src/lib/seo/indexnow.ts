const INDEXNOW_KEY = process.env.INDEXNOW_API_KEY || 'geoleap-indexnow-key';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const HOST = 'geoleap.app';

export async function submitToIndexNow(urls: string[]): Promise<{ success: boolean; error?: string }> {
  if (!urls.length) return { success: true };

  // Only allow URLs for our own host  -  reject any absolute URLs for other domains
  const validUrls = urls
    .map(url => {
      if (url.startsWith('http')) {
        try {
          const parsed = new URL(url);
          if (parsed.hostname !== HOST) return null;
          return url;
        } catch {
          return null;
        }
      }
      return `https://${HOST}${url}`;
    })
    .filter((url): url is string => url !== null);

  if (!validUrls.length) return { success: false, error: 'No valid URLs for geoleap.app' };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: validUrls,
      }),
    });

    if (response.ok || response.status === 202) {
      return { success: true };
    }
    return { success: false, error: `IndexNow returned ${response.status}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
