import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { TemplateIconView } from '@/components/template-icon-view';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { normalizeTemplateIcon } from '@/lib/template-icon';
import type { DocumentTemplate } from '@/types/template';

type DocumentTypeCardProps = {
  template: DocumentTemplate;
  onPress: () => void;
  onEdit?: () => void;
};

export function DocumentTypeCard({ template, onPress, onEdit }: DocumentTypeCardProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <LinearGradient
        colors={[template.accentColor, template.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <TemplateIconView
          icon={normalizeTemplateIcon(template)}
          size={30}
          color="#ffffff"
          style={styles.heroIcon}
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.meta}>
            {template.fields.length} {t('common.fields')}
          </Text>
        </View>
        {onEdit ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            style={({ pressed }) => [styles.editButton, pressed && styles.editPressed]}
          >
            <SymbolView
              name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              size={18}
              tintColor="#ffffff"
              weight="semibold"
            />
          </Pressable>
        ) : null}
      </LinearGradient>

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          {template.fields.map((field) => field.label).join(' · ')}
        </Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={18}
          tintColor={template.accentColor}
          weight="semibold"
        />
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...AppDesign.cardShadow,
    },
    cardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.985 }],
    },
    gradientHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 20,
    },
    heroIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
    },
    meta: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.88)',
      fontWeight: '600',
    },
    editButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editPressed: {
      opacity: 0.8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: colors.backgroundSoft,
    },
    footerText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });
}
