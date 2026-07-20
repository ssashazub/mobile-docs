import { LegalScreen } from '@/components/legal-screen';
import { useI18n } from '@/hooks/use-i18n';

export default function PrivacyPolicyScreen() {
  const { t } = useI18n();

  return (
    <LegalScreen
      title={t('settings.privacyTitle')}
      intro={t('settings.privacyIntro')}
      sections={[
        {
          title: t('settings.privacyDataTitle'),
          body: t('settings.privacyDataText'),
        },
        {
          title: t('settings.privacyStorageTitle'),
          body: t('settings.privacyStorageText'),
        },
        {
          title: t('settings.privacySharingTitle'),
          body: t('settings.privacySharingText'),
        },
      ]}
    />
  );
}
