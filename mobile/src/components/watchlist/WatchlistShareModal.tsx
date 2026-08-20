/**
 * Watchlist Share Modal
 * Allows users to share their watchlist via link or social media
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Share, Alert } from 'react-native';
import { Modal, Portal, Text, Button, Surface, TextInput, IconButton, Divider } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';

interface WatchlistShareModalProps {
  visible: boolean;
  onDismiss: () => void;
  watchlistId: string;
  watchlistName: string;
  itemCount: number;
}

export const WatchlistShareModal: React.FC<WatchlistShareModalProps> = ({
  visible,
  onDismiss,
  watchlistId,
  watchlistName,
  itemCount,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate a shareable URL
  const generateShareUrl = async () => {
    setIsGenerating(true);
    try {
      // TODO: Call API to generate share link
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
      const url = `https://geoleap.app/watchlist/${watchlistId}?share=true`;
      setShareUrl(url);
    } catch (_error) {
      Alert.alert('Error', 'Failed to generate share link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    const url = shareUrl || `https://geoleap.app/watchlist/${watchlistId}`;
    const message = `Check out my watchlist "${watchlistName}" with ${itemCount} titles on GeoLeap!`;

    try {
      await Share.share({
        message: `${message}\n\n${url}`,
        url: url,
        title: `${watchlistName} - GeoLeap Watchlist`,
      });
    } catch (_error) {
      // User cancelled or error occurred
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    const url = shareUrl || `https://geoleap.app/watchlist/${watchlistId}`;
    const message = `Check out my watchlist "${watchlistName}" with ${itemCount} titles on GeoLeap!`;

    let shareLink = '';
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
        break;
    }

    // TODO: Open link in browser
    logger.log('[WatchlistShareModal] Opening share link', { shareLink });
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.content} elevation={2}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Watchlist</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          <Text style={styles.subtitle}>
            Share "{watchlistName}" ({itemCount} titles) with friends
          </Text>

          {/* Generate Link Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share Link</Text>

            {shareUrl ? (
              <View style={styles.linkContainer}>
                <TextInput
                  value={shareUrl}
                  mode="outlined"
                  editable={false}
                  style={styles.linkInput}
                  right={
                    <TextInput.Icon
                      icon={copied ? 'check' : 'content-copy'}
                      onPress={handleCopyLink}
                    />
                  }
                />
                <Text style={styles.copiedText}>
                  {copied ? 'Copied to clipboard!' : 'Tap to copy'}
                </Text>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={generateShareUrl}
                loading={isGenerating}
                disabled={isGenerating}
                icon="link"
                style={styles.generateButton}
              >
                Generate Share Link
              </Button>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Social Share Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share via</Text>

            <View style={styles.socialButtons}>
              <Button
                mode="outlined"
                onPress={handleNativeShare}
                icon="share"
                style={styles.socialButton}
              >
                Share
              </Button>

              <View style={styles.socialIconsRow}>
                <IconButton
                  icon={() => <Icon name="chat" size={24} color={theme.colors.social.whatsapp} />}
                  onPress={() => handleSocialShare('whatsapp')}
                  style={[styles.socialIcon, { backgroundColor: theme.colors.social.whatsappLight }]}
                />
                <IconButton
                  icon={() => <Icon name="public" size={24} color={theme.colors.social.twitter} />}
                  onPress={() => handleSocialShare('twitter')}
                  style={[styles.socialIcon, { backgroundColor: theme.colors.social.twitterLight }]}
                />
                <IconButton
                  icon={() => <Icon name="facebook" size={24} color={theme.colors.social.facebook} />}
                  onPress={() => handleSocialShare('facebook')}
                  style={[styles.socialIcon, { backgroundColor: theme.colors.social.facebookLight }]}
                />
              </View>
            </View>
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Icon name="info-outline" size={16} color={theme.semantic.text.tertiary} />
            <Text style={styles.privacyText}>
              Anyone with the link can view this watchlist
            </Text>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  modalContainer: {
    margin: theme.spacing[5],
  },
  content: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
  },
  closeButton: {
    margin: 0,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[5],
  },
  section: {
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkContainer: {
    gap: theme.spacing[2],
  },
  linkInput: {
    fontSize: theme.typography.fontSize.sm,
  },
  copiedText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
    textAlign: 'center',
  },
  generateButton: {
    borderRadius: theme.borderRadius.lg,
  },
  divider: {
    marginVertical: theme.spacing[4],
  },
  socialButtons: {
    gap: theme.spacing[3],
  },
  socialButton: {
    borderRadius: theme.borderRadius.lg,
  },
  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing[3],
  },
  socialIcon: {
    borderRadius: theme.borderRadius.full,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  privacyText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
    flex: 1,
  },
});

export default WatchlistShareModal;
