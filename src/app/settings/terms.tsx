import { LegalScreen } from '@/components/legal-screen';
import { useI18n } from '@/hooks/use-i18n';

export default function TermsOfUseScreen() {
  const { t } = useI18n();

  return (
    <LegalScreen
      title={t('settings.termsTitle')}
      intro={t('settings.termsIntro')}
      bullets={[
        t('settings.termsPoint1'),
        t('settings.termsPoint2'),
        t('settings.termsPoint3'),
        t('settings.termsPoint4'),
        t('settings.termsPoint5'),
      ]}
    />
  );
}
