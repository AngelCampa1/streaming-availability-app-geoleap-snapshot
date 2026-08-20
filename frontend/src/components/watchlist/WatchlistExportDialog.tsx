// Export Dialog for Watchlist Data

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import { WatchlistExport, WatchlistCategory } from '@/types/watchlist';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Database, Table, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import watchlistApi from '@/services/watchlistApi';

interface WatchlistExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
  categories: WatchlistCategory[];
}

export const WatchlistExportDialog: React.FC<WatchlistExportDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  categories,
}) => {
  const [exportSettings, setExportSettings] = useState<WatchlistExport>({
    format: 'json',
    includeAvailability: true,
    includeNotes: true,
    includeProgress: true,
    categories: [],
    dateRange: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Export format options
  const formatOptions = [
    {
      value: 'json',
      label: 'JSON',
      description: 'Structured data format, best for importing into other apps',
      icon: Database,
      extension: '.json',
    },
    {
      value: 'csv',
      label: 'CSV',
      description: 'Spreadsheet format, easy to open in Excel or Google Sheets',
      icon: Table,
      extension: '.csv',
    },
    {
      value: 'xml',
      label: 'XML',
      description: 'Structured markup format for data exchange',
      icon: FileText,
      extension: '.xml',
    },
    {
      value: 'pdf',
      label: 'PDF',
      description: 'Formatted document for sharing or printing',
      icon: Image,
      extension: '.pdf',
    },
    {
      value: 'm3u',
      label: 'M3U Playlist',
      description: 'Media playlist format for streaming applications',
      icon: FileText,
      extension: '.m3u',
    },
  ];

  // Handle export setting change
  const handleSettingChange = (key: keyof WatchlistExport, value: any) => {
    setExportSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handle category selection
  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = exportSettings.categories || [];
    const updatedCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];

    handleSettingChange('categories', updatedCategories);
  };

  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true);

      const blob = await watchlistApi.exportWatchlist(exportSettings);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      const format = formatOptions.find(f => f.value === exportSettings.format);
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `watchlist-${timestamp}${format?.extension || '.txt'}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error (show toast notification)
    } finally {
      setIsExporting(false);
    }
  };

  // Get selected format details
  const selectedFormat = formatOptions.find(f => f.value === exportSettings.format);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Watchlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Scope */}
          <div>
            <h3 className="text-sm font-semibold mb-3">What to Export</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{selectedItems.length > 0 ? 'Selected Items' : 'All Items'}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedItems.length > 0
                      ? `${selectedItems.length} selected items`
                      : 'Export your entire watchlist'}
                  </div>
                </div>
                <Badge variant="secondary">{selectedItems.length > 0 ? selectedItems.length : 'All'}</Badge>
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Export Format</h3>
            <div className="grid grid-cols-1 gap-2">
              {formatOptions.map(format => {
                const Icon = format.icon;
                const isSelected = exportSettings.format === format.value;

                return (
                  <Card
                    key={format.value}
                    className={cn('cursor-pointer transition-colors', isSelected && 'border-primary bg-primary/5')}
                    onClick={() => handleSettingChange('format', format.value)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-md',
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{format.label}</div>
                          <div className="text-sm text-muted-foreground">{format.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {format.extension}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Include Options */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Include in Export</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={exportSettings.includeAvailability}
                  onCheckedChange={checked => handleSettingChange('includeAvailability', checked)}
                />
                <label htmlFor="availability" className="text-sm">
                  Server availability information
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={exportSettings.includeNotes}
                  onCheckedChange={checked => handleSettingChange('includeNotes', checked)}
                />
                <label htmlFor="notes" className="text-sm">
                  Personal notes and comments
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={exportSettings.includeProgress}
                  onCheckedChange={checked => handleSettingChange('includeProgress', checked)}
                />
                <label htmlFor="progress" className="text-sm">
                  Watch progress for TV series
                </label>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Filter by Categories (Optional)</h3>
              <div className="text-xs text-muted-foreground mb-3">Leave empty to export all categories</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={exportSettings.categories?.includes(category.id) || false}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <label htmlFor={`category-${category.id}`} className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Date Range (Optional)</h3>
            <div className="text-xs text-muted-foreground mb-3">Export items added within a specific date range</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">From Date</label>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                  onChange={e => {
                    const dateRange = exportSettings.dateRange || {};
                    handleSettingChange('dateRange', {
                      ...dateRange,
                      from: e.target.value ? new Date(e.target.value) : undefined,
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To Date</label>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                  onChange={e => {
                    const dateRange = exportSettings.dateRange || {};
                    handleSettingChange('dateRange', {
                      ...dateRange,
                      to: e.target.value ? new Date(e.target.value) : undefined,
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Export Preview */}
          {selectedFormat && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Export Preview</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  Format: <span className="font-medium">{selectedFormat.label}</span>
                </div>
                <div>
                  Scope:{' '}
                  <span className="font-medium">
                    {selectedItems.length > 0 ? `${selectedItems.length} selected items` : 'All items'}
                  </span>
                </div>
                <div>
                  Includes:{' '}
                  <span className="font-medium">
                    {[
                      exportSettings.includeAvailability && 'Availability',
                      exportSettings.includeNotes && 'Notes',
                      exportSettings.includeProgress && 'Progress',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Basic info only'}
                  </span>
                </div>
                {exportSettings.categories && exportSettings.categories.length > 0 && (
                  <div>
                    Categories: <span className="font-medium">{exportSettings.categories.length} selected</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleExport} disabled={isExporting} className="flex-1">
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Watchlist
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
