import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppDesign } from '@/constants/app-design';
import { TEMPLATE_COLOR_PRESETS } from '@/constants/template-colors';
import { DEFAULT_PDF_DESIGN, LAYOUT_DESIGN_PRESETS } from '@/constants/pdf-layouts';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { mergePdfDesign, resolvePdfDesign } from '@/lib/pdf-style-resolver';
import type { PdfStyle } from '@/types/template';
import type {
  PdfFieldsStyle,
  PdfFontFamily,
  PdfHeaderStyle,
  PdfStyleDesign,
} from '@/types/pdf-style-design';

type PdfStyleConstructorProps = {
  value: PdfStyle;
  accentColor: string;
  gradientEnd: string;
  onChange: (value: PdfStyle) => void;
};

type ConstructorStyles = ReturnType<typeof createStyles>;

type OptionChipProps<T extends string> = {
  label: string;
  selected: boolean;
  accentColor: string;
  styles: ConstructorStyles;
  onPress: () => void;
};

function OptionChip<T extends string>({ label, selected, accentColor, styles, onPress }: OptionChipProps<T>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && [styles.chipSelected, { borderColor: accentColor }],
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && { color: accentColor }]}>{label}</Text>
    </Pressable>
  );
}

function getActiveDesign(value: PdfStyle, accentColor: string, gradientEnd: string): PdfStyleDesign {
  if (value.layout === 'custom') {
    return mergePdfDesign(DEFAULT_PDF_DESIGN, value.design);
  }

  if (value.design) {
    return mergePdfDesign(LAYOUT_DESIGN_PRESETS[value.layout], value.design);
  }

  return resolvePdfDesign(value, accentColor, gradientEnd);
}

export function PdfStyleConstructor({
  value,
  accentColor,
  gradientEnd,
  onChange,
}: PdfStyleConstructorProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const design = getActiveDesign(value, accentColor, gradientEnd);
  const previewAccent = design.accentColor ?? accentColor;

  const updateDesign = (patch: Partial<PdfStyleDesign>) => {
    onChange({
      ...value,
      layout: 'custom',
      savedStyleId: undefined,
      savedStyleName: undefined,
      design: {
        ...design,
        ...patch,
      },
    });
  };

  const headerOptions: { id: PdfHeaderStyle; label: string }[] = [
    { id: 'gradient', label: t('pdfStyle.headerGradient') },
    { id: 'solid', label: t('pdfStyle.headerSolid') },
    { id: 'banner', label: t('pdfStyle.headerBanner') },
    { id: 'sidebar', label: t('pdfStyle.headerSidebar') },
    { id: 'line', label: t('pdfStyle.headerLine') },
    { id: 'minimal', label: t('pdfStyle.headerMinimal') },
  ];

  const fieldsOptions: { id: PdfFieldsStyle; label: string }[] = [
    { id: 'sections', label: t('pdfStyle.fieldsSections') },
    { id: 'list', label: t('pdfStyle.fieldsList') },
    { id: 'table', label: t('pdfStyle.fieldsTable') },
    { id: 'cards', label: t('pdfStyle.fieldsCards') },
    { id: 'columns', label: t('pdfStyle.fieldsColumns') },
  ];

  const fontOptions: { id: PdfFontFamily; label: string }[] = [
    { id: 'sans', label: t('pdfStyle.fontSans') },
    { id: 'serif', label: t('pdfStyle.fontSerif') },
    { id: 'mono', label: t('pdfStyle.fontMono') },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('pdfStyle.constructorTitle')}</Text>
      <Text style={styles.subtitle}>{t('pdfStyle.constructorSubtitle')}</Text>

      <View style={styles.previewBox}>
        <View
          style={[
            styles.previewHeader,
            design.headerStyle === 'gradient' && {
              backgroundColor: previewAccent,
            },
            design.headerStyle === 'solid' && { backgroundColor: previewAccent },
            design.headerStyle === 'banner' && { backgroundColor: previewAccent, height: 28 },
            design.headerStyle === 'sidebar' && styles.previewSidebar,
            (design.headerStyle === 'line' || design.headerStyle === 'minimal') &&
              styles.previewLineHeader,
          ]}
        >
          {design.headerStyle === 'sidebar' ? (
            <View style={[styles.previewSidebarBar, { backgroundColor: previewAccent }]} />
          ) : null}
        </View>
        <View style={styles.previewBody}>
          {design.fieldsStyle === 'table' ? (
            <View style={styles.previewTableRow}>
              <View style={styles.previewTableLabel} />
              <View style={styles.previewTableValue} />
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.previewField,
                  design.showFieldBorders && styles.previewFieldBordered,
                ]}
              />
              <View
                style={[
                  styles.previewFieldShort,
                  design.showFieldBorders && styles.previewFieldBordered,
                ]}
              />
            </>
          )}
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t('pdfStyle.headerStyle')}</Text>
      <View style={styles.chipRow}>
        {headerOptions.map((option) => (
          <OptionChip
            key={option.id}
            label={option.label}
            selected={design.headerStyle === option.id}
            accentColor={previewAccent}
            styles={styles}
            onPress={() => updateDesign({ headerStyle: option.id })}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('pdfStyle.fieldsStyle')}</Text>
      <View style={styles.chipRow}>
        {fieldsOptions.map((option) => (
          <OptionChip
            key={option.id}
            label={option.label}
            selected={design.fieldsStyle === option.id}
            accentColor={previewAccent}
            styles={styles}
            onPress={() => updateDesign({ fieldsStyle: option.id })}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('pdfStyle.fontFamily')}</Text>
      <View style={styles.chipRow}>
        {fontOptions.map((option) => (
          <OptionChip
            key={option.id}
            label={option.label}
            selected={design.fontFamily === option.id}
            accentColor={previewAccent}
            styles={styles}
            onPress={() => updateDesign({ fontFamily: option.id })}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('pdfStyle.accentColor')}</Text>
      <View style={styles.colorRow}>
        {TEMPLATE_COLOR_PRESETS.map((preset) => {
          const selected =
            (design.accentColor ?? accentColor) === preset.accentColor &&
            (design.gradientEnd ?? gradientEnd) === preset.gradientEnd;

          return (
            <Pressable
              key={preset.accentColor}
              onPress={() =>
                updateDesign({
                  accentColor: preset.accentColor,
                  gradientEnd: preset.gradientEnd,
                })
              }
              style={({ pressed }) => [
                styles.colorSwatch,
                { backgroundColor: preset.accentColor },
                selected && styles.colorSwatchSelected,
                pressed && styles.pressed,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.toggles}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('pdfStyle.showEmoji')}</Text>
          <Switch
            value={design.showEmoji}
            onValueChange={(showEmoji) => updateDesign({ showEmoji })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={design.showEmoji ? previewAccent : colors.backgroundElement}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('pdfStyle.showFieldBorders')}</Text>
          <Switch
            value={design.showFieldBorders}
            onValueChange={(showFieldBorders) => updateDesign({ showFieldBorders })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={design.showFieldBorders ? previewAccent : colors.backgroundElement}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('pdfStyle.denseSpacing')}</Text>
          <Switch
            value={design.denseSpacing}
            onValueChange={(denseSpacing) => updateDesign({ denseSpacing })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={design.denseSpacing ? previewAccent : colors.backgroundElement}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    previewBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      marginTop: 4,
    },
    previewHeader: {
      height: 36,
      backgroundColor: colors.primarySoft,
    },
    previewLineHeader: {
      height: 24,
      backgroundColor: colors.surface,
      borderBottomWidth: 2,
      borderBottomColor: colors.text,
    },
    previewSidebar: {
      flexDirection: 'row',
      height: 36,
      backgroundColor: colors.surface,
    },
    previewSidebarBar: {
      width: 8,
      height: '100%',
    },
    previewBody: {
      padding: 10,
      gap: 6,
    },
    previewField: {
      height: 14,
      backgroundColor: colors.backgroundSoft,
      borderRadius: 4,
    },
    previewFieldShort: {
      height: 10,
      width: '70%',
      backgroundColor: colors.backgroundSoft,
      borderRadius: 4,
    },
    previewFieldBordered: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    previewTableRow: {
      flexDirection: 'row',
      gap: 4,
      height: 18,
    },
    previewTableLabel: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewTableValue: {
      flex: 1.4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 4,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.backgroundSoft,
    },
    chipSelected: {
      backgroundColor: colors.chipSelected,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorSwatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: colors.text,
    },
    toggles: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    toggleLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      paddingRight: 12,
    },
    pressed: {
      opacity: 0.9,
    },
  });
}
