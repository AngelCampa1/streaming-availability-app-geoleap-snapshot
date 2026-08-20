/**
 * Share Modal Component
 * Social sharing modal for content with preview card
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Share, Image, Linking } from 'react-native';
import { Modal, Portal, Text, Button, Surface, IconButton, Divider } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface ContentToShare {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  posterUrl?: string;
  streamingService?: string;
  description?: string;
}

interface ShareModalProps {
  visible: boolean;
  onDismiss: () => void;
  content: ContentToShare;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onDismiss,
  content,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [copied, setCopied] = useState(false);

  const shareUrl = `https://geoleap.app/content/${content.id}`;
  const shareMessage = `Check out "${content.title}" (${content.year || 'N/A'}) on GeoLeap! Find out where to stream it.`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `${shareMessage}\n\n${shareUrl}`,
        url: shareUrl,
        title: `${content.title} - GeoLeap`,
      });
    } catch (_error) {
      // User cancelled
    }
  };

  const handleSocialShare = async (platform: 'twitter' | 'facebook' | 'whatsapp' | 'telegram') => {
    let url = '';
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedUrl = encodeURIComponent(shareUrl);

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;
        break;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (_error) {
      // Handle error
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.content} elevation={3}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          {/* Content Preview Card */}
          <Surface style={styles.previewCard} elevation={1}>
            <View style={styles.previewRow}>
              {content.posterUrl ? (
                <Image
                  source={{ uri: content.posterUrl }}
                  style={styles.posterImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.posterPlaceholder, { backgroundColor: theme.colors.primary[100] }]}>
                  <Icon name="movie" size={32} color={theme.colors.primary[500]} />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.contentTitle} numberOfLines={2}>
                  {content.title}
                </Text>
                <Text style={styles.contentMeta}>
                  {content.type === 'movie' ? 'Movie' : 'TV Series'} {content.year && `(${content.year})`}
                </Text>
                {content.streamingService && (
                  <Text style={styles.streamingService}>
                    Available on {content.streamingService}
                  </Text>
                )}
              </View>
            </View>
          </Surface>

          <Divider style={styles.divider} />

          {/* Share Options */}
          <View style={styles.shareSection}>
            <Text style={styles.sectionLabel}>Share via</Text>

            <View style={styles.socialButtonsGrid}>
              <SocialButton
                icon="share"
                label="Share"
                color={theme.colors.primary[500]}
                onPress={handleNativeShare}
                theme={theme}
              />
              <SocialButton
                icon="chat"
                label="WhatsApp"
                color={theme.colors.social.whatsapp}
                onPress={() => handleSocialShare('whatsapp')}
                theme={theme}
              />
              <SocialButton
                icon="send"
                label="Telegram"
                color={theme.colors.social.telegram}
                onPress={() => handleSocialShare('telegram')}
                theme={theme}
              />
              <SocialButton
                icon="public"
                label="Twitter"
                color={theme.colors.social.twitter}
                onPress={() => handleSocialShare('twitter')}
                theme={theme}
              />
              <SocialButton
                icon="facebook"
                label="Facebook"
                color={theme.colors.social.facebook}
                onPress={() => handleSocialShare('facebook')}
                theme={theme}
              />
              <SocialButton
                icon={copied ? 'check' : 'link'}
                label={copied ? 'Copied!' : 'Copy Link'}
                color={copied ? theme.colors.success[500] : theme.semantic.text.secondary}
                onPress={handleCopyLink}
                theme={theme}
              />
            </View>
          </View>

          {/* URL Preview */}
          <View style={styles.urlPreview}>
            <Icon name="link" size={16} color={theme.semantic.text.tertiary} />
            <Text style={styles.urlText} numberOfLines={1}>
              {shareUrl}
            </Text>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

interface SocialButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  theme: any;
}

const SocialButton: React.FC<SocialButtonProps> = ({ icon, label, color, onPress, theme }) => (
  <View style={socialStyles.buttonContainer}>
    <IconButton
      icon={() => <Icon name={icon} size={24} color={color} />}
      onPress={onPress}
      style={[
        socialStyles.iconButton,
        { backgroundColor: color + '15' },
      ]}
      size={28}
    />
    <Text style={[socialStyles.buttonLabel, { color: theme.semantic.text.secondary }]}>
      {label}
    </Text>
  </View>
);

const socialStyles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 16,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  buttonLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

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
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
  },
  closeButton: {
    margin: 0,
  },
  previewCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.primary,
    padding: theme.spacing[3],
  },
  previewRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  posterImage: {
    width: 80,
    height: 120,
    borderRadius: theme.borderRadius.md,
  },
  posterPlaceholder: {
    width: 80,
    height: 120,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contentTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  contentMeta: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[1],
  },
  streamingService: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.medium,
  },
  divider: {
    marginVertical: theme.spacing[4],
  },
  shareSection: {
    marginBottom: theme.spacing[4],
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  urlPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  urlText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
  },
});

export default ShareModal;
