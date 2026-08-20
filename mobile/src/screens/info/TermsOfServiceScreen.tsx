/**
 * Terms of Service Screen
 * Displays terms of service via WebView
 */

import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { WebViewScreen } from '../../components/common/WebViewScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsOfService'>;

// Terms of service URL - should point to your web app's terms page
const TERMS_OF_SERVICE_URL = 'https://geoleap.app/terms';

export const TermsOfServiceScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <WebViewScreen
      url={TERMS_OF_SERVICE_URL}
      title="Terms of Service"
      onClose={() => navigation.goBack()}
      showNavigation={false}
    />
  );
};

export default TermsOfServiceScreen;
