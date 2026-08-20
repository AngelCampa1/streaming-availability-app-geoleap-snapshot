'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Filter, X, RotateCcw } from 'lucide-react';
import { FilterOptions } from '@/lib/seo/types';

interface FiltersPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableTemplates?: { id: string; name: string }[];
}

export function FiltersPanel({ filters, onFiltersChange, availableTemplates = [] }: FiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const updateLocalFilters = (updates: Partial<FilterOptions>) => {
    setLocalFilters(prev => ({ ...prev, ...updates }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const emptyFilters: FilterOptions = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.status?.length) count++;
    if (localFilters.template?.length) count++;
    if (localFilters.dateRange) count++;
    if (localFilters.performance) count++;
    return count;
  };

  const removeFilter = (filterType: string) => {
    const newFilters = { ...localFilters };
    switch (filterType) {
      case 'status':
        delete newFilters.status;
        break;
      case 'template':
        delete newFilters.template;
        break;
      case 'dateRange':
        delete newFilters.dateRange;
        break;
      case 'performance':
        delete newFilters.performance;
        break;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="flex items-center space-x-2">
      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center space-x-1">
          {localFilters.status?.length && (
            <Badge variant="secondary" className="text-xs">
              Status: {localFilters.status.join(', ')}
              <button onClick={() => removeFilter('status')} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {localFilters.template?.length && (
            <Badge variant="secondary" className="text-xs">
              Template: {localFilters.template.length} selected
              <button onClick={() => removeFilter('template')} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {localFilters.dateRange && (
            <Badge variant="secondary" className="text-xs">
              Date Range
              <button onClick={() => removeFilter('dateRange')} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {localFilters.performance && (
            <Badge variant="secondary" className="text-xs">
              Performance
              <button onClick={() => removeFilter('performance')} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Filters Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Advanced Filters</SheetTitle>
            <SheetDescription>Refine your search with detailed filtering options</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <Accordion type="single" collapsible defaultValue="status">
              {/* Status Filter */}
              <AccordionItem value="status">
                <AccordionTrigger>Page Status</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {['published', 'draft', 'archived'].map(status => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={localFilters.status?.includes(status) || false}
                        onCheckedChange={checked => {
                          const currentStatus = localFilters.status || [];
                          if (checked) {
                            updateLocalFilters({
                              status: [...currentStatus, status],
                            });
                          } else {
                            updateLocalFilters({
                              status: currentStatus.filter(s => s !== status),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={status} className="capitalize">
                        {status}
                      </Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Template Filter */}
              <AccordionItem value="template">
                <AccordionTrigger>Templates</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {availableTemplates.map(template => (
                    <div key={template.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={template.id}
                        checked={localFilters.template?.includes(template.id) || false}
                        onCheckedChange={checked => {
                          const currentTemplates = localFilters.template || [];
                          if (checked) {
                            updateLocalFilters({
                              template: [...currentTemplates, template.id],
                            });
                          } else {
                            updateLocalFilters({
                              template: currentTemplates.filter(t => t !== template.id),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={template.id}>{template.name}</Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Date Range Filter */}
              <AccordionItem value="dateRange">
                <AccordionTrigger>Date Range</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        type="date"
                        value={localFilters.dateRange?.start || ''}
                        onChange={e =>
                          updateLocalFilters({
                            dateRange: {
                              ...localFilters.dateRange,
                              start: e.target.value,
                              end: localFilters.dateRange?.end || '',
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        type="date"
                        value={localFilters.dateRange?.end || ''}
                        onChange={e =>
                          updateLocalFilters({
                            dateRange: {
                              ...localFilters.dateRange,
                              start: localFilters.dateRange?.start || '',
                              end: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Performance Filter */}
              <AccordionItem value="performance">
                <AccordionTrigger>Performance Metrics</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Views</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="minViews" className="text-xs">
                          Min
                        </Label>
                        <Input
                          type="number"
                          placeholder="Min views"
                          value={localFilters.performance?.minViews || ''}
                          onChange={e =>
                            updateLocalFilters({
                              performance: {
                                ...localFilters.performance,
                                minViews: Number(e.target.value) || undefined,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="maxViews" className="text-xs">
                          Max
                        </Label>
                        <Input
                          type="number"
                          placeholder="Max views"
                          value={localFilters.performance?.maxViews || ''}
                          onChange={e =>
                            updateLocalFilters({
                              performance: {
                                ...localFilters.performance,
                                maxViews: Number(e.target.value) || undefined,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Click-Through Rate (%)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="minCtr" className="text-xs">
                          Min
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Min CTR"
                          value={localFilters.performance?.minCtr || ''}
                          onChange={e =>
                            updateLocalFilters({
                              performance: {
                                ...localFilters.performance,
                                minCtr: Number(e.target.value) || undefined,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="maxCtr" className="text-xs">
                          Max
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Max CTR"
                          value={localFilters.performance?.maxCtr || ''}
                          onChange={e =>
                            updateLocalFilters({
                              performance: {
                                ...localFilters.performance,
                                maxCtr: Number(e.target.value) || undefined,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4 border-t">
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
