// Dialog for Adding New Watchlist Items

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { WatchlistItem, WatchlistCategory } from '@/types/watchlist';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Tag, X, Film } from 'lucide-react';
import { useWatchlistSearch } from '@/hooks/useWatchlist';
import { EmptyState } from '@/components/ui/empty-state';

interface WatchlistAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: WatchlistCategory[];
  onAdd: (item: Partial<WatchlistItem>) => void;
}

export const WatchlistAddDialog: React.FC<WatchlistAddDialogProps> = ({ open, onOpenChange, categories, onAdd }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [formData, setFormData] = useState<Partial<WatchlistItem>>({
    type: 'movie',
    priority: 'medium',
    watched: false,
    genre: [],
    tags: [],
  });
  const [newTag, setNewTag] = useState('');

  const { searchQuery, setSearchQuery, results, isSearching } = useWatchlistSearch();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        type: 'movie',
        priority: 'medium',
        watched: false,
        genre: [],
        tags: [],
      });
      setSearchQuery('');
      setActiveTab('search');
    }
  }, [open, setSearchQuery]);

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle genre addition
  const handleAddGenre = (genre: string) => {
    const currentGenres = formData.genre || [];
    if (!currentGenres.includes(genre)) {
      handleInputChange('genre', [...currentGenres, genre]);
    }
  };

  // Handle genre removal
  const handleRemoveGenre = (genre: string) => {
    const currentGenres = formData.genre || [];
    handleInputChange(
      'genre',
      currentGenres.filter(g => g !== genre)
    );
  };

  // Handle tag addition
  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = formData.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        handleInputChange('tags', [...currentTags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tag: string) => {
    const currentTags = formData.tags || [];
    handleInputChange(
      'tags',
      currentTags.filter(t => t !== tag)
    );
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!formData.title?.trim()) return;

    const newItem: Partial<WatchlistItem> = {
      ...formData,
      addedDate: new Date(),
      lastChecked: new Date(),
      availability: [],
    };

    onAdd(newItem);
    onOpenChange(false);
  };

  // Handle search result selection
  const handleSelectSearchResult = (result: any) => {
    setFormData({
      title: result.title,
      type: result.type || 'movie',
      year: result.year,
      genre: result.genres || [],
      poster: result.poster,
      description: result.overview || result.description,
      imdbId: result.imdb_id,
      tmdbId: result.id?.toString(),
      rating: result.vote_average,
      duration: result.runtime,
      priority: 'medium',
      watched: false,
      tags: [],
    });
    setActiveTab('manual');
  };

  // Common genres for quick selection
  const commonGenres = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Horror',
    'Sci-Fi',
    'Thriller',
    'Romance',
    'Animation',
    'Documentary',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search & Add</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search movies, TV shows..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isSearching && <div className="text-center py-8 text-muted-foreground">Searching...</div>}

            {results.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result: any, index: number) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectSearchResult(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {result.poster && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={result.poster} alt={result.title} className="w-12 h-18 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{result.title}</h4>
                          <div className="text-sm text-muted-foreground">
                            {result.year} • {result.type}
                          </div>
                          {result.overview && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{result.overview}</p>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchQuery && !isSearching && results.length === 0 && (
              <EmptyState
                icon={<Film className="h-10 w-10" />}
                title="No results found"
                description="Try a different search term or add the item manually"
                action={{
                  label: 'Try Manual Entry',
                  onClick: () => setActiveTab('manual'),
                  variant: 'outline',
                }}
              />
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Title */}
              <div className="col-span-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="Movie or TV show title"
                  value={formData.title || ''}
                  onChange={e => handleInputChange('title', e.target.value)}
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.type} onValueChange={value => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="tv_series">TV Series</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div>
                <label className="text-sm font-medium">Year</label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={formData.year || ''}
                  onChange={e => handleInputChange('year', parseInt(e.target.value) || undefined)}
                />
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium">Rating (1-10)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="10"
                  placeholder="7.5"
                  value={formData.rating || ''}
                  onChange={e => handleInputChange('rating', parseFloat(e.target.value) || undefined)}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  placeholder="120"
                  value={formData.duration || ''}
                  onChange={e => handleInputChange('duration', parseInt(e.target.value) || undefined)}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority} onValueChange={value => handleInputChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={formData.category} onValueChange={value => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Plot summary or notes..."
                value={formData.description || ''}
                onChange={e => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Genres */}
            <div>
              <label className="text-sm font-medium">Genres</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {commonGenres.map(genre => (
                  <Button
                    key={genre}
                    variant={formData.genre?.includes(genre) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => (formData.genre?.includes(genre) ? handleRemoveGenre(genre) : handleAddGenre(genre))}
                  >
                    {genre}
                  </Button>
                ))}
              </div>
              {formData.genre && formData.genre.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.genre.map(genre => (
                    <Badge key={genre} variant="secondary" className="gap-1">
                      {genre}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveGenre(genre)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} size="sm">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Personal Notes */}
            <div>
              <label className="text-sm font-medium">Personal Notes</label>
              <Textarea
                placeholder="Why you want to watch this..."
                value={formData.personalNotes || ''}
                onChange={e => handleInputChange('personalNotes', e.target.value)}
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} disabled={!formData.title?.trim()} className="flex-1">
                Add to Watchlist
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
