import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { FeedbackModal } from './FeedbackModal';
import { useTheme } from '../../theme/ThemeProvider';

interface FeedbackButtonProps {
  position?: 'bottom-right' | 'bottom-left';
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  position = 'bottom-right',
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <FloatingActionButton
        onPress={() => setModalVisible(true)}
        icon={<Icon name="chat" size={24} color={theme.semantic?.text?.inverse || theme.colors.neutral?.[50] || '#fff'} />}
        position={position}
        accessibilityLabel="Send feedback"
        accessibilityHint="Opens the feedback form"
        testID="feedback-button"
      />

      <FeedbackModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const _styles = StyleSheet.create({});
