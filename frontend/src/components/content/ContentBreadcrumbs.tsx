'use client';

import Link from 'next/link';
import { ContentRouteType } from '@/lib/types';
import { generateCategoryUrl, generateGenreUrl, getTypeDisplayName } from '@/lib/seo/url-generation';

interface ContentBreadcrumbsProps {
  type: ContentRouteType;
  title: string;
  genre?: string;
  year?: number;
  className?: string;
}

export function ContentBreadcrumbs({ type, title, genre, year: _year, className = '' }: ContentBreadcrumbsProps) {
  const breadcrumbs = [
    { label: 'Home', url: '/', current: false },
    {
      label: getTypeDisplayName(type),
      url: generateCategoryUrl(type),
      current: false,
    },
  ];

  if (genre) {
    breadcrumbs.push({
      label: genre,
      url: generateGenreUrl(type, genre),
      current: false,
    });
  }

  breadcrumbs.push({
    label: title,
    url: '#',
    current: true,
  });

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-3 h-3 text-foreground-muted mx-1 md:mx-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m1 9 4-4-4-4"
                />
              </svg>
            )}
            {breadcrumb.current ? (
              <span className="text-sm font-medium text-foreground md:text-base">{breadcrumb.label}</span>
            ) : (
              <Link
                href={breadcrumb.url}
                className="inline-flex items-center text-sm font-medium text-foreground-muted hover:text-primary md:text-base transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
