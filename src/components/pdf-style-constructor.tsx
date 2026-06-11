import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppDesign } from '@/constants/app-design';
import { TEMPLATE_COLOR_PRESETS } from '@/constants/template-colors';
import { DEFAULT_PDF_DESIGN, LAYOUT_DESIGN_PRESETS } from '@/constants/pdf-layouts';
import { useI18n } from '@/hooks/use-i18n';
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

type OptionChipProps<T extends string> = {
  label: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
};

function OptionChip<T extends string>({ label, selected, accentColor, onPress }: OptionChipProps<T>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { borderColor: accentColor, backgroundColor: '#eef2ff' },
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
  const design = getActiveDesign(value, accentColor, gradientEnd);
  const previewAccent = design.accentColor ?? accentColor;
  const previewGradient = design.gradientEnd ?? gradientEnd;

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
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={design.showEmoji ? previewAccent : '#f8fafc'}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('pdfStyle.showFieldBorders')}</Text>
          <Switch
            value={design.showFieldBorders}
            onValueChange={(showFieldBorders) => updateDesign({ showFieldBorders })}
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={design.showFieldBorders ? previewAccent : '#f8fafc'}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('pdfStyle.denseSpacing')}</Text>
          <Switch
            value={design.denseSpacing}
            onValueChange={(denseSpacing) => updateDesign({ denseSpacing })}
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={design.denseSpacing ? previewAccent : '#f8fafc'}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.md,
    borderWidth: 1,
    borderColor: AppDesign.border,
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: AppDesign.text,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: AppDesign.textSecondary,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginTop: 4,
  },
  previewHeader: {
    height: 36,
    backgroundColor: '#eef2ff',
  },
  previewLineHeader: {
    height: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
  },
  previewSidebar: {
    flexDirection: 'row',
    height: 36,
    backgroundColor: '#fff',
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
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  previewFieldShort: {
    height: 10,
    width: '70%',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  previewFieldBordered: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  previewTableRow: {
    flexDirection: 'row',
    gap: 4,
    height: 18,
  },
  previewTableLabel: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewTableValue: {
    flex: 1.4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: AppDesign.textSecondary,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: AppDesign.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppDesign.backgroundSoft,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppDesign.textSecondary,
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
    borderColor: '#0f172a',
  },
  toggles: {
    borderTopWidth: 1,
    borderTopColor: AppDesign.border,
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
    color: AppDesign.text,
    paddingRight: 12,
  },
  pressed: {
    opacity: 0.9,
  },
});
