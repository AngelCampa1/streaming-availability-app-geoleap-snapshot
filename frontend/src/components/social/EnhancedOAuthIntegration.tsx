'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Key,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Lock,
  Eye,
  Copy,
  Download,
  Trash2,
  Settings,
  Info,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';

interface OAuthToken {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scopes: string[];
  isActive: boolean;
  lastUsed: string;
  createdAt: string;
  tokenType: 'Bearer' | 'Basic';
}

interface SecurityAuditLog {
  id: string;
  action: 'token_created' | 'token_refreshed' | 'token_revoked' | 'token_used' | 'scope_changed';
  provider: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: string;
}

interface OAuthScope {
  name: string;
  description: string;
  required: boolean;
  granted: boolean;
  sensitive: boolean;
}

interface EnhancedOAuthIntegrationProps {
  className?: string;
}

export function EnhancedOAuthIntegration({ className = '' }: EnhancedOAuthIntegrationProps) {
  const { connections: _connections, connectProvider: _connectProvider, disconnectProvider } = useSocialAuth();
  const [tokens, setTokens] = useState<OAuthToken[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [_selectedProvider, _setSelectedProvider] = useState<string | null>(null);
  const [showTokenDetails, setShowTokenDetails] = useState<Record<string, boolean>>({});
  const [availableScopes, setAvailableScopes] = useState<Record<string, OAuthScope[]>>({});
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Provider configurations with enhanced security features
  const providerConfigs = {
    google: {
      name: 'Google',
      icon: '🌐',
      color: 'bg-card border border-border text-foreground',
      defaultScopes: ['profile', 'email'],
      additionalScopes: ['youtube.readonly', 'drive.readonly'],
      tokenExpiry: 3600, // 1 hour
    },
    facebook: {
      name: 'Facebook',
      icon: '📘',
      color: 'bg-[#1877F2] text-primary-foreground',
      defaultScopes: ['public_profile', 'email'],
      additionalScopes: ['user_friends', 'user_likes'],
      tokenExpiry: 7200, // 2 hours
    },
    twitter: {
      name: 'Twitter/X',
      icon: '𝕏',
      color: 'bg-foreground text-background',
      defaultScopes: ['read', 'write'],
      additionalScopes: ['follows.read', 'tweet.read'],
      tokenExpiry: 7200, // 2 hours
    },
    github: {
      name: 'GitHub',
      icon: '🐱',
      color: 'bg-foreground text-background',
      defaultScopes: ['user:email'],
      additionalScopes: ['repo', 'notifications'],
      tokenExpiry: 28800, // 8 hours
    },
    linkedin: {
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-[#0A66C2] text-primary-foreground',
      defaultScopes: ['r_liteprofile', 'r_emailaddress'],
      additionalScopes: ['r_fullprofile', 'w_member_social'],
      tokenExpiry: 5184000, // 60 days
    },
    discord: {
      name: 'Discord',
      icon: '🎮',
      color: 'bg-[#5865F2] text-primary-foreground',
      defaultScopes: ['identify', 'email'],
      additionalScopes: ['guilds', 'guilds.members.read'],
      tokenExpiry: 604800, // 7 days
    },
  };

  // Load OAuth data
  useEffect(() => {
    loadOAuthData();
    startTokenExpiryCheck();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadOAuthData = async () => {
    try {
      setIsLoading(true);

      const [tokensResponse, auditResponse, scopesResponse] = await Promise.all([
        fetch('/api/oauth/tokens', {
          credentials: 'include',
        }),
        fetch('/api/oauth/audit-logs', {
          credentials: 'include',
        }),
        fetch('/api/oauth/available-scopes', {
          credentials: 'include',
        }),
      ]);

      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        setTokens(tokensData.tokens);
      }

      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setAuditLogs(auditData.logs);
      }

      if (scopesResponse.ok) {
        const scopesData = await scopesResponse.json();
        setAvailableScopes(scopesData.scopes);
      }
    } catch (error) {
      console.error('Failed to load OAuth data:', error);
      setError('Failed to load OAuth information');
    } finally {
      setIsLoading(false);
    }
  };

  const startTokenExpiryCheck = () => {
    intervalRef.current = setInterval(() => {
      const now = new Date();
      setTokens(prevTokens =>
        prevTokens.map(token => ({
          ...token,
          isActive: new Date(token.expiresAt) > now,
        }))
      );
    }, 60000); // Check every minute
  };

  const refreshToken = async (provider: string) => {
    try {
      setIsRefreshing(prev => ({ ...prev, [provider]: true }));
      setError(null);

      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      const response = await fetch(`/api/oauth/refresh/${provider}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setTokens(prev => prev.map(token => (token.provider === provider ? { ...token, ...result.token } : token)));
        setSuccessMessage(
          `${providerConfigs[provider as keyof typeof providerConfigs]?.name} token refreshed successfully`
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      setError(`Failed to refresh ${provider} token`);
    } finally {
      setIsRefreshing(prev => ({ ...prev, [provider]: false }));
    }
  };

  const revokeToken = async (provider: string) => {
    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      const response = await fetch(`/api/oauth/revoke/${provider}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setTokens(prev => prev.filter(token => token.provider !== provider));
        await disconnectProvider(provider);
        setSuccessMessage(`${providerConfigs[provider as keyof typeof providerConfigs]?.name} access revoked`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to revoke token:', error);
      setError(`Failed to revoke ${provider} access`);
    }
  };

  const _updateScopes = async (provider: string, scopes: string[]) => {
    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      const response = await fetch(`/api/oauth/scopes/${provider}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scopes }),
      });

      if (response.ok) {
        loadOAuthData(); // Reload to get updated scope information
        setSuccessMessage('Scope permissions updated');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to update scopes:', error);
      setError('Failed to update permissions');
    }
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setSuccessMessage('Token copied to clipboard');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (error) {
      console.error('Failed to copy token:', error);
    }
  };

  const exportTokens = () => {
    const exportData = {
      tokens: tokens.map(token => ({
        provider: token.provider,
        scopes: token.scopes,
        expiresAt: token.expiresAt,
        isActive: token.isActive,
        createdAt: token.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oauth-tokens-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTokenStatus = (token: OAuthToken) => {
    const now = new Date();
    const expiryTime = new Date(token.expiresAt);
    const hoursUntilExpiry = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry <= 0) {
      return { status: 'expired', color: 'text-destructive bg-destructive/10', text: 'Expired' };
    } else if (hoursUntilExpiry <= 1) {
      return { status: 'expiring', color: 'text-warning bg-warning/10', text: 'Expiring Soon' };
    } else if (hoursUntilExpiry <= 24) {
      return { status: 'warning', color: 'text-warning bg-warning/10', text: 'Expires Today' };
    } else {
      return { status: 'active', color: 'text-success bg-success/10', text: 'Active' };
    }
  };

  const renderTokenCard = (token: OAuthToken) => {
    const provider = token.provider as keyof typeof providerConfigs;
    const config = providerConfigs[provider];
    const status = getTokenStatus(token);
    const isExpanded = showTokenDetails[token.id];

    return (
      <div key={token.id} className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${config?.color || 'bg-muted'}`}
            >
              <span className="text-lg">{config?.icon || '🔗'}</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">{config?.name || token.provider}</h3>
              <p className="text-sm text-muted-foreground">Last used: {new Date(token.lastUsed).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>{status.text}</span>

            <button
              onClick={() => setShowTokenDetails(prev => ({ ...prev, [token.id]: !prev[token.id] }))}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Token Summary */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-border">
          <div className="text-center">
            <div className="text-sm font-medium text-foreground">{token.scopes.length}</div>
            <div className="text-xs text-muted-foreground">Scopes</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-foreground">{token.tokenType}</div>
            <div className="text-xs text-muted-foreground">Type</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-foreground">
              {Math.ceil((new Date(token.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60))}h
            </div>
            <div className="text-xs text-muted-foreground">Expires in</div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* Token Preview */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Access Token</label>
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  value={token.accessToken}
                  readOnly
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-muted text-sm font-mono text-foreground"
                />
                <button
                  onClick={() => copyToken(token.accessToken)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                  title="Copy token"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* Scopes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Granted Permissions</label>
              <div className="flex flex-wrap gap-2">
                {token.scopes.map(scope => {
                  const scopeInfo = availableScopes[provider]?.find(s => s.name === scope);
                  return (
                    <span
                      key={scope}
                      className={`px-2 py-1 text-xs rounded ${
                        scopeInfo?.sensitive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                      }`}
                      title={scopeInfo?.description}
                    >
                      {scope}
                      {scopeInfo?.sensitive && <Lock size={10} className="inline ml-1" />}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => refreshToken(token.provider)}
                disabled={isRefreshing[token.provider]}
                className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
              >
                {isRefreshing[token.provider] ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <span>Refresh</span>
              </button>

              <button
                onClick={() => revokeToken(token.provider)}
                className="flex items-center space-x-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm"
              >
                <Trash2 size={14} />
                <span>Revoke</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAuditLog = (log: SecurityAuditLog) => {
    const getActionIcon = (action: string) => {
      switch (action) {
        case 'token_created':
          return <Key size={16} className="text-success" />;
        case 'token_refreshed':
          return <RefreshCw size={16} className="text-primary" />;
        case 'token_revoked':
          return <X size={16} className="text-destructive" />;
        case 'token_used':
          return <Eye size={16} className="text-muted-foreground" />;
        case 'scope_changed':
          return <Settings size={16} className="text-warning" />;
        default:
          return <Info size={16} className="text-muted-foreground" />;
      }
    };

    const getActionText = (action: string) => {
      const actions: Record<string, string> = {
        token_created: 'Token Created',
        token_refreshed: 'Token Refreshed',
        token_revoked: 'Token Revoked',
        token_used: 'Token Used',
        scope_changed: 'Scopes Modified',
      };
      return actions[action] || action;
    };

    return (
      <div key={log.id} className="flex items-center space-x-3 p-3 border-b border-border last:border-b-0">
        <div className="flex-shrink-0">{getActionIcon(log.action)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-foreground">{getActionText(log.action)}</p>
            <span className="text-sm text-muted-foreground">•</span>
            <p className="text-sm text-muted-foreground capitalize">{log.provider}</p>
            {!log.success && (
              <>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-destructive">Failed</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
            <span className="text-xs text-muted-foreground">•</span>
            <p className="text-xs text-muted-foreground truncate">{log.ipAddress}</p>
          </div>

          {log.details && <p className="text-xs text-muted-foreground mt-1">{log.details}</p>}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw size={32} className="animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading OAuth information...</p>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OAuth Integration</h1>
          <p className="text-muted-foreground">Manage your social media connections and access tokens</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportTokens}
            className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-muted"
          >
            <Download size={16} />
            <span>Export</span>
          </button>

          <button
            onClick={loadOAuthData}
            className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} className="text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Check size={20} className="text-success" />
            <p className="text-success">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Tokens Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {tokens.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-muted rounded-lg">
            <Key size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No OAuth Tokens</h3>
            <p className="text-muted-foreground">Connect to social platforms to manage tokens here.</p>
          </div>
        ) : (
          tokens.map(renderTokenCard)
        )}
      </div>

      {/* Security Audit Log */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">Security Audit Log</h3>
          <p className="text-sm text-muted-foreground">Recent OAuth token activities and security events</p>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No security events recorded</p>
            </div>
          ) : (
            auditLogs.slice(0, 10).map(renderAuditLog)
          )}
        </div>
      </div>
    </div>
  );
}

export default EnhancedOAuthIntegration;
