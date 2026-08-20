'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Monitor, Download, AlertTriangle, Settings } from 'lucide-react';
import { apiCall } from '@/lib/api';

interface SessionData {
  id: string;
  deviceName?: string;
  operatingSystem?: string;
  browser?: string;
  location?: string;
  ipAddress?: string;
  createdAt: string;
  lastAccessedAt: string;
  isCurrentSession: boolean;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  ipAddress?: string;
  location?: string;
  riskScore: number;
  createdAt: string;
  details?: string;
}

interface SecurityPreferences {
  emailSecurityAlerts: boolean;
  emailLoginNotifications: boolean;
  twoFactorEnabled: boolean;
  securityQuestionEnabled: boolean;
}

export default function SecurityDashboard() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [securityHistory, setSecurityHistory] = useState<SecurityEvent[]>([]);
  const [preferences, setPreferences] = useState<SecurityPreferences>({
    emailSecurityAlerts: true,
    emailLoginNotifications: false,
    twoFactorEnabled: false,
    securityQuestionEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'history' | 'preferences' | 'export'>(
    'sessions'
  );

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      const [sessionsRes, historyRes, preferencesRes] = await Promise.all([
        apiCall<SessionData[]>('/api/security/sessions', { method: 'GET' }),
        apiCall<SecurityEvent[]>('/api/security/history', { method: 'GET' }),
        apiCall<SecurityPreferences>('/api/security/preferences', { method: 'GET' }),
      ]);

      setSessions(sessionsRes);
      setSecurityHistory(historyRes);
      setPreferences(preferencesRes);
    } catch (error) {
      // Log error for debugging - consider using proper logging service in production
       
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await apiCall(`/api/security/sessions/${sessionId}`, { method: 'DELETE' });
      await loadSecurityData();
    } catch (error) {
      // Log error for debugging - consider using proper logging service in production
       
      console.error('Failed to revoke session:', error);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('This will log you out from all other devices. Continue?')) {
      return;
    }

    try {
      await apiCall('/api/security/sessions', { method: 'DELETE' });
      await loadSecurityData();
    } catch (error) {
      // Log error for debugging - consider using proper logging service in production
       
      console.error('Failed to revoke all sessions:', error);
    }
  };

  const updatePreferences = async (newPreferences: SecurityPreferences) => {
    try {
      const response = await apiCall<SecurityPreferences>('/api/security/preferences', {
        method: 'PUT',
        body: JSON.stringify(newPreferences),
      });
      setPreferences(response);
    } catch (error) {
      // Log error for debugging - consider using proper logging service in production
       
      console.error('Failed to update preferences:', error);
    }
  };

  const requestDataExport = async () => {
    try {
      await apiCall('/api/security/export', { method: 'POST' });
      alert('Data export request submitted. You will receive an email with your data within 24 hours.');
    } catch (error) {
      // Log error for debugging - consider using proper logging service in production
       
      console.error('Failed to request data export:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-error';
    if (score >= 40) return 'text-warning';
    return 'text-success';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Shield className="mr-3 h-8 w-8" />
            Account Security
          </h1>
          <p className="mt-2 text-muted-foreground">Manage your account security settings and monitor login activity</p>
        </div>

        <div className="bg-card shadow rounded-lg">
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'sessions', label: 'Active Sessions', icon: Monitor },
                { id: 'history', label: 'Security History', icon: AlertTriangle },
                { id: 'preferences', label: 'Preferences', icon: Settings },
                { id: 'export', label: 'Data Export', icon: Download },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as 'overview' | 'sessions' | 'history' | 'preferences' | 'export')}
                  className={`${
                    activeTab === id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'sessions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-foreground">Active Sessions</h2>
                  <button
                    onClick={revokeAllSessions}
                    className="bg-error text-error-foreground px-4 py-2 rounded-full text-sm hover:bg-error/90"
                  >
                    Revoke All Sessions
                  </button>
                </div>

                <div className="space-y-4">
                  {sessions.map(session => (
                    <div key={session.id} className="border border-border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-foreground">{session.deviceName || 'Unknown Device'}</h3>
                          {session.isCurrentSession && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                              Current Session
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.operatingSystem} • {session.browser}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.location} • Last active: {formatDate(session.lastAccessedAt)}
                        </p>
                      </div>

                      {!session.isCurrentSession && (
                        <button
                          onClick={() => revokeSession(session.id)}
                          className="text-error hover:text-error/80 text-sm font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h2 className="text-lg font-medium text-foreground mb-6">Security History</h2>

                <div className="space-y-3">
                  {securityHistory.map(event => (
                    <div key={event.id} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {event.eventType
                              .replace('_', ' ')
                              .toLowerCase()
                              .replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {event.location || 'Unknown location'} • IP: {event.ipAddress}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
                        </div>

                        <span className={`text-sm font-medium ${getRiskScoreColor(event.riskScore)}`}>
                          Risk: {event.riskScore}/100
                        </span>
                      </div>

                      {event.details && <p className="mt-2 text-sm text-muted-foreground">{event.details}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-lg font-medium text-foreground mb-6">Security Preferences</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">Security Alert Emails</h3>
                      <p className="text-sm text-muted-foreground">Receive emails for high-risk security events</p>
                    </div>
                    <button
                      onClick={() =>
                        updatePreferences({ ...preferences, emailSecurityAlerts: !preferences.emailSecurityAlerts })
                      }
                      className={`${
                        preferences.emailSecurityAlerts ? 'bg-primary' : 'bg-muted'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          preferences.emailSecurityAlerts ? 'translate-x-5' : 'translate-x-0'
                        } inline-block h-5 w-5 transform rounded-full bg-card shadow transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">Login Notifications</h3>
                      <p className="text-sm text-muted-foreground">Get notified of all login attempts</p>
                    </div>
                    <button
                      onClick={() =>
                        updatePreferences({
                          ...preferences,
                          emailLoginNotifications: !preferences.emailLoginNotifications,
                        })
                      }
                      className={`${
                        preferences.emailLoginNotifications ? 'bg-primary' : 'bg-muted'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          preferences.emailLoginNotifications ? 'translate-x-5' : 'translate-x-0'
                        } inline-block h-5 w-5 transform rounded-full bg-card shadow transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between opacity-50">
                    <div>
                      <h3 className="font-medium text-foreground">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">Coming soon - additional security layer</p>
                    </div>
                    <div className="bg-muted relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent">
                      <span className="inline-block h-5 w-5 transform rounded-full bg-card shadow" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div>
                <h2 className="text-lg font-medium text-foreground mb-6">Data Export</h2>

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-warning mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-warning-foreground">GDPR Data Export</h3>
                      <p className="mt-1 text-sm text-warning-foreground/90">
                        You can request a complete copy of all your personal data stored in our system. This includes
                        your profile, security events, session history, and more.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={requestDataExport}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-full hover:bg-primary/90 flex items-center"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Request Data Export
                </button>

                <p className="mt-3 text-sm text-muted-foreground">
                  Your data will be compiled and sent to your registered email address within 24 hours.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
