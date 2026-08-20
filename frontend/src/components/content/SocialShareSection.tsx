'use client';

import React from 'react';
import { ContentData } from '@/lib/api/content';
import { SocialShareButton } from '@/components/social/SocialShareButton';
import { SocialPlatform } from '@/lib/types/social';
import { generateCanonicalUrl } from '@/lib/seo/url-generation';

interface SocialShareSectionProps {
  content: ContentData;
  type: 'movie' | 'tv-show' | 'documentary';
  className?: string;
}

/**
 * Social sharing section for content pages
 * Optimized for engagement and sharing
 */
export function SocialShareSection({ content, type, className = '' }: SocialShareSectionProps) {
  const _shareUrl = generateCanonicalUrl(type, `${content.id}-${content.title.toLowerCase().replace(/\s+/g, '-')}`);

  const shareTitle = `Check out ${content.title} (${content.releaseYear || 'TBD'})`;
  const shareDescription = content.overview || `Discover where to watch ${content.title} online.`;
  const shareImage = content.posterUrl || content.backdropUrl;

  return (
    <section className={`py-8 ${className}`} aria-labelledby="share-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h2 id="share-heading" className="text-xl font-semibold text-foreground mb-4">
            Share {content.title}
          </h2>

          <p className="text-foreground-muted mb-6">Found this helpful? Share it with your friends!</p>

          <div className="flex flex-wrap justify-center gap-3">
            <SocialShareButton
              platform={SocialPlatform.Twitter}
              contentId={content.id}
              contentTitle={shareTitle}
              contentDescription={shareDescription}
              contentImage={shareImage}
              className="flex-shrink-0"
            />

            <SocialShareButton
              platform={SocialPlatform.Facebook}
              contentId={content.id}
              contentTitle={shareTitle}
              contentDescription={shareDescription}
              contentImage={shareImage}
              className="flex-shrink-0"
            />

            <SocialShareButton
              platform={SocialPlatform.Reddit}
              contentId={content.id}
              contentTitle={shareTitle}
              contentDescription={shareDescription}
              className="flex-shrink-0"
            />

            <SocialShareButton
              platform={SocialPlatform.LinkedIn}
              contentId={content.id}
              contentTitle={shareTitle}
              contentDescription={shareDescription}
              className="flex-shrink-0"
            />

            <SocialShareButton
              platform={SocialPlatform.WhatsApp}
              contentId={content.id}
              contentTitle={shareTitle}
              className="flex-shrink-0"
            />

            {/* Copy functionality would need different component */}
          </div>

          {/* Engagement Stats */}
          {content.rating && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-foreground-muted">
                <div className="flex items-center gap-2">
                  <span className="text-warning">⭐</span>
                  <span>{content.rating.toFixed(1)}/10</span>
                  {content.voteCount && <span>({content.voteCount.toLocaleString()} votes)</span>}
                </div>

                {content.streamingOptions && content.streamingOptions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span>📺</span>
                    <span>
                      Available on {content.streamingOptions.length} platform
                      {content.streamingOptions.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {content.releaseYear && (
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{content.releaseYear}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
