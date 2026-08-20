'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Play, Plus, X } from 'lucide-react';
import { SeoTemplate, ContentGenerationRequest } from '@/lib/seo/types';

interface GenerationFormProps {
  templates: SeoTemplate[];
  onSubmit: (request: ContentGenerationRequest) => Promise<void>;
  loading?: boolean;
}

export function GenerationForm({ templates, onSubmit, loading = false }: GenerationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [batchSize, setBatchSize] = useState(100);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [filters, setFilters] = useState({
    minVolume: 1000,
    maxDifficulty: 50,
    excludeKeywords: [] as string[],
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedule, setSchedule] = useState({
    startDate: new Date().toISOString().split('T')[0],
    frequency: 'once' as const,
  });

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplate || keywords.length === 0) return;

    const request: ContentGenerationRequest = {
      templateId: selectedTemplate,
      batchSize,
      priority,
      targetKeywords: keywords,
      filters: {
        minVolume: filters.minVolume,
        maxDifficulty: filters.maxDifficulty,
        excludeKeywords: filters.excludeKeywords,
      },
      ...(scheduleEnabled && { schedule }),
    };

    await onSubmit(request);
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate New Pages</CardTitle>
        <CardDescription>Configure batch page generation with templates and keywords</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col items-start">
                      <span>{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.category} • {template.usageCount} pages
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateData && (
              <p className="text-sm text-muted-foreground">{selectedTemplateData.description}</p>
            )}
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Batch Size</Label>
              <Input
                type="number"
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value))}
                min="1"
                max="1000"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
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
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Target Keywords</Label>
            <div className="flex space-x-2">
              <Input
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                placeholder="Enter keyword and press Add"
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" variant="outline" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary" className="text-sm">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Advanced Options */}
          <Accordion type="single" collapsible>
            <AccordionItem value="filters">
              <AccordionTrigger>Keyword Filters</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Search Volume</Label>
                    <Input
                      type="number"
                      value={filters.minVolume}
                      onChange={e =>
                        setFilters({
                          ...filters,
                          minVolume: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Difficulty (%)</Label>
                    <Input
                      type="number"
                      value={filters.maxDifficulty}
                      onChange={e =>
                        setFilters({
                          ...filters,
                          maxDifficulty: Number(e.target.value),
                        })
                      }
                      max="100"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="schedule">
              <AccordionTrigger>Scheduling</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox checked={scheduleEnabled} onCheckedChange={checked => setScheduleEnabled(!!checked)} />
                  <Label htmlFor="schedule">Schedule generation</Label>
                </div>

                {scheduleEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={schedule.startDate}
                        onChange={e =>
                          setSchedule({
                            ...schedule,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={schedule.frequency}
                        onValueChange={(value: any) =>
                          setSchedule({
                            ...schedule,
                            frequency: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">Once</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button type="submit" className="w-full" disabled={!selectedTemplate || keywords.length === 0 || loading}>
            <Play className="h-4 w-4 mr-2" />
            {loading ? 'Starting Generation...' : 'Start Generation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
