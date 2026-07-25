import * as ExpoHaptics from 'expo-haptics';

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export async function impactAsync(
  style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Light
): Promise<void> {
  if (!hapticsEnabled) {
    return;
  }

  await ExpoHaptics.impactAsync(style);
}

export async function selectionAsync(): Promise<void> {
  if (!hapticsEnabled) {
    return;
  }

  await ExpoHaptics.selectionAsync();
}

export async function notificationAsync(
  type: ExpoHaptics.NotificationFeedbackType
): Promise<void> {
  if (!hapticsEnabled) {
    return;
  }

  await ExpoHaptics.notificationAsync(type);
}
