/**
 * Privacy Policy Screen
 * Displays privacy policy via WebView
 */

import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { WebViewScreen } from '../../components/common/WebViewScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

// Privacy policy URL - should point to your web app's privacy policy page
const PRIVACY_POLICY_URL = 'https://geoleap.app/privacy';

export const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <WebViewScreen
      url={PRIVACY_POLICY_URL}
      title="Privacy Policy"
      onClose={() => navigation.goBack()}
      showNavigation={false}
    />
  );
};

export default PrivacyPolicyScreen;
