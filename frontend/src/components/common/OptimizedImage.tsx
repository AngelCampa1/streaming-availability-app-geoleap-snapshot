'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useIntersectionObserver } from '@/lib/performance-utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  onLoad,
  onError,
  lazy = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Generate a simple blur data URL if not provided (browser-compatible)
  const defaultBlurDataURL =
    blurDataURL ||
    `data:image/svg+xml;base64,${btoa(
      `<svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="hsl(var(--muted))"/>
      <rect width="100%" height="100%" fill="url(#gradient)"/>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(var(--muted-foreground));stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:hsl(var(--muted-foreground));stop-opacity:0.3" />
        </linearGradient>
      </defs>
    </svg>`
    )}`;

  // Intersection observer callback
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !shouldLoad) {
          setShouldLoad(true);
        }
      });
    },
    [shouldLoad]
  );

  const { observe } = useIntersectionObserver(handleIntersection, {
    threshold: 0.1,
    rootMargin: '100px', // Start loading 100px before the image is visible
  });

  // Set up intersection observer
  useEffect(() => {
    if (lazy && !priority && imgRef.current) {
      observe(imgRef.current);
    }
  }, [lazy, priority, observe]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Fallback image for errors
  if (hasError) {
    return (
      <div
        ref={imgRef}
        className={`bg-muted flex items-center justify-center ${className}`}
        style={{ width: width || '100%', height: height || 200 }}
      >
        <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="sr-only">Failed to load image: {alt}</span>
      </div>
    );
  }

  // Loading placeholder
  if (!shouldLoad) {
    return (
      <div
        ref={imgRef}
        className={`bg-muted animate-pulse ${className}`}
        style={{ width: width || '100%', height: height || 200 }}
        aria-label={`Loading: ${alt}`}
      />
    );
  }

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`} style={fill ? {} : { width, height }}>
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? defaultBlurDataURL : undefined}
        sizes={sizes}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          transition-opacity duration-300 
          ${isLoaded ? 'opacity-100' : 'opacity-0'} 
          ${fill ? 'object-cover' : ''}
        `}
      />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Optimized poster image component for movie/TV show posters
 */
interface PosterImageProps {
  src: string;
  title: string;
  year?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
}

export const PosterImage: React.FC<PosterImageProps> = ({
  src,
  title,
  year,
  width = 200,
  height = 300,
  className = '',
  priority = false,
  onClick,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`relative group cursor-pointer ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={onClick ? 0 : undefined}
      aria-label={`View details for ${title}${year ? ` (${year})` : ''}`}
    >
      <OptimizedImage
        src={src}
        alt={`${title}${year ? ` (${year})` : ''} poster`}
        width={width}
        height={height}
        priority={priority}
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 200px"
        className="rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 rounded-lg flex items-center justify-center" aria-hidden="true">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

/**
 * Progressive Image Gallery component for multiple images
 */
export function ProgressiveImageGallery({
  images,
  className = '',
}: {
  images: Array<{ src: string; alt: string; width?: number; height?: number }>;
  className?: string;
}) {
  const [loadedCount, setLoadedCount] = useState(0);
  const totalImages = images.length;

  const handleImageLoad = useCallback(() => {
    setLoadedCount(prev => prev + 1);
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {totalImages > 1 && (
        <div className="flex items-center space-x-2 text-sm text-foreground-muted">
          <div className="flex-1 bg-muted rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${(loadedCount / totalImages) * 100}%` }}
            />
          </div>
          <span>
            {loadedCount}/{totalImages}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <OptimizedImage key={index} {...image} onLoad={handleImageLoad} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Hero Image with optimized loading and Core Web Vitals considerations
 */
export function HeroImage({
  src,
  alt,
  className = '',
  overlay = true,
  ...props
}: OptimizedImageProps & { overlay?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        quality={85}
        placeholder="blur"
        className="object-cover"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...props as any}
      />

      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />}
    </div>
  );
}

export default OptimizedImage;
