'use client';

import React, { useState } from 'react';
import { Share2, BarChart3, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import ShareButton from './ShareButton';
import ShareModal from './ShareModal';
import ShareAnalyticsDashboard from './ShareAnalyticsDashboard';
import { useSocialSharing, useMobileShare } from '../../hooks/useSocialSharing';
import { logger } from '@/lib/logger';

/**
 * Example component showing how to integrate social sharing features
 * This demonstrates the complete social sharing implementation
 */
export const SocialSharingExample: React.FC = () => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedContent, _setSelectedContent] = useState({
    id: 'example-movie-123',
    type: 'movie',
    title: 'The Amazing Adventure',
    description: 'An epic journey through uncharted territories with stunning visuals and compelling characters.',
    image: '/images/example-movie.jpg',
  });

  const { preferences, canShare, isLoading } = useSocialSharing(selectedContent.id, selectedContent.type);
  const { isSupported: isMobileShareSupported, nativeShare } = useMobileShare();

  const handleShareComplete = (platform: string, success: boolean) => {
    logger.info('[SocialSharingExample] Share completed', { platform, success });

    if (success) {
      // You might want to show a success message, track analytics, etc.
      logger.info('[SocialSharingExample] Share successful - tracking analytics');
    }
  };

  const handleNativeShare = async () => {
    try {
      await nativeShare({
        title: selectedContent.title,
        text: `Check out this amazing ${selectedContent.type}: "${selectedContent.title}"`,
        url: window.location.href,
      });
    } catch (error) {
      logger.error('[SocialSharingExample] Native share failed', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Social Sharing Integration</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Complete social sharing system with platform integrations, analytics tracking, and mobile-native support.
          Ready for production use.
        </p>
      </div>

      {/* Content Preview */}
      <Card className="p-6">
        <div className="flex gap-6">
          <div className="w-32 h-48 bg-gradient-to-br from-primary to-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
            {selectedContent.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedContent.image}
                alt={selectedContent.title}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              'POSTER'
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{selectedContent.title}</h2>
              <p className="text-muted-foreground mt-2">{selectedContent.description}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full capitalize">
                {selectedContent.type}
              </span>
            </div>

            {/* Sharing Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Share this content:</h3>

              {/* Individual Platform Buttons */}
              <div className="flex flex-wrap gap-3">
                <ShareButton
                  contentId={selectedContent.id}
                  contentType={selectedContent.type}
                  contentTitle={selectedContent.title}
                  contentImage={selectedContent.image}
                  platform="facebook"
                  onShareComplete={handleShareComplete}
                  size="sm"
                />
                <ShareButton
                  contentId={selectedContent.id}
                  contentType={selectedContent.type}
                  contentTitle={selectedContent.title}
                  contentImage={selectedContent.image}
                  platform="twitter"
                  onShareComplete={handleShareComplete}
                  size="sm"
                />
                <ShareButton
                  contentId={selectedContent.id}
                  contentType={selectedContent.type}
                  contentTitle={selectedContent.title}
                  contentImage={selectedContent.image}
                  platform="whatsapp"
                  onShareComplete={handleShareComplete}
                  size="sm"
                />
                <ShareButton
                  contentId={selectedContent.id}
                  contentType={selectedContent.type}
                  contentTitle={selectedContent.title}
                  contentImage={selectedContent.image}
                  platform="linkedin"
                  onShareComplete={handleShareComplete}
                  size="sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setShowShareModal(true)}
                  disabled={!canShare() || isLoading}
                  className="flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share with Modal
                </Button>

                {isMobileShareSupported && (
                  <Button variant="outline" onClick={handleNativeShare} className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Native Share
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Feature Examples */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Platform Integration</h3>
            <p className="text-sm text-muted-foreground">
              Native integration with major social media platforms including Facebook, Twitter, Instagram, TikTok,
              WhatsApp, and more.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">Analytics Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive analytics including share counts, click-through rates, conversion tracking, and viral
              coefficient calculations.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Privacy Controls</h3>
            <p className="text-sm text-muted-foreground">
              Granular privacy settings allowing users to control what information is shared and how their data is used
              for analytics.
            </p>
          </div>
        </Card>
      </div>

      {/* User Preferences Status */}
      {preferences && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Current User Preferences</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${preferences.allowSocialSharing ? 'bg-success' : 'bg-error'}`}
              ></div>
              <span>Social Sharing: {preferences.allowSocialSharing ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${preferences.shareWithPersonalInfo ? 'bg-success' : 'bg-muted'}`}
              ></div>
              <span>Personal Info: {preferences.shareWithPersonalInfo ? 'Included' : 'Excluded'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${preferences.allowShareAnalytics ? 'bg-success' : 'bg-muted'}`}
              ></div>
              <span>Analytics: {preferences.allowShareAnalytics ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${preferences.autoGenerateHashtags ? 'bg-success' : 'bg-muted'}`}
              ></div>
              <span>Hashtags: {preferences.autoGenerateHashtags ? 'Auto' : 'Manual'}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <ShareAnalyticsDashboard contentId={selectedContent.id} timeRange="30d" />
        </div>
      )}

      {/* Code Examples */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Usage Examples</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-2">Basic Share Button</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              {`<ShareButton
  contentId="movie-123"
  contentType="movie"
  contentTitle="Amazing Movie"
  platform="facebook"
  onShareComplete={(platform, success) => {
    console.log('Share result:', platform, success);
  }}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Share Modal with Options</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              {`<ShareModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  contentId="movie-123"
  contentType="movie"
  contentTitle="Amazing Movie"
  contentDescription="Epic adventure..."
  onShareComplete={handleShareComplete}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Using the Hook</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              {`const { shareContent, preferences, canShare } = useSocialSharing();

const handleShare = async () => {
  const result = await shareContent({
    contentId: 'movie-123',
    contentType: 'movie',
    platform: 'facebook',
    customMessage: 'Check this out!'
  });
};`}
            </pre>
          </div>
        </div>
      </Card>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        contentId={selectedContent.id}
        contentType={selectedContent.type}
        contentTitle={selectedContent.title}
        contentDescription={selectedContent.description}
        contentImage={selectedContent.image}
        onShareComplete={handleShareComplete}
      />
    </div>
  );
};

export default SocialSharingExample;
