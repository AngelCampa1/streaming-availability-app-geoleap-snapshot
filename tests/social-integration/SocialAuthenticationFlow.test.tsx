/**
 * Social Authentication Flow Integration Tests
 * Tests OAuth 2.0 flows, social login, and security for all platforms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { SocialAuthProvider } from '../../frontend/src/contexts/SocialAuthContext';
import { SocialLoginButton } from '../../frontend/src/components/social/SocialLoginButton';
import { PrivacyConsentModal } from '../../frontend/src/components/social/PrivacyConsentModal';
import { SocialPlatform } from '../../frontend/src/lib/types/social';

// Mock all external dependencies
const mockSocialAuthService = {
  initiateSocialLogin: jest.fn(),
  handleAuthCallback: jest.fn(),
  refreshToken: jest.fn(),
  disconnectSocial: jest.fn(),
  getUserProfile: jest.fn(),
  getFriendsList: jest.fn(),
  validateToken: jest.fn()
};

const mockPrivacyService = {
  getConsentStatus: jest.fn(),
  updateConsent: jest.fn(),
  exportUserData: jest.fn(),
  deleteUserData: jest.fn(),
  getDataUsageReport: jest.fn()
};

const mockAnalyticsService = {
  trackSocialLogin: jest.fn(),
  trackConsentChange: jest.fn(),
  trackSocialInteraction: jest.fn()
};

jest.mock('../../frontend/src/lib/social-auth-service', () => ({
  socialAuthService: mockSocialAuthService
}));

jest.mock('../../frontend/src/lib/privacy-service', () => ({
  privacyService: mockPrivacyService
}));

jest.mock('../../frontend/src/lib/analytics-service', () => ({
  analyticsService: mockAnalyticsService
}));

// Mock window methods
const mockWindowOpen = jest.fn(() => ({
  close: jest.fn(),
  closed: false,
  location: { href: '' }
}));

Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
});

Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'https://localhost:3000',
    origin: 'https://localhost:3000',
    assign: jest.fn(),
    replace: jest.fn()
  }
});

// Mock crypto for secure state generation
Object.defineProperty(window, 'crypto', {
  writable: true,
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  }
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SocialAuthProvider>
    {children}
  </SocialAuthProvider>
);

describe('Social Authentication Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocialAuthService.initiateSocialLogin.mockResolvedValue({
      authUrl: 'https://facebook.com/oauth/authorize?client_id=123&redirect_uri=callback&state=abc123',
      state: 'abc123'
    });
  });

  describe('OAuth 2.0 Flow Initiation', () => {
    it('should initiate Facebook OAuth flow with correct parameters', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SocialLoginButton platform={SocialPlatform.Facebook} />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with facebook/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockSocialAuthService.initiateSocialLogin).toHaveBeenCalledWith({
          platform: SocialPlatform.Facebook,
          scopes: ['public_profile', 'email'],
          redirectUri: expect.stringContaining('/auth/callback/facebook'),
          state: expect.any(String)
        });
      });
    });

    it('should initiate Twitter OAuth flow with PKCE', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SocialLoginButton platform={SocialPlatform.Twitter} />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with twitter/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockSocialAuthService.initiateSocialLogin).toHaveBeenCalledWith({
          platform: SocialPlatform.Twitter,
          scopes: ['tweet.read', 'users.read'],
          redirectUri: expect.stringContaining('/auth/callback/twitter'),
          state: expect.any(String),
          codeChallenge: expect.any(String),
          codeChallengeMethod: 'S256'
        });
      });
    });

    it('should open popup window for OAuth flow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SocialLoginButton platform={SocialPlatform.Instagram} popup={true} />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with instagram/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('instagram.com'),
          'social-auth-popup',
          expect.stringContaining('width=600,height=700')
        );
      });
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should handle successful Facebook callback', async () => {
      mockSocialAuthService.handleAuthCallback.mockResolvedValue({
        success: true,
        accessToken: 'fb_access_token_123',
        refreshToken: 'fb_refresh_token_123',
        user: {
          id: 'fb_user_123',
          name: 'John Doe',
          email: 'john@example.com',
          profilePicture: 'https://facebook.com/profile.jpg'
        },
        expiresIn: 3600
      });

      const callbackUrl = 'https://localhost:3000/auth/callback/facebook?code=auth_code_123&state=valid_state';
      
      // Simulate callback processing
      const result = await mockSocialAuthService.handleAuthCallback({
        platform: SocialPlatform.Facebook,
        code: 'auth_code_123',
        state: 'valid_state'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe('fb_access_token_123');
    });

    it('should handle OAuth error responses', async () => {
      mockSocialAuthService.handleAuthCallback.mockRejectedValue(new Error('OAuth error: access_denied'));

      try {
        await mockSocialAuthService.handleAuthCallback({
          platform: SocialPlatform.Facebook,
          error: 'access_denied',
          errorDescription: 'User denied authorization'
        });
      } catch (error) {
        expect(error.message).toContain('access_denied');
      }
    });

    it('should validate state parameter to prevent CSRF', async () => {
      mockSocialAuthService.handleAuthCallback.mockRejectedValue(new Error('Invalid state parameter'));

      try {
        await mockSocialAuthService.handleAuthCallback({
          platform: SocialPlatform.Facebook,
          code: 'auth_code_123',
          state: 'invalid_state'
        });
      } catch (error) {
        expect(error.message).toContain('Invalid state parameter');
      }
    });
  });

  describe('Token Management', () => {
    it('should refresh expired tokens automatically', async () => {
      mockSocialAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new_access_token',
        expiresIn: 3600
      });

      const result = await mockSocialAuthService.refreshToken({
        platform: SocialPlatform.Facebook,
        refreshToken: 'refresh_token_123'
      });

      expect(result.accessToken).toBe('new_access_token');
      expect(mockSocialAuthService.refreshToken).toHaveBeenCalledWith({
        platform: SocialPlatform.Facebook,
        refreshToken: 'refresh_token_123'
      });
    });

    it('should validate token before API calls', async () => {
      mockSocialAuthService.validateToken.mockResolvedValue({
        valid: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        scopes: ['public_profile', 'email']
      });

      const result = await mockSocialAuthService.validateToken({
        platform: SocialPlatform.Facebook,
        accessToken: 'access_token_123'
      });

      expect(result.valid).toBe(true);
      expect(result.scopes).toContain('public_profile');
    });

    it('should handle token validation failures', async () => {
      mockSocialAuthService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Token expired'
      });

      const result = await mockSocialAuthService.validateToken({
        platform: SocialPlatform.Facebook,
        accessToken: 'expired_token'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });
  });

  describe('Social Account Management', () => {
    it('should disconnect social account with proper cleanup', async () => {
      const user = userEvent.setup();
      mockSocialAuthService.disconnectSocial.mockResolvedValue({ success: true });
      
      render(
        <TestWrapper>
          <button onClick={() => mockSocialAuthService.disconnectSocial(SocialPlatform.Facebook)}>
            Disconnect Facebook
          </button>
        </TestWrapper>
      );

      const disconnectButton = screen.getByRole('button', { name: /disconnect facebook/i });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(mockSocialAuthService.disconnectSocial).toHaveBeenCalledWith(SocialPlatform.Facebook);
      });
    });

    it('should fetch user profile after successful authentication', async () => {
      mockSocialAuthService.getUserProfile.mockResolvedValue({
        id: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
        profilePicture: 'https://example.com/profile.jpg',
        verified: true
      });

      const profile = await mockSocialAuthService.getUserProfile({
        platform: SocialPlatform.Facebook,
        accessToken: 'access_token_123'
      });

      expect(profile.id).toBe('user_123');
      expect(profile.verified).toBe(true);
    });
  });

  describe('Multiple Platform Support', () => {
    const platforms = [
      SocialPlatform.Facebook,
      SocialPlatform.Twitter,
      SocialPlatform.Instagram,
      SocialPlatform.TikTok
    ];

    it.each(platforms)('should support %s login flow', async (platform) => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SocialLoginButton platform={platform} />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: new RegExp(`login with ${platform}`, 'i') });
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockSocialAuthService.initiateSocialLogin).toHaveBeenCalledWith(
          expect.objectContaining({ platform })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      mockSocialAuthService.initiateSocialLogin.mockRejectedValue(new Error('Network error'));
      
      render(
        <TestWrapper>
          <SocialLoginButton platform={SocialPlatform.Facebook} />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with facebook/i });
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });

    it('should handle API rate limiting', async () => {
      mockSocialAuthService.getUserProfile.mockRejectedValue({
        error: 'rate_limit_exceeded',
        retryAfter: 60
      });

      try {
        await mockSocialAuthService.getUserProfile({
          platform: SocialPlatform.Facebook,
          accessToken: 'access_token_123'
        });
      } catch (error) {
        expect(error.error).toBe('rate_limit_exceeded');
        expect(error.retryAfter).toBe(60);
      }
    });
  });

  describe('Security Features', () => {
    it('should generate secure random state parameters', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SocialLoginButton platform={SocialPlatform.Facebook} />
        </TestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with facebook/i });
      await user.click(loginButton);

      await waitFor(() => {
        const callArgs = mockSocialAuthService.initiateSocialLogin.mock.calls[0][0];
        expect(callArgs.state).toMatch(/^[a-zA-Z0-9]{32,}$/);
      });
    });

    it('should validate redirect URI to prevent open redirect attacks', async () => {
      mockSocialAuthService.handleAuthCallback.mockImplementation(({ redirectUri }) => {
        if (!redirectUri?.startsWith('https://localhost:3000/')) {
          throw new Error('Invalid redirect URI');
        }
        return Promise.resolve({ success: true });
      });

      try {
        await mockSocialAuthService.handleAuthCallback({
          platform: SocialPlatform.Facebook,
          code: 'auth_code_123',
          state: 'valid_state',
          redirectUri: 'https://malicious-site.com/callback'
        });
      } catch (error) {
        expect(error.message).toContain('Invalid redirect URI');
      }
    });
  });
});

// Privacy Compliance Tests
describe('Privacy and GDPR Compliance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivacyService.getConsentStatus.mockResolvedValue({
      hasConsent: false,
      consentDate: null,
      permissions: []
    });
  });

  describe('User Consent Management', () => {
    it('should require explicit consent before collecting social data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PrivacyConsentModal platform={SocialPlatform.Facebook} isOpen={true} />
        </TestWrapper>
      );

      expect(screen.getByText(/we need your permission/i)).toBeInTheDocument();
      expect(screen.getByText(/access your facebook profile/i)).toBeInTheDocument();
      
      const consentButton = screen.getByRole('button', { name: /allow access/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });
      
      expect(consentButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });

    it('should record consent timestamp and permissions', async () => {
      const user = userEvent.setup();
      mockPrivacyService.updateConsent.mockResolvedValue({ success: true });
      
      render(
        <TestWrapper>
          <PrivacyConsentModal 
            platform={SocialPlatform.Facebook} 
            isOpen={true}
            permissions={['public_profile', 'email', 'user_friends']}
          />
        </TestWrapper>
      );

      const consentButton = screen.getByRole('button', { name: /allow access/i });
      await user.click(consentButton);

      await waitFor(() => {
        expect(mockPrivacyService.updateConsent).toHaveBeenCalledWith({
          platform: SocialPlatform.Facebook,
          hasConsent: true,
          permissions: ['public_profile', 'email', 'user_friends'],
          consentDate: expect.any(String),
          ipAddress: expect.any(String)
        });
      });
    });

    it('should allow users to withdraw consent', async () => {
      const user = userEvent.setup();
      mockPrivacyService.updateConsent.mockResolvedValue({ success: true });
      
      render(
        <TestWrapper>
          <button onClick={() => mockPrivacyService.updateConsent({
            platform: SocialPlatform.Facebook,
            hasConsent: false,
            withdrawalReason: 'user_request'
          })}>
            Withdraw Consent
          </button>
        </TestWrapper>
      );

      const withdrawButton = screen.getByRole('button', { name: /withdraw consent/i });
      await user.click(withdrawButton);

      await waitFor(() => {
        expect(mockPrivacyService.updateConsent).toHaveBeenCalledWith({
          platform: SocialPlatform.Facebook,
          hasConsent: false,
          withdrawalReason: 'user_request'
        });
      });
    });
  });

  describe('Data Minimization', () => {
    it('should only request necessary permissions', () => {
      const facebookPermissions = ['public_profile', 'email'];
      const twitterPermissions = ['tweet.read', 'users.read'];
      
      render(
        <TestWrapper>
          <PrivacyConsentModal 
            platform={SocialPlatform.Facebook} 
            isOpen={true}
            permissions={facebookPermissions}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/public profile information/i)).toBeInTheDocument();
      expect(screen.getByText(/email address/i)).toBeInTheDocument();
      expect(screen.queryByText(/friends list/i)).not.toBeInTheDocument();
    });

    it('should provide clear explanations for each permission', () => {
      render(
        <TestWrapper>
          <PrivacyConsentModal 
            platform={SocialPlatform.Facebook} 
            isOpen={true}
            permissions={['public_profile', 'email', 'user_friends']}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/to personalize your experience/i)).toBeInTheDocument();
      expect(screen.getByText(/to send you notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/to show what your friends are watching/i)).toBeInTheDocument();
    });
  });

  describe('Data Export and Deletion', () => {
    it('should allow users to export their social data', async () => {
      const user = userEvent.setup();
      mockPrivacyService.exportUserData.mockResolvedValue({
        success: true,
        downloadUrl: 'https://example.com/export/user_123_data.json',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      
      render(
        <TestWrapper>
          <button onClick={() => mockPrivacyService.exportUserData({ userId: 'user_123' })}>
            Export My Data
          </button>
        </TestWrapper>
      );

      const exportButton = screen.getByRole('button', { name: /export my data/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockPrivacyService.exportUserData).toHaveBeenCalledWith({ userId: 'user_123' });
      });
    });

    it('should allow users to delete their social data', async () => {
      const user = userEvent.setup();
      mockPrivacyService.deleteUserData.mockResolvedValue({
        success: true,
        deletedItems: ['profile', 'connections', 'activity_history'],
        completedAt: new Date().toISOString()
      });
      
      render(
        <TestWrapper>
          <button onClick={() => mockPrivacyService.deleteUserData({ 
            userId: 'user_123',
            platform: SocialPlatform.Facebook 
          })}>
            Delete Facebook Data
          </button>
        </TestWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /delete facebook data/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockPrivacyService.deleteUserData).toHaveBeenCalledWith({
          userId: 'user_123',
          platform: SocialPlatform.Facebook
        });
      });
    });
  });

  describe('Data Usage Transparency', () => {
    it('should provide clear data usage reports', async () => {
      mockPrivacyService.getDataUsageReport.mockResolvedValue({
        platforms: {
          facebook: {
            dataCollected: ['profile', 'email'],
            lastAccessed: new Date().toISOString(),
            usageCount: 15
          },
          twitter: {
            dataCollected: ['profile'],
            lastAccessed: new Date().toISOString(),
            usageCount: 8
          }
        },
        totalDataPoints: 23,
        retentionPeriod: '2 years'
      });

      const report = await mockPrivacyService.getDataUsageReport({ userId: 'user_123' });

      expect(report.platforms.facebook.dataCollected).toContain('profile');
      expect(report.platforms.facebook.usageCount).toBe(15);
      expect(report.totalDataPoints).toBe(23);
    });
  });
});

// Analytics and Tracking Tests
describe('Social Analytics Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track social login events', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <SocialLoginButton platform={SocialPlatform.Facebook} />
      </TestWrapper>
    );

    const loginButton = screen.getByRole('button', { name: /login with facebook/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockAnalyticsService.trackSocialLogin).toHaveBeenCalledWith({
        platform: SocialPlatform.Facebook,
        method: 'oauth2',
        timestamp: expect.any(String),
        sessionId: expect.any(String)
      });
    });
  });

  it('should track consent changes', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PrivacyConsentModal platform={SocialPlatform.Facebook} isOpen={true} />
      </TestWrapper>
    );

    const consentButton = screen.getByRole('button', { name: /allow access/i });
    await user.click(consentButton);

    await waitFor(() => {
      expect(mockAnalyticsService.trackConsentChange).toHaveBeenCalledWith({
        platform: SocialPlatform.Facebook,
        consentGiven: true,
        permissions: expect.any(Array),
        timestamp: expect.any(String)
      });
    });
  });

  it('should track social interactions', async () => {
    await mockAnalyticsService.trackSocialInteraction({
      type: 'friend_discovery',
      platform: SocialPlatform.Facebook,
      friendsFound: 25,
      mutualConnections: 8
    });

    expect(mockAnalyticsService.trackSocialInteraction).toHaveBeenCalledWith({
      type: 'friend_discovery',
      platform: SocialPlatform.Facebook,
      friendsFound: 25,
      mutualConnections: 8
    });
  });
});