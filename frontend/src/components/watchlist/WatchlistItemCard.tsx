// Individual Watchlist Item Card Component

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { WatchlistItemCardProps } from '@/types/watchlist';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  MoreVertical,
  Play,
  Eye,
  EyeOff,
  Star,
  Clock,
  Download,
  Share2,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export const WatchlistItemCard: React.FC<WatchlistItemCardProps> = ({
  item,
  view,
  isSelected = false,
  isDragging = false,
  onSelect,
  onUpdate,
  onRemove,
  onToggleWatched,
}) => {
  const [_isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Calculate availability status
  const availabilityStatus = React.useMemo(() => {
    const availability = item.availability || [];
    const available = availability.filter(a => a.isAvailable);
    const total = availability.length;

    if (available.length === 0) return { status: 'unavailable', count: 0, total };
    if (available.length === total) return { status: 'fully_available', count: available.length, total };
    return { status: 'partially_available', count: available.length, total };
  }, [item.availability]);

  // Handle card click for selection
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (onSelect) {
        onSelect(item.id);
      }
    },
    [item.id, onSelect]
  );

  // Handle checkbox change
  const handleCheckboxChange = useCallback(
    (_checked: boolean) => {
      if (onSelect) {
        onSelect(item.id);
      }
    },
    [item.id, onSelect]
  );

  // Handle watched toggle
  const handleWatchedToggle = useCallback(() => {
    if (onUpdate) {
      onUpdate({
        ...item,
        watched: !item.watched,
        watchedDate: !item.watched ? new Date() : undefined,
      });
    }
    if (onToggleWatched) {
      onToggleWatched(item.id);
    }
  }, [item, onUpdate, onToggleWatched]);

  // Handle remove
  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove(item.id);
    }
  }, [item.id, onRemove]);

  // Format duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive';
      case 'medium':
        return 'bg-warning';
      case 'low':
        return 'bg-success';
      default:
        return 'bg-muted';
    }
  };

  // Get availability badge color
  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'fully_available':
        return 'bg-success';
      case 'partially_available':
        return 'bg-warning';
      case 'unavailable':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const cardContent = (
    <>
      {/* Header with Selection and Menu */}
      <CardHeader className="p-2 pb-0">
        <div className="flex items-center justify-between">
          <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} className="z-10" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleWatchedToggle}>
                {item.watched ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Mark as Unwatched
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Mark as Watched
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="mr-2 h-4 w-4" />
                View on IMDB
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Poster/Image */}
      <CardContent className="p-2">
        <div className="relative aspect-[2/3] mb-3 rounded-md overflow-hidden bg-muted">
          {item.poster && !imageError ? (
            <>
              <Image
                src={item.poster}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={cn(
                  'object-cover transition-opacity duration-200',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                priority={false}
              />
              {!imageLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Play className="h-8 w-8 mx-auto mb-2" />
                <div className="text-sm font-medium">{item.type.toUpperCase()}</div>
              </div>
            </div>
          )}

          {/* Overlay with badges */}
          <div className="absolute top-2 left-2 right-2 flex justify-between">
            <Badge variant="secondary" className={cn('text-xs', getPriorityColor(item.priority))}>
              {item.priority}
            </Badge>
            <Badge variant="secondary" className={cn('text-xs', getAvailabilityColor(availabilityStatus.status))}>
              {availabilityStatus.count}/{availabilityStatus.total}
            </Badge>
          </div>

          {/* Watched indicator */}
          {item.watched && (
            <div className="absolute bottom-2 right-2">
              <div className="bg-success rounded-full p-1">
                <Eye className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          )}

          {/* Progress bar for TV series */}
          {item.type === 'tv_series' && item.progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <Progress value={item.progress} className="h-1" />
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</h3>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.year && <span>{item.year}</span>}
            {item.duration && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(item.duration)}
                </span>
              </>
            )}
          </div>

          {item.rating && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span>{item.rating.toFixed(1)}/10</span>
            </div>
          )}

          {item.genre && item.genre.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.genre.slice(0, 2).map(genre => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {item.genre.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{item.genre.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Footer with Actions */}
      <CardFooter className="p-2 pt-0">
        <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
          <span>Added {item.addedDate ? format(new Date(item.addedDate), 'MMM dd') : 'Unknown'}</span>
          <div className="flex items-center gap-1">
            {availabilityStatus.count > 0 && <Download className="h-3 w-3 text-success" />}
          </div>
        </div>
      </CardFooter>
    </>
  );

  if (view === 'list' || view === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center p-3 border-b hover:bg-muted/50 transition-colors group',
          isSelected && 'bg-muted',
          isDragging && 'opacity-50'
        )}
        onClick={handleCardClick}
      >
        <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} className="mr-3" />

        {/* Compact poster */}
        <div className="relative w-12 h-16 mr-3 rounded overflow-hidden bg-muted flex-shrink-0">
          {item.poster && !imageError ? (
            <Image
              src={item.poster}
              alt={item.title}
              fill
              sizes="48px"
              className="object-cover"
              onError={() => setImageError(true)}
              priority={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Play className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{item.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.year && <span>{item.year}</span>}
            {item.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(item.duration)}</span>
              </>
            )}
            {item.rating && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {item.rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 ml-4">
          <Badge className={cn('text-xs', getPriorityColor(item.priority))}>{item.priority}</Badge>
          <Badge className={cn('text-xs', getAvailabilityColor(availabilityStatus.status))}>
            {availabilityStatus.count}/{availabilityStatus.total}
          </Badge>
          {item.watched && <Eye className="h-4 w-4 text-success" />}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleWatchedToggle}>
              {item.watched ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Mark as Unwatched
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Mark as Watched
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleRemove} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        isDragging && 'opacity-50 transform rotate-2',
        'h-full'
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {cardContent}
    </Card>
  );
};
