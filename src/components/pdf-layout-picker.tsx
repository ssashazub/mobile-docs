import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useFocusEffect } from 'expo-router';

import { PdfStyleConstructor } from '@/components/pdf-style-constructor';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AppDesign } from '@/constants/app-design';
import { DEFAULT_PDF_DESIGN, LAYOUT_DESIGN_PRESETS, PDF_LAYOUTS } from '@/constants/pdf-layouts';
import { useI18n } from '@/hooks/use-i18n';
import { createSavedPdfStyleFromPdfStyle, getSavedPdfStyles } from '@/lib/pdf-style-storage';
import { mergePdfDesign, pdfStyleFromSavedStyle, resolvePdfDesign } from '@/lib/pdf-style-resolver';
import type { SavedPdfStyle } from '@/types/pdf-style-design';
import type { PdfLayout, PdfStyle } from '@/types/template';

type PdfLayoutPickerProps = {
  value: PdfStyle;
  accentColor: string;
  gradientEnd: string;
  onChange: (value: PdfStyle) => void;
};

type LayoutTitleKey =
  | 'templates.pdfLayoutClassic'
  | 'templates.pdfLayoutMinimal'
  | 'templates.pdfLayoutFormal'
  | 'templates.pdfLayoutCompact'
  | 'templates.pdfLayoutModern'
  | 'templates.pdfLayoutElegant'
  | 'templates.pdfLayoutBold'
  | 'templates.pdfLayoutSidebar';

type LayoutDescKey =
  | 'templates.pdfLayoutClassicDesc'
  | 'templates.pdfLayoutMinimalDesc'
  | 'templates.pdfLayoutFormalDesc'
  | 'templates.pdfLayoutCompactDesc'
  | 'templates.pdfLayoutModernDesc'
  | 'templates.pdfLayoutElegantDesc'
  | 'templates.pdfLayoutBoldDesc'
  | 'templates.pdfLayoutSidebarDesc';

const LAYOUT_LABELS: Record<PdfLayout, { title: LayoutTitleKey; desc: LayoutDescKey }> = {
  classic: { title: 'templates.pdfLayoutClassic', desc: 'templates.pdfLayoutClassicDesc' },
  minimal: { title: 'templates.pdfLayoutMinimal', desc: 'templates.pdfLayoutMinimalDesc' },
  formal: { title: 'templates.pdfLayoutFormal', desc: 'templates.pdfLayoutFormalDesc' },
  compact: { title: 'templates.pdfLayoutCompact', desc: 'templates.pdfLayoutCompactDesc' },
  modern: { title: 'templates.pdfLayoutModern', desc: 'templates.pdfLayoutModernDesc' },
  elegant: { title: 'templates.pdfLayoutElegant', desc: 'templates.pdfLayoutElegantDesc' },
  bold: { title: 'templates.pdfLayoutBold', desc: 'templates.pdfLayoutBoldDesc' },
  sidebar: { title: 'templates.pdfLayoutSidebar', desc: 'templates.pdfLayoutSidebarDesc' },
};

function LayoutPreview({
  layout,
  accentColor,
  selected,
}: {
  layout: PdfLayout | 'custom';
  accentColor: string;
  selected: boolean;
}) {
  if (layout === 'custom') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected]}>
        <View style={styles.customGrid}>
          <View style={[styles.customDot, { backgroundColor: accentColor }]} />
          <View style={[styles.customDot, { backgroundColor: accentColor, opacity: 0.55 }]} />
          <View style={[styles.customDot, { backgroundColor: accentColor, opacity: 0.35 }]} />
        </View>
        <View style={styles.customBars}>
          <View style={styles.customBar} />
          <View style={[styles.customBar, styles.customBarShort]} />
        </View>
      </View>
    );
  }

  const preset = LAYOUT_DESIGN_PRESETS[layout];

  if (preset.headerStyle === 'line' && preset.fieldsStyle === 'table') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected]}>
        <View style={styles.formalHeader} />
        <View style={styles.formalRow}>
          <View style={styles.formalLabel} />
          <View style={styles.formalValue} />
        </View>
      </View>
    );
  }

  if (preset.fieldsStyle === 'cards' || preset.fieldsStyle === 'columns') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected]}>
        <View style={[styles.compactHero, { backgroundColor: accentColor }]} />
        <View style={styles.compactGrid}>
          <View style={styles.compactCell} />
          <View style={styles.compactCell} />
        </View>
      </View>
    );
  }

  if (preset.headerStyle === 'line' || preset.headerStyle === 'minimal') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected]}>
        <View style={styles.minimalLine} />
        <View style={[styles.minimalTitle, selected && { backgroundColor: accentColor }]} />
        <View style={styles.minimalField} />
      </View>
    );
  }

  if (preset.headerStyle === 'sidebar') {
    return (
      <View style={[styles.preview, selected && styles.previewSelected, styles.sidebarPreview]}>
        <View style={[styles.sidebarBar, { backgroundColor: accentColor }]} />
        <View style={styles.sidebarContent}>
          <View style={[styles.minimalTitle, { width: '80%' }]} />
          <View style={styles.minimalFieldShort} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.preview, selected && styles.previewSelected]}>
      <View style={[styles.classicHero, { backgroundColor: accentColor }]} />
      <View style={[styles.classicSectionTitle, { backgroundColor: accentColor }]} />
      <View style={styles.classicSectionBody} />
    </View>
  );
}

export function PdfLayoutPicker({ value, accentColor, gradientEnd, onChange }: PdfLayoutPickerProps) {
  const { t } = useI18n();
  const [savedStyles, setSavedStyles] = useState<SavedPdfStyle[]>([]);
  const [showConstructor, setShowConstructor] = useState(value.layout === 'custom');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [styleName, setStyleName] = useState('');

  const loadSavedStyles = useCallback(async () => {
    setSavedStyles(await getSavedPdfStyles());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedStyles();
    }, [loadSavedStyles])
  );

  const selectLayout = (layout: PdfLayout) => {
    setShowConstructor(false);
    onChange({
      layout,
      showFooter: value.showFooter,
      showDate: value.showDate,
    });
  };

  const selectCustom = () => {
    setShowConstructor(true);
    onChange({
      layout: 'custom',
      showFooter: value.showFooter,
      showDate: value.showDate,
      design: value.design ?? { ...DEFAULT_PDF_DESIGN },
    });
  };

  const selectSavedStyle = (saved: SavedPdfStyle) => {
    setShowConstructor(saved.layout === 'custom');
    onChange(pdfStyleFromSavedStyle(saved));
  };

  const handleSaveStyle = async () => {
    if (!styleName.trim()) {
      Alert.alert(t('pdfStyle.enterStyleName'));
      return;
    }

    const design =
      value.layout === 'custom'
        ? mergePdfDesign(DEFAULT_PDF_DESIGN, value.design)
        : resolvePdfDesign(value, accentColor, gradientEnd);

    const saved = await createSavedPdfStyleFromPdfStyle(styleName.trim(), value, {
      headerStyle: design.headerStyle,
      fieldsStyle: design.fieldsStyle,
      fontFamily: design.fontFamily,
      accentColor: design.accentColor ?? accentColor,
      gradientEnd: design.gradientEnd ?? gradientEnd,
      showEmoji: design.showEmoji,
      showFieldBorders: design.showFieldBorders,
      denseSpacing: design.denseSpacing,
    });

    setSaveModalVisible(false);
    setStyleName('');
    await loadSavedStyles();
    onChange(pdfStyleFromSavedStyle(saved));
  };

  const isCustomSelected = value.layout === 'custom';

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('templates.pdfStyleTitle')}</Text>
          <Text style={styles.subtitle}>{t('templates.pdfStyleSubtitle')}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/pdf-styles' as Href)}
          style={({ pressed }) => [styles.manageLink, pressed && styles.pressed]}
        >
          <Text style={styles.manageLinkText}>{t('pdfStyle.manage')}</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {PDF_LAYOUTS.map((layout) => {
          const labels = LAYOUT_LABELS[layout];
          const selected = value.layout === layout && !value.savedStyleId;

          return (
            <Pressable
              key={layout}
              onPress={() => selectLayout(layout)}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                selected && { borderColor: accentColor },
                pressed && styles.pressed,
              ]}
            >
              <LayoutPreview layout={layout} accentColor={accentColor} selected={selected} />
              <Text style={[styles.cardTitle, selected && { color: accentColor }]}>
                {t(labels.title)}
              </Text>
              <Text style={styles.cardDesc}>{t(labels.desc)}</Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={selectCustom}
          style={({ pressed }) => [
            styles.card,
            isCustomSelected && styles.cardSelected,
            isCustomSelected && { borderColor: accentColor },
            pressed && styles.pressed,
          ]}
        >
          <LayoutPreview layout="custom" accentColor={accentColor} selected={isCustomSelected} />
          <Text style={[styles.cardTitle, isCustomSelected && { color: accentColor }]}>
            {t('pdfStyle.customLayout')}
          </Text>
          <Text style={styles.cardDesc}>{t('pdfStyle.customLayoutDesc')}</Text>
        </Pressable>
      </View>

      {savedStyles.length > 0 ? (
        <View style={styles.savedSection}>
          <Text style={styles.savedTitle}>{t('pdfStyle.myStyles')}</Text>
          <View style={styles.savedRow}>
            {savedStyles.map((saved) => {
              const selected = value.savedStyleId === saved.id;

              return (
                <Pressable
                  key={saved.id}
                  onPress={() => selectSavedStyle(saved)}
                  style={({ pressed }) => [
                    styles.savedChip,
                    selected && { borderColor: accentColor, backgroundColor: '#eef2ff' },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.savedChipText, selected && { color: accentColor }]}>
                    {saved.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <PrimaryButton
          label={showConstructor ? t('pdfStyle.hideConstructor') : t('pdfStyle.openConstructor')}
          variant="secondary"
          onPress={() => {
            if (!showConstructor && value.layout !== 'custom') {
              selectCustom();
              return;
            }
            setShowConstructor((current) => !current);
          }}
        />
        <PrimaryButton
          label={t('pdfStyle.saveStyle')}
          variant="secondary"
          onPress={() => setSaveModalVisible(true)}
        />
      </View>

      {showConstructor || isCustomSelected ? (
        <PdfStyleConstructor
          value={value}
          accentColor={accentColor}
          gradientEnd={gradientEnd}
          onChange={onChange}
        />
      ) : null}

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

      <Modal visible={saveModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('pdfStyle.saveStyleTitle')}</Text>
            <TextInput
              style={styles.modalInput}
              value={styleName}
              onChangeText={setStyleName}
              placeholder={t('pdfStyle.styleNamePlaceholder')}
              placeholderTextColor={AppDesign.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => {
                  setSaveModalVisible(false);
                  setStyleName('');
                }}
              />
              <PrimaryButton label={t('common.save')} onPress={handleSaveStyle} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 18, fontWeight: '800', color: AppDesign.text },
  subtitle: { fontSize: 13, lineHeight: 19, color: AppDesign.textSecondary },
  manageLink: { paddingVertical: 4, paddingHorizontal: 2 },
  manageLinkText: { color: AppDesign.primary, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  cardSelected: { backgroundColor: '#f8fafc' },
  pressed: { opacity: 0.92 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: AppDesign.text },
  cardDesc: { fontSize: 11, lineHeight: 15, color: AppDesign.textSecondary },
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
  previewSelected: { borderColor: '#c7d2fe' },
  classicHero: { height: 18, borderRadius: 6 },
  classicSectionTitle: { height: 4, width: '55%', borderRadius: 2, opacity: 0.85 },
  classicSectionBody: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 3 },
  minimalLine: { height: 2, backgroundColor: '#e2e8f0', marginBottom: 2 },
  minimalTitle: { height: 10, width: '70%', backgroundColor: '#cbd5e1', borderRadius: 3, marginBottom: 4 },
  minimalField: { height: 12, backgroundColor: '#f1f5f9', borderRadius: 3 },
  minimalFieldShort: { height: 8, width: '80%', backgroundColor: '#f1f5f9', borderRadius: 3 },
  formalHeader: { height: 10, backgroundColor: '#0f172a', borderRadius: 2, marginBottom: 4, opacity: 0.15 },
  formalRow: { flexDirection: 'row', gap: 3, flex: 1 },
  formalLabel: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  formalValue: { flex: 1.4, backgroundColor: '#fff', borderRadius: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  compactHero: { height: 14, borderRadius: 4, marginBottom: 2 },
  compactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, flex: 1 },
  compactCell: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 14,
  },
  sidebarPreview: { flexDirection: 'row', padding: 0, gap: 0 },
  sidebarBar: { width: 8, height: '100%' },
  sidebarContent: { flex: 1, padding: 8, gap: 4 },
  customGrid: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  customDot: { width: 10, height: 10, borderRadius: 5 },
  customBars: { gap: 4 },
  customBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 3 },
  customBarShort: { width: '65%' },
  savedSection: { gap: 8 },
  savedTitle: { fontSize: 14, fontWeight: '800', color: AppDesign.text },
  savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  savedChip: {
    borderWidth: 1.5,
    borderColor: AppDesign.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: AppDesign.surface,
  },
  savedChipText: { fontSize: 13, fontWeight: '700', color: AppDesign.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 10 },
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
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: AppDesign.text, paddingRight: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.lg,
    padding: 20,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: AppDesign.text },
  modalInput: {
    borderWidth: 1.5,
    borderColor: AppDesign.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppDesign.text,
    backgroundColor: AppDesign.backgroundSoft,
  },
  modalActions: { gap: 10 },
});
