import { NextResponse } from 'next/server';
import { platforms } from '@/data/platforms';
import { SITE_URL } from '@/lib/seo/site-config';

export const dynamic = 'force-static';

const BASE_URL = SITE_URL;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildImageLoc(logoPath: string): string {
  if (logoPath.startsWith('/')) {
    return `${BASE_URL}${logoPath}`;
  }
  return logoPath;
}

export function GET() {
  const urlEntries = platforms
    .map((platform) => {
      const pageUrl = escapeXml(`${BASE_URL}/platforms/${platform.slug}`);
      const imageLoc = escapeXml(buildImageLoc(platform.logoPath));
      const title = escapeXml(`${platform.name} Logo`);
      const caption = escapeXml(`${platform.name} streaming service logo`);

      return `  <url>
    <loc>${pageUrl}</loc>
    <image:image>
      <image:loc>${imageLoc}</image:loc>
      <image:title>${title}</image:title>
      <image:caption>${caption}</image:caption>
    </image:image>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
