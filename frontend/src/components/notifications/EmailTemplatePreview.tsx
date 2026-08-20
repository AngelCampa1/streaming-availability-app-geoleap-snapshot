'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Eye,
  Code,
  Smartphone,
  Monitor,
  Tablet,
  Send,
  RefreshCw,
  Settings,
  Type,
  Star,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// Email template color constants that map to design system
// Uses Stream Violet palette - see docs/UNIFIED_COLOR_SYSTEM.md
const EMAIL_COLORS = {
  background: '#f1f5f9',  // matches --muted (Slate 100)
  primary: '#7c3aed',     // matches --primary (Stream Violet)
  accent: '#f59e0b',      // matches --accent (Golden Popcorn)
  success: '#10b981',     // matches --success (Stream Green)
  error: '#ef4444',       // matches --error (Alert Red)
  warning: '#fbbf24',     // matches --warning (Caution Amber)
  text: '#0f172a',        // matches --foreground (Slate 900)
  textMuted: '#64748b',   // matches --muted-foreground (Slate 500)
  border: '#e2e8f0',      // matches --border (Slate 200)
  white: '#ffffff',
} as const;

export interface EmailTemplate {
  [key: string]: unknown;
  id: string;
  name: string;
  type: 'watchlist' | 'security' | 'billing' | 'system' | 'welcome' | 'digest';
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, string>;
  responsive: boolean;
  lightOnly: boolean;
  lastModified: Date;
}

export interface EmailPreviewData {
  template: EmailTemplate;
  sampleData: Record<string, any>;
  recipientEmail: string;
  previewMode: 'desktop' | 'mobile' | 'tablet';
  viewMode: 'visual' | 'html' | 'text';
}

interface EmailTemplatePreviewProps {
  className?: string;
  templates?: EmailTemplate[];
  onSendTest?: (templateId: string, recipientEmail: string) => void;
  onSaveTemplate?: (template: EmailTemplate) => void;
  enableEditing?: boolean;
}

// Sample email templates
const sampleTemplates: EmailTemplate[] = [
  {
    id: 'watchlist-available',
    name: 'Content Available',
    type: 'watchlist',
    subject: '🎬 {{contentTitle}} is now available!',
    preheader: 'Your watchlisted content is ready to stream',
    htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{contentTitle}} Available</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: ${EMAIL_COLORS.background}; }
          .container { max-width: 600px; margin: 0 auto; background: ${EMAIL_COLORS.white}; }
          .header { background: linear-gradient(135deg, ${EMAIL_COLORS.primary} 0%, ${EMAIL_COLORS.accent} 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: ${EMAIL_COLORS.white}; margin: 0; font-size: 28px; }
          .content { padding: 40px 20px; }
          .content-card { border: 1px solid ${EMAIL_COLORS.border}; border-radius: 12px; overflow: hidden; margin-bottom: 30px; }
          .content-image { width: 100%; height: 200px; object-fit: cover; }
          .content-info { padding: 20px; }
          .content-title { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: ${EMAIL_COLORS.text}; }
          .content-meta { color: ${EMAIL_COLORS.textMuted}; font-size: 14px; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: ${EMAIL_COLORS.primary}; color: ${EMAIL_COLORS.white}; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 10px 10px 0 0; }
          .footer { background: ${EMAIL_COLORS.background}; padding: 20px; text-align: center; color: ${EMAIL_COLORS.textMuted}; font-size: 12px; }
          @media (max-width: 600px) {
            .content { padding: 20px 15px; }
            .header h1 { font-size: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 Great news, {{userName}}!</h1>
          </div>
          <div class="content">
            <div class="content-card">
              <img src="{{contentImage}}" alt="{{contentTitle}}" class="content-image">
              <div class="content-info">
                <h2 class="content-title">{{contentTitle}}</h2>
                <div class="content-meta">
                  Now available on {{platform}} • {{genre}} • {{rating}}
                </div>
                <p>{{contentDescription}}</p>
                <a href="{{watchUrl}}" class="cta-button">Watch Now</a>
                <a href="{{detailsUrl}}" class="cta-button" style="background: ${EMAIL_COLORS.success};">View Details</a>
              </div>
            </div>
            <p>You added this to your watchlist on {{addedDate}}. Happy watching!</p>
          </div>
          <div class="footer">
            <p>GeoLeap - Your Global Streaming Guide</p>
            <p><a href="{{unsubscribeUrl}}" style="color: ${EMAIL_COLORS.textMuted};">Unsubscribe</a> | <a href="{{preferencesUrl}}" style="color: ${EMAIL_COLORS.textMuted};">Manage Preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    textContent: `Great news, {{userName}}!

{{contentTitle}} is now available on {{platform}}.

{{contentDescription}}

Watch now: {{watchUrl}}
View details: {{detailsUrl}}

You added this to your watchlist on {{addedDate}}.

---
GeoLeap - Your Global Streaming Guide
Unsubscribe: {{unsubscribeUrl}}
Manage Preferences: {{preferencesUrl}}`,
    variables: {
      userName: 'User Name',
      contentTitle: 'Content Title',
      contentImage: 'Content Image URL',
      platform: 'Platform Name',
      genre: 'Genre',
      rating: 'Rating',
      contentDescription: 'Content Description',
      watchUrl: 'Watch URL',
      detailsUrl: 'Details URL',
      addedDate: 'Date Added',
      unsubscribeUrl: 'Unsubscribe URL',
      preferencesUrl: 'Preferences URL',
    },
    responsive: true,
    lightOnly: true,
    lastModified: new Date(),
  },
  {
    id: 'security-alert',
    name: 'Security Alert',
    type: 'security',
    subject: '🔒 Security Alert - New Login Detected',
    preheader: 'We detected a new login to your account',
    htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: ${EMAIL_COLORS.background}; }
          .container { max-width: 600px; margin: 0 auto; background: ${EMAIL_COLORS.white}; }
          .header { background: linear-gradient(135deg, ${EMAIL_COLORS.error} 0%, #dc2626 100%); padding: 30px 20px; text-align: center; }
          .header h1 { color: ${EMAIL_COLORS.white}; margin: 0; font-size: 24px; }
          .alert-icon { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 30px 20px; }
          .alert-box { background: #fffbeb; border: 1px solid ${EMAIL_COLORS.warning}; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .security-details { background: ${EMAIL_COLORS.background}; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .detail-label { font-weight: bold; color: ${EMAIL_COLORS.text}; }
          .detail-value { color: ${EMAIL_COLORS.textMuted}; }
          .cta-button { display: inline-block; background: ${EMAIL_COLORS.error}; color: ${EMAIL_COLORS.white}; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 10px 10px 0 0; }
          .secondary-button { background: #64748b; }
          .footer { background: ${EMAIL_COLORS.background}; padding: 20px; text-align: center; color: ${EMAIL_COLORS.textMuted}; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="alert-icon">🔒</div>
            <h1>Security Alert</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <strong>We detected a new login to your account</strong>
              <p>If this was you, you can safely ignore this email. If not, please secure your account immediately.</p>
            </div>

            <h3>Login Details:</h3>
            <div class="security-details">
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">{{loginTime}}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">{{location}}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Device:</span>
                <span class="detail-value">{{device}}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">IP Address:</span>
                <span class="detail-value">{{ipAddress}}</span>
              </div>
            </div>

            <p><strong>What should you do?</strong></p>
            <ul>
              <li>If this was you, no action is needed</li>
              <li>If this wasn't you, please change your password immediately</li>
              <li>Review your recent account activity</li>
              <li>Enable two-factor authentication for better security</li>
            </ul>

            <a href="{{securityUrl}}" class="cta-button">Secure My Account</a>
            <a href="{{activityUrl}}" class="cta-button secondary-button">View Activity</a>
          </div>
          <div class="footer">
            <p>GeoLeap Security Team</p>
            <p>This is an automated security alert. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textContent: `SECURITY ALERT

We detected a new login to your GeoLeap account.

Login Details:
Time: {{loginTime}}
Location: {{location}}
Device: {{device}}
IP Address: {{ipAddress}}

If this was you, you can safely ignore this email.
If this wasn't you, please secure your account immediately.

Secure your account: {{securityUrl}}
View account activity: {{activityUrl}}

---
GeoLeap Security Team
This is an automated security alert.`,
    variables: {
      loginTime: 'Login Timestamp',
      location: 'Login Location',
      device: 'Device Information',
      ipAddress: 'IP Address',
      securityUrl: 'Security Settings URL',
      activityUrl: 'Account Activity URL',
    },
    responsive: true,
    lightOnly: true,
    lastModified: new Date(),
  },
];

const sampleData = {
  'watchlist-available': {
    userName: 'John Doe',
    contentTitle: 'Breaking Bad',
    contentImage: 'https://via.placeholder.com/600x300/333/fff?text=Breaking+Bad',
    platform: 'Netflix',
    genre: 'Drama, Crime',
    rating: 'TV-MA',
    contentDescription:
      "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
    watchUrl: 'https://geoleap.app/watch/breaking-bad',
    detailsUrl: 'https://geoleap.app/content/breaking-bad',
    addedDate: 'January 15, 2024',
    unsubscribeUrl: 'https://geoleap.app/unsubscribe',
    preferencesUrl: 'https://geoleap.app/preferences',
  },
  'security-alert': {
    loginTime: 'January 20, 2024 at 2:45 PM EST',
    location: 'New York, NY, United States',
    device: 'Chrome on Windows 11',
    ipAddress: '192.168.1.1',
    securityUrl: 'https://geoleap.app/account/security',
    activityUrl: 'https://geoleap.app/account/activity',
  },
};

export function EmailTemplatePreview({
  className = '',
  templates = sampleTemplates,
  onSendTest,
  onSaveTemplate: _onSaveTemplate,
  enableEditing: _enableEditing = false,
}: EmailTemplatePreviewProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [viewMode, setViewMode] = useState<'visual' | 'html' | 'text'>('visual');
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const templateData = selectedTemplate ? sampleData[selectedTemplate.id as keyof typeof sampleData] || {} : {};

  const renderedContent = useMemo(() => {
    if (!selectedTemplate) return { html: '', text: '', subject: '' };

    let html = selectedTemplate.htmlContent;
    let text = selectedTemplate.textContent;
    let subject = selectedTemplate.subject;

    // Replace variables with sample data
    Object.entries({ ...selectedTemplate.variables, ...templateData }).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), String(value));
      text = text.replace(new RegExp(placeholder, 'g'), String(value));
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return { html, text, subject };
  }, [selectedTemplate, templateData]);

  const getViewportStyles = () => {
    switch (previewMode) {
      case 'mobile':
        return { width: '375px', height: '600px' };
      case 'tablet':
        return { width: '768px', height: '600px' };
      default:
        return { width: '100%', height: '600px' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'watchlist':
        return <Star className="w-4 h-4" />;
      case 'security':
        return <AlertTriangle className="w-4 h-4" />;
      case 'billing':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;

    setIsSending(true);
    try {
      await onSendTest?.(selectedTemplate.id, testEmail);
      // Show success message
    } catch (_error) {
      // Show error message
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Template Preview</h2>
          <p className="text-muted-foreground">Preview and test your notification email templates</p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(template.type)}
                      <span>{template.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={previewMode} onValueChange={(value: any) => setPreviewMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-4 h-4" />
                    <span>Desktop</span>
                  </div>
                </SelectItem>
                <SelectItem value="tablet">
                  <div className="flex items-center space-x-2">
                    <Tablet className="w-4 h-4" />
                    <span>Tablet</span>
                  </div>
                </SelectItem>
                <SelectItem value="mobile">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <Button onClick={handleSendTest} disabled={!testEmail || isSending} className="flex items-center space-x-2">
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Test</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Info */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getTypeIcon(selectedTemplate.type)}
                <div>
                  <CardTitle>{selectedTemplate.name}</CardTitle>
                  <CardDescription>Subject: {renderedContent.subject}</CardDescription>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={selectedTemplate.responsive ? 'default' : 'secondary'}>
                  {selectedTemplate.responsive ? 'Responsive' : 'Fixed Width'}
                </Badge>
                <Badge variant={selectedTemplate.lightOnly ? 'default' : 'secondary'}>
                  {'Light Only'}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedTemplate.type}
                </Badge>
              </div>
            </div>

            {selectedTemplate.preheader && (
              <div className="text-sm text-muted-foreground">Preheader: {selectedTemplate.preheader}</div>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Preview */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <TabsList>
          <TabsTrigger value="visual" className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Visual</span>
          </TabsTrigger>
          <TabsTrigger value="html" className="flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>HTML</span>
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center space-x-2">
            <Type className="w-4 h-4" />
            <span>Text</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual">
          <Card>
            <CardContent className="p-0">
              <div className="flex justify-center bg-muted p-4">
                <div className="bg-background shadow-lg border rounded-lg overflow-hidden" style={getViewportStyles()}>
                  <ScrollArea className="h-full">
                    <iframe
                      srcDoc={renderedContent.html}
                      className="w-full h-full border-none"
                      style={{ minHeight: '600px' }}
                      title="Email Preview"
                    />
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="html">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <pre className="p-4 text-sm font-mono bg-muted overflow-x-auto">
                  <code>{renderedContent.html}</code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="h-96">
                <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                  {renderedContent.text}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Variables */}
      {selectedTemplate && Object.keys(selectedTemplate.variables).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Template Variables</span>
            </CardTitle>
            <CardDescription>Variables that can be dynamically replaced in this template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(selectedTemplate.variables).map(([key, description]) => (
                <div key={key} className="border rounded-lg p-3">
                  <div className="font-mono text-sm text-primary">{`{{${key}}}`}</div>
                  <div className="text-xs text-muted-foreground mt-1">{description}</div>
                  <div className="text-sm text-foreground mt-1">
                    {(templateData as Record<string, any>)[key] || 'Sample Value'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">2.1k</div>
                <div className="text-sm text-muted-foreground">Sent This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-success" />
              <div>
                <div className="text-2xl font-bold">78.2%</div>
                <div className="text-sm text-muted-foreground">Open Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">12.4%</div>
                <div className="text-sm text-muted-foreground">Click Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
