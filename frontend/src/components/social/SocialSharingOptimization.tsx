'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  BarChart3,
  Target,
  Eye,
  Heart,
  TrendingUp,
  Calendar,
  RefreshCw,
  Edit,
  X,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';

interface SharingTemplate {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  template: string;
  variables: string[];
  performanceScore: number;
  lastUsed: string;
  usageCount: number;
  isDefault: boolean;
}

interface SharingSchedule {
  id: string;
  contentId: string;
  contentTitle: string;
  platforms: string[];
  scheduledFor: string;
  status: 'pending' | 'posted' | 'failed' | 'cancelled';
  template: string;
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
    reach: number;
  };
}

interface OptimizationSuggestion {
  type: 'timing' | 'content' | 'platform' | 'hashtags' | 'audience';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  platforms: string[];
}

interface SharingAnalytics {
  totalShares: number;
  totalEngagement: number;
  averageReach: number;
  bestPerformingPlatform: string;
  bestPerformingTime: string;
  engagementRate: number;
  growthRate: number;
  platformBreakdown: Record<
    string,
    {
      shares: number;
      engagement: number;
      reach: number;
      conversionRate: number;
    }
  >;
  timeAnalysis: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

interface SocialSharingOptimizationProps {
  className?: string;
}

export function SocialSharingOptimization({ className = '' }: SocialSharingOptimizationProps) {
  const { connections: _connections } = useSocialAuth();
  const [activeTab, setActiveTab] = useState<'templates' | 'schedule' | 'analytics' | 'optimization'>('templates');
  const [templates, setTemplates] = useState<SharingTemplate[]>([]);
  const [schedules, setSchedules] = useState<SharingSchedule[]>([]);
  const [analytics, setAnalytics] = useState<SharingAnalytics | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<SharingTemplate>>({});
  const [_selectedPlatforms, _setSelectedPlatforms] = useState<string[]>([]);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const platformConfigs = {
    twitter: { name: 'Twitter/X', icon: '𝕏', color: 'bg-black text-white', charLimit: 280 },
    facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-600 text-white', charLimit: 500 },
    linkedin: { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700 text-white', charLimit: 700 },
    instagram: {
      name: 'Instagram',
      icon: '📷',
      color: 'bg-gradient-to-r from-purple-400 to-pink-400 text-white',
      charLimit: 300,
    },
    reddit: { name: 'Reddit', icon: '🤖', color: 'bg-orange-500 text-white', charLimit: 300 },
    discord: { name: 'Discord', icon: '🎮', color: 'bg-indigo-600 text-white', charLimit: 2000 },
  };

  // Load sharing data
  useEffect(() => {
    loadSharingData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsTimeRange]);

  const loadSharingData = async () => {
    try {
      setIsLoading(true);

      const [templatesRes, schedulesRes, analyticsRes, suggestionsRes] = await Promise.all([
        fetch('/api/social-sharing/templates', {
          credentials: 'include',
        }),
        fetch('/api/social-sharing/schedules', {
          credentials: 'include',
        }),
        fetch(`/api/social-sharing/analytics?timeRange=${analyticsTimeRange}`, {
          credentials: 'include',
        }),
        fetch('/api/social-sharing/optimization-suggestions', {
          credentials: 'include',
        }),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates);
      }

      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data.schedules);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.analytics);
      }

      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load sharing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async (template: Partial<SharingTemplate>) => {
    try {
      const method = template.id ? 'PUT' : 'POST';
      const url = template.id ? `/api/social-sharing/templates/${template.id}` : '/api/social-sharing/templates';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        loadSharingData();
        setEditingTemplate(null);
        setNewTemplate({});
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/social-sharing/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const _schedulePost = async (contentId: string, platforms: string[], scheduledFor: string, templateId: string) => {
    try {
      const response = await fetch('/api/social-sharing/schedule', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentId, platforms, scheduledFor, templateId }),
      });

      if (response.ok) {
        loadSharingData();
      }
    } catch (error) {
      console.error('Failed to schedule post:', error);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-success bg-success/10';
    if (score >= 60) return 'text-warning bg-warning/10';
    return 'text-destructive bg-destructive/10';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-destructive bg-destructive/10';
      case 'medium':
        return 'text-warning bg-warning/10';
      case 'low':
        return 'text-success bg-success/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Sharing Templates</h3>
        <button
          onClick={() => {
            setNewTemplate({ platforms: [], variables: [] });
            setEditingTemplate('new');
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Create Template
        </button>
      </div>

      {/* Template Editor */}
      {editingTemplate && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-foreground">
              {editingTemplate === 'new' ? 'Create New Template' : 'Edit Template'}
            </h4>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setNewTemplate({});
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Template Name</label>
              <input
                type="text"
                value={newTemplate.name || ''}
                onChange={e => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="e.g., Movie Recommendation Template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              <input
                type="text"
                value={newTemplate.description || ''}
                onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Platforms</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(platformConfigs).map(([key, config]) => (
                  <label key={key} className="flex items-center space-x-2 p-2 border border-border rounded-md hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={newTemplate.platforms?.includes(key) || false}
                      onChange={e => {
                        const platforms = newTemplate.platforms || [];
                        if (e.target.checked) {
                          setNewTemplate(prev => ({ ...prev, platforms: [...platforms, key] }));
                        } else {
                          setNewTemplate(prev => ({ ...prev, platforms: platforms.filter(p => p !== key) }));
                        }
                      }}
                      className="text-primary"
                    />
                    <span className="text-sm">{config.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Template Content</label>
              <textarea
                value={newTemplate.template || ''}
                onChange={e => setNewTemplate(prev => ({ ...prev, template: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="Just watched {{title}} and it was {{rating}}/10! {{description}} #{{genre}} #GeoLeap"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use variables like {'{title}'}, {'{rating}'}, {'{description}'}, {'{genre}'} to personalize content
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setNewTemplate({});
                }}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => saveTemplate(newTemplate)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="grid gap-4">
        {templates.map(template => (
          <div key={template.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-foreground">{template.name}</h4>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded ${getPerformanceColor(template.performanceScore)}`}>
                  {template.performanceScore}% effective
                </span>

                <button
                  onClick={() => {
                    setNewTemplate(template);
                    setEditingTemplate(template.id);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit size={16} />
                </button>

                <button onClick={() => deleteTemplate(template.id)} className="text-muted-foreground hover:text-destructive">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {template.platforms.map(platform => {
                  const config = platformConfigs[platform as keyof typeof platformConfigs];
                  return (
                    <span key={platform} className={`px-2 py-1 text-xs rounded ${config?.color || 'bg-muted'}`}>
                      {config?.name || platform}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="bg-muted rounded-md p-3 mb-3">
              <p className="text-sm text-foreground font-mono">{template.template}</p>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Used {template.usageCount} times</span>
              <span>Last used: {new Date(template.lastUsed).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderScheduleTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Scheduled Posts</h3>
        <div className="flex items-center space-x-2">
          <select value="all" className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground">
            <option value="all">All Platforms</option>
            {Object.entries(platformConfigs).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {schedules.map(schedule => (
          <div key={schedule.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-foreground">{schedule.contentTitle}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{new Date(schedule.scheduledFor).toLocaleString()}</span>
                </div>
              </div>

              <span
                className={`px-2 py-1 text-xs rounded ${
                  schedule.status === 'posted'
                    ? 'bg-success/10 text-success'
                    : schedule.status === 'failed'
                      ? 'bg-destructive/10 text-destructive'
                      : schedule.status === 'cancelled'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-warning/10 text-warning'
                }`}
              >
                {schedule.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {schedule.platforms.map(platform => {
                const config = platformConfigs[platform as keyof typeof platformConfigs];
                return (
                  <span key={platform} className={`px-2 py-1 text-xs rounded ${config?.color || 'bg-muted'}`}>
                    {config?.name || platform}
                  </span>
                );
              })}
            </div>

            {schedule.engagement && (
              <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{schedule.engagement.likes}</div>
                  <div className="text-xs text-muted-foreground">Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{schedule.engagement.shares}</div>
                  <div className="text-xs text-muted-foreground">Shares</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{schedule.engagement.comments}</div>
                  <div className="text-xs text-muted-foreground">Comments</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{schedule.engagement.reach}</div>
                  <div className="text-xs text-muted-foreground">Reach</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => {
    if (!analytics) return <div>Loading analytics...</div>;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Sharing Analytics</h3>
          <select
            value={analyticsTimeRange}
            onChange={e => setAnalyticsTimeRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Share2 size={20} className="text-primary" />
              <div>
                <div className="text-2xl font-bold text-foreground">{analytics.totalShares}</div>
                <div className="text-sm text-muted-foreground">Total Shares</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Heart size={20} className="text-destructive" />
              <div>
                <div className="text-2xl font-bold text-foreground">{analytics.totalEngagement}</div>
                <div className="text-sm text-muted-foreground">Total Engagement</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Eye size={20} className="text-success" />
              <div>
                <div className="text-2xl font-bold text-foreground">{analytics.averageReach.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Avg Reach</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp size={20} className="text-accent" />
              <div>
                <div className="text-2xl font-bold text-foreground">{analytics.engagementRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Engagement Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Performance */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-medium text-foreground mb-4">Platform Performance</h4>
          <div className="space-y-4">
            {Object.entries(analytics.platformBreakdown).map(([platform, data]) => {
              const config = platformConfigs[platform as keyof typeof platformConfigs];
              return (
                <div key={platform} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${config?.color || 'bg-muted'}`}
                    >
                      {config?.icon || platform[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{config?.name || platform}</span>
                  </div>

                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-foreground">{data.shares}</div>
                      <div className="text-muted-foreground">Shares</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-foreground">{data.engagement}</div>
                      <div className="text-muted-foreground">Engagement</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-foreground">{data.reach}</div>
                      <div className="text-muted-foreground">Reach</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderOptimizationTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-foreground">Optimization Suggestions</h3>

      <div className="grid gap-4">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-foreground">{suggestion.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded ${getImpactColor(suggestion.impact)}`}>
                  {suggestion.impact} impact
                </span>
                <span className={`px-2 py-1 text-xs rounded ${getImpactColor(suggestion.effort)}`}>
                  {suggestion.effort} effort
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestion.platforms.map(platform => {
                const config = platformConfigs[platform as keyof typeof platformConfigs];
                return (
                  <span key={platform} className={`px-2 py-1 text-xs rounded ${config?.color || 'bg-muted'}`}>
                    {config?.name || platform}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Social Sharing Optimization</h1>
        <p className="text-muted-foreground">Optimize your content sharing strategy across social platforms</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted rounded-lg p-1">
        {(
          [
            { id: 'templates', label: 'Templates', icon: Edit },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'optimization', label: 'Optimization', icon: Target },
          ] as const
        ).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === tab.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw size={32} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading sharing optimization data...</p>
        </div>
      ) : (
        <>
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'schedule' && renderScheduleTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'optimization' && renderOptimizationTab()}
        </>
      )}
    </div>
  );
}

export default SocialSharingOptimization;
