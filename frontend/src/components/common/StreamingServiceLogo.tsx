'use client';

import React from 'react';
import Image from 'next/image';
import { POPULAR_SERVICES } from '@/types/streaming';

interface StreamingServiceLogoProps {
  serviceId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
  fallbackToIcon?: boolean;
}

const SIZE_MAP = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
} as const;

/**
 * StreamingServiceLogo Component
 *
 * Displays streaming service logos with fallback support.
 * Uses SVG logos from /public/logos/streaming/ directory.
 *
 * @param serviceId - The ID of the streaming service (e.g., 'netflix', 'hbo')
 * @param size - Size variant: xs (16px), sm (24px), md (32px), lg (48px), xl (64px)
 * @param showName - Whether to display the service name below the logo
 * @param className - Additional CSS classes
 * @param fallbackToIcon - Use text icon fallback if logo fails to load
 */
export const StreamingServiceLogo: React.FC<StreamingServiceLogoProps> = ({
  serviceId,
  size = 'md',
  showName = false,
  className = '',
  fallbackToIcon = false,
}) => {
  const service = POPULAR_SERVICES.find(s => s.id === serviceId);
  const pixelSize = SIZE_MAP[size];

  // Generate logo path
  const getLogoPath = (id: string): string => {
    const logoMap: Record<string, string> = {
      netflix: '/logos/streaming/netflix.svg',
      hbo: '/logos/streaming/hbo.svg',
      disney: '/logos/streaming/disney-plus.svg',
      amazon: '/logos/streaming/amazon-prime.svg',
      hulu: '/logos/streaming/hulu.svg',
      paramount: '/logos/streaming/paramount-plus.svg',
      peacock: '/logos/streaming/peacock.svg',
      apple: '/logos/streaming/apple-tv.svg',
      youtube: '/logos/streaming/youtube-premium.svg',
      max: '/logos/streaming/max.svg',
      showtime: '/logos/streaming/showtime.svg',
      starz: '/logos/streaming/starz.svg',
      crunchyroll: '/logos/streaming/crunchyroll.svg',
    };

    return logoMap[id] || '';
  };

  const logoPath = getLogoPath(serviceId);

  // Fallback for unknown services
  if (!service || !logoPath) {
    return (
      <div
        className={`flex flex-col items-center ${className}`}
        aria-label={`${service?.name || 'Unknown'} streaming service`}
        role="img"
      >
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: pixelSize,
            height: pixelSize,
            backgroundColor: service?.brandColor || '#64748b',
          }}
        >
          <span
            className="font-bold"
            style={{
              color: service?.textColor || '#FFFFFF',
              fontSize: `${pixelSize * 0.5}px`,
            }}
          >
            {service?.icon || '?'}
          </span>
        </div>
        {showName && service && (
          <span className="mt-1 text-xs text-foreground">{service.name}</span>
        )}
      </div>
    );
  }

  // Render logo with Next.js Image component
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      aria-label={`${service.name} streaming service`}
    >
      <div
        style={{
          width: pixelSize,
          height: pixelSize,
          position: 'relative',
        }}
      >
        <Image
          src={logoPath}
          alt={`${service.name} streaming service logo`}
          width={pixelSize}
          height={pixelSize}
          className="rounded-lg"
          style={{ objectFit: 'contain' }}
          loading="lazy"
          onError={(e) => {
            if (fallbackToIcon && service) {
              // On error, replace with fallback
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.fallback-icon');
              if (fallback) {
                (fallback as HTMLElement).style.display = 'flex';
              }
            }
          }}
        />
        {/* Fallback icon hidden by default */}
        {fallbackToIcon && service && (
          <div
            className="fallback-icon absolute inset-0 hidden items-center justify-center rounded-lg"
            style={{
              backgroundColor: service.brandColor,
            }}
          >
            <span
              className="font-bold"
              style={{
                color: service.textColor,
                fontSize: `${pixelSize * 0.5}px`,
              }}
            >
              {service.icon}
            </span>
          </div>
        )}
      </div>
      {showName && (
        <span className="mt-1 text-xs text-foreground">{service.name}</span>
      )}
    </div>
  );
};

export default StreamingServiceLogo;
