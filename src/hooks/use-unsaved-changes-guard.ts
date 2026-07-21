import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';

import { showAppAlert } from '@/components/ui/app-alert';
import { useI18n } from '@/hooks/use-i18n';

type UnsavedChangesGuardOptions = {
  hasChanges: boolean;
  onSave: () => Promise<boolean>;
};

export function useUnsavedChangesGuard({
  hasChanges,
  onSave,
}: UnsavedChangesGuardOptions): () => void {
  const { t } = useI18n();
  const navigation = useNavigation();
  const allowNextNavigation = useRef(false);
  const allowNavigation = useCallback(() => {
    allowNextNavigation.current = true;
  }, []);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!hasChanges || allowNextNavigation.current) {
        return;
      }

      event.preventDefault();
      showAppAlert(t('common.saveChangesTitle'), t('common.saveChangesText'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.discardChanges'),
          style: 'destructive',
          onPress: () => {
            allowNavigation();
            navigation.dispatch(event.data.action);
          },
        },
        {
          text: t('common.save'),
          onPress: async () => {
            if (await onSave()) {
              allowNavigation();
              navigation.dispatch(event.data.action);
            }
          },
        },
      ]);
    });
  }, [allowNavigation, hasChanges, navigation, onSave, t]);

  return allowNavigation;
}
