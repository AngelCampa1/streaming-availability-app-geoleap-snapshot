import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { POPULAR_SERVICES } from '../../types/streaming';
import { getStreamingLogo, hasStreamingLogo, getStreamingLogoSvg } from '@/assets';

interface StreamingServiceIconProps {
  serviceId: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

const SIZE_MAP = {
  small: {
    container: 32,
    icon: 20,
    text: 10,
  },
  medium: {
    container: 48,
    icon: 28,
    text: 12,
  },
  large: {
    container: 64,
    icon: 36,
    text: 14,
  },
};

/**
 * Component to display streaming service icon with branding
 */
export const StreamingServiceIcon: React.FC<StreamingServiceIconProps> = ({
  serviceId,
  size = 'medium',
  showName = false,
}) => {
  const { theme } = useTheme();
  const service = POPULAR_SERVICES.find(s => s.id === serviceId);
  const dimensions = SIZE_MAP[size];

  const styles = StyleSheet.create({
    wrapper: {
      alignItems: 'center',
    },
    container: {
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.neutral[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    icon: {
      color: theme.semantic.background.primary,
    },
    name: {
      marginTop: 4,
      color: theme.semantic.text.primary,
      fontWeight: '500',
      textAlign: 'center',
      maxWidth: 80,
    },
  });

  // Check if logo is available for this service
  const logoConfig = getStreamingLogo(serviceId);
  const useLogo = hasStreamingLogo(serviceId) && logoConfig;

  if (!service) {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.container,
            height: dimensions.container,
            backgroundColor: theme.semantic.border.primary,
          },
        ]}
        testID="streaming-icon-container"
      >
        <Text style={[styles.icon, { fontSize: dimensions.icon }]}>📺</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            width: dimensions.container,
            height: dimensions.container,
            backgroundColor: useLogo ? logoConfig.color : (service.color || theme.colors.primary[500]),
          },
        ]}
        testID="streaming-icon-container"
      >
        {useLogo && logoConfig.svg ? (
          <SvgXml
            xml={logoConfig.svg}
            width={dimensions.icon}
            height={dimensions.icon}
            testID="streaming-logo-svg"
          />
        ) : useLogo && logoConfig.icon ? (
          <Text style={[styles.icon, { fontSize: dimensions.icon }]} testID="streaming-logo-image">{logoConfig.icon}</Text>
        ) : (
          <Text style={[styles.icon, { fontSize: dimensions.icon }]}>{service.icon}</Text>
        )}
      </View>
      {showName && (
        <Text style={[styles.name, { fontSize: dimensions.text }]} numberOfLines={1}>
          {service.name}
        </Text>
      )}
    </View>
  );
};

export default StreamingServiceIcon;
