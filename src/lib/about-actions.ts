import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';

import { ANDROID_PACKAGE_ID, APP_FEEDBACK_EMAIL } from '@/constants/app-info';
import { t } from '@/i18n';

export function getAppVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0'
  );
}

export async function openFeedbackEmail(): Promise<void> {
  const subject = encodeURIComponent(t('settings.feedbackSubject'));
  const url = `mailto:${APP_FEEDBACK_EMAIL}?subject=${subject}`;
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error(APP_FEEDBACK_EMAIL);
  }

  await Linking.openURL(url);
}

export async function requestAppReview(): Promise<void> {
  if (await StoreReview.hasAction()) {
    await StoreReview.requestReview();
    return;
  }

  if (Platform.OS === 'android') {
    const marketUrl = `market://details?id=${ANDROID_PACKAGE_ID}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

    if (await Linking.canOpenURL(marketUrl)) {
      await Linking.openURL(marketUrl);
      return;
    }

    await Linking.openURL(webUrl);
    return;
  }

  throw new Error(t('settings.rateUnavailable'));
}
