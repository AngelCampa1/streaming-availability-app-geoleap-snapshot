'use client';

import React from 'react';
import { ContentData } from '@/lib/api/content';
import { ContentType } from '@/lib/types';

interface ContentDetailsProps {
  content: ContentData;
  type: ContentType;
  className?: string;
}

/**
 * Detailed content information component (simplified for build)
 */
export function ContentDetails({ content, type: _type, className = '' }: ContentDetailsProps) {
  return (
    <div className={`space-y-8 ${className}`}>
      <section>
        <h3 className="text-xl font-semibold text-foreground mb-4">About {content.title}</h3>
        {content.overview && <p className="text-foreground-muted leading-relaxed">{content.overview}</p>}
      </section>

      {content.genres && content.genres.length > 0 && (
        <section>
          <h4 className="font-semibold text-foreground mb-2">Genres</h4>
          <div className="flex flex-wrap gap-2">
            {content.genres.map(genre => (
              <span key={genre} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                {genre}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="font-semibold text-foreground mb-4">Details</h4>
        <dl className="space-y-2">
          {content.releaseYear && (
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Release Year:</dt>
              <dd className="text-foreground">{content.releaseYear}</dd>
            </div>
          )}
          {content.runtime && (
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Runtime:</dt>
              <dd className="text-foreground">{content.runtime} minutes</dd>
            </div>
          )}
          {content.rating && (
            <div className="flex justify-between">
              <dt className="text-foreground-muted">Rating:</dt>
              <dd className="text-foreground">{content.rating.toFixed(1)}/10</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
