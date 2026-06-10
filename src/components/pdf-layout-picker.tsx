import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppDesign } from '@/constants/app-design';
import { PDF_LAYOUTS } from '@/constants/pdf-layouts';
import { useI18n } from '@/hooks/use-i18n';
import type { PdfLayout, PdfStyle } from '@/types/template';

type PdfLayoutPickerProps = {
  value: PdfStyle;
  accentColor: string;
  gradientEnd: string;
  onChange: (value: PdfStyle) => void;
};

const LAYOUT_LABELS: Record<
  PdfLayout,
  {
    title: 'templates.pdfLayoutClassic' | 'templates.pdfLayoutMinimal' | 'templates.pdfLayoutFormal' | 'templates.pdfLayoutCompact';
    desc: 'templates.pdfLayoutClassicDesc' | 'templates.pdfLayoutMinimalDesc' | 'templates.pdfLayoutFormalDesc' | 'templates.pdfLayoutCompactDesc';
  }
> = {
  classic: { title: 'templates.pdfLayoutClassic', desc: 'templates.pdfLayoutClassicDesc' },
  minimal: { title: 'templates.pdfLayoutMinimal', desc: 'templates.pdfLayoutMinimalDesc' },
  formal: { title: 'templates.pdfLayoutFormal', desc: 'templates.pdfLayoutFormalDesc' },
  compact: { title: 'templates.pdfLayoutCompact', desc: 'templates.pdfLayoutCompactDesc' },
};

function LayoutPreview({
  layout,
  accentColor,
  gradientEnd,
  selected,
}: {
  layout: PdfLayout;
  accentColor: string;
  gradientEnd: string;
  selected: boolean;
}) {
  if (layout === 'minimal') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected]}>
        <View style={styles.minimalLine} />
        <View style={[styles.minimalTitle, selected && { backgroundColor: accentColor }]} />
        <View style={styles.minimalField} />
        <View style={styles.minimalFieldShort} />
      </View>
    );
  }

  if (layout === 'formal') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected]}>
        <View style={styles.formalHeader} />
        <View style={styles.formalRow}>
          <View style={styles.formalLabel} />
          <View style={styles.formalValue} />
        </View>
        <View style={styles.formalRow}>
          <View style={styles.formalLabel} />
          <View style={styles.formalValue} />
        </View>
      </View>
    );
  }

  if (layout === 'compact') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected]}>
        <View style={[styles.compactHero, { backgroundColor: accentColor }]} />
        <View style={styles.compactGrid}>
          <View style={styles.compactCell} />
          <View style={styles.compactCell} />
          <View style={[styles.compactCell, styles.compactCellWide]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.preview, selected && styles.previewSelected]}>
      <View style={[styles.classicHero, { backgroundColor: accentColor }]}>
        <View style={[styles.classicHeroFade, { backgroundColor: gradientEnd, opacity: 0.55 }]} />
      </View>
      <View style={[styles.classicSectionTitle, { backgroundColor: accentColor }]} />
      <View style={styles.classicSectionBody} />
      <View style={[styles.classicSectionTitle, { backgroundColor: accentColor, width: '45%' }]} />
      <View style={styles.classicSectionBody} />
    </View>
  );
}

export function PdfLayoutPicker({ value, accentColor, gradientEnd, onChange }: PdfLayoutPickerProps) {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('templates.pdfStyleTitle')}</Text>
      <Text style={styles.subtitle}>{t('templates.pdfStyleSubtitle')}</Text>

      <View style={styles.grid}>
        {PDF_LAYOUTS.map((layout) => {
          const labels = LAYOUT_LABELS[layout];
          const selected = value.layout === layout;

          return (
            <Pressable
              key={layout}
              onPress={() => onChange({ ...value, layout })}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                selected && { borderColor: accentColor },
                pressed && styles.pressed,
              ]}
            >
              <LayoutPreview
                layout={layout}
                accentColor={accentColor}
                gradientEnd={gradientEnd}
                selected={selected}
              />
              <Text style={[styles.cardTitle, selected && { color: accentColor }]}>
                {t(labels.title)}
              </Text>
              <Text style={styles.cardDesc}>{t(labels.desc)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.toggles}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('templates.showDate')}</Text>
          <Switch
            value={value.showDate}
            onValueChange={(showDate) => onChange({ ...value, showDate })}
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={value.showDate ? accentColor : '#f8fafc'}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('templates.showFooter')}</Text>
          <Switch
            value={value.showFooter}
            onValueChange={(showFooter) => onChange({ ...value, showFooter })}
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={value.showFooter ? accentColor : '#f8fafc'}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: AppDesign.text,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: AppDesign.textSecondary,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.md,
    borderWidth: 2,
    borderColor: AppDesign.border,
    padding: 12,
    gap: 8,
    ...AppDesign.cardShadow,
  },
  cardSelected: {
    backgroundColor: '#f8fafc',
  },
  pressed: {
    opacity: 0.92,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: AppDesign.text,
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: AppDesign.textSecondary,
  },
  preview: {
    height: 72,
    borderRadius: 8,
    backgroundColor: AppDesign.backgroundSoft,
    padding: 8,
    gap: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewSelected: {
    borderColor: '#c7d2fe',
  },
  classicHero: {
    height: 18,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  classicHeroFade: {
    ...StyleSheet.absoluteFill,
    right: '40%',
  },
  classicSectionTitle: {
    height: 4,
    width: '55%',
    borderRadius: 2,
    opacity: 0.85,
  },
  classicSectionBody: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
  },
  minimalLine: {
    height: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 2,
  },
  minimalTitle: {
    height: 10,
    width: '70%',
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    marginBottom: 4,
  },
  minimalField: {
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
  },
  minimalFieldShort: {
    height: 8,
    width: '80%',
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
  },
  formalHeader: {
    height: 10,
    backgroundColor: '#0f172a',
    borderRadius: 2,
    marginBottom: 4,
    opacity: 0.15,
  },
  formalRow: {
    flexDirection: 'row',
    gap: 3,
    flex: 1,
  },
  formalLabel: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formalValue: {
    flex: 1.4,
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compactHero: {
    height: 14,
    borderRadius: 4,
    marginBottom: 2,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    flex: 1,
  },
  compactCell: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 14,
  },
  compactCellWide: {
    width: '100%',
  },
  toggles: {
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.md,
    borderWidth: 1,
    borderColor: AppDesign.border,
    padding: 4,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: AppDesign.text,
    paddingRight: 12,
  },
});
