import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type Href, router, useFocusEffect } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as Haptics from '@/lib/haptics';
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ui/action-sheet';
import { showAppAlert } from '@/components/ui/app-alert';
import { DocumentCard } from '@/components/document-card';
import { TemplateIconView } from '@/components/template-icon-view';
import { AppDesign } from '@/constants/app-design';
import { Colors, type ThemeColors } from '@/constants/theme';
import { getBuiltinTemplates } from '@/core/templates/registry';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { resolveTemplateForDocument } from '@/lib/document-display';
import { deleteDocument as deleteStoredDocument, getDocuments } from '@/lib/document-storage';
import { ImportCancelledError, pickAndImportPdf } from '@/lib/import-pdf';
import { getTemplates } from '@/lib/template-storage';
import type { AppLocale } from '@/i18n/types';
import type { Document } from '@/types/document';
import type { DocumentTemplate } from '@/types/template';

type IconName = SymbolViewProps['name'];

const SPRING = { damping: 16, stiffness: 260, mass: 0.7 };

const EMPTY_FADE_MS = 820;
const EMPTY_HOLD_MS = 2200;
const EMPTY_EASE = Easing.bezier(0.33, 0, 0.2, 1);
const EMPTY_HALO_MS = 1250;

function ScalePressable({
  children,
  onPress,
  disabled,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t, pluralDocuments, locale } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [importing, setImporting] = useState(false);
  const [tabletMainHeight, setTabletMainHeight] = useState(0);
  const [docsHeaderHeight, setDocsHeaderHeight] = useState(0);
  const [docsContentHeight, setDocsContentHeight] = useState(0);

  const recentDocuments = useMemo(() => {
    const sorted = [...documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return layout.isTablet ? sorted : sorted.slice(0, 3);
  }, [documents, layout.isTablet]);
  const hasMoreDocuments = !layout.isTablet && documents.length > 3;
  const tabletDocsViewportHeight =
    tabletMainHeight > 0 ? Math.max(120, tabletMainHeight - docsHeaderHeight - 40) : 0;
  const tabletDocumentsOverflow =
    layout.isTablet &&
    documents.length > 0 &&
    tabletDocsViewportHeight > 0 &&
    docsContentHeight > tabletDocsViewportHeight + 1;
  const showViewAllDocuments = hasMoreDocuments || tabletDocumentsOverflow;

  const templatesMap = useMemo(
    () => Object.fromEntries(templates.map((template) => [template.id, template])),
    [templates]
  );

  const loadData = useCallback(async () => {
    const [savedDocuments, loadedTemplates] = await Promise.all([
      getDocuments(),
      getTemplates(),
    ]);

    setTemplates(loadedTemplates);
    setDocuments(savedDocuments);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const deleteDocument = async (id: number) => {
    await deleteStoredDocument(id);
    setDocuments((current) => current.filter((doc) => doc.id !== id));
  };

  const selectedTemplate = selectedDocument
    ? resolveTemplateForDocument(selectedDocument, templatesMap)
    : null;

  const handleImportPdf = async () => {
    try {
      setImporting(true);
      const document = await pickAndImportPdf();
      await loadData();
      router.push(`/document/edit/${document.id}`);
    } catch (error) {
      if (error instanceof ImportCancelledError) {
        return;
      }
      showAppAlert(
        t('import.errorTitle'),
        error instanceof Error ? error.message : t('import.errorTitle')
      );
    } finally {
      setImporting(false);
    }
  };

  const brandBar = (
    <Animated.View entering={FadeInDown.duration(420).springify()} style={styles.topBar}>
      <View style={styles.brandBlock}>
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandMark}
        >
          <SymbolView
            name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
            size={18}
            tintColor="#fff"
          />
        </LinearGradient>
        <View style={styles.brandText}>
          <Text style={styles.brandName}>Mobile Docs</Text>
          <Text style={styles.brandMeta}>
            {documents.length} {pluralDocuments(documents.length)}
          </Text>
        </View>
      </View>

      <ScalePressable
        onPress={() => router.push('/settings' as Href)}
        style={styles.iconButton}
      >
        <SymbolView
          name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
          size={22}
          tintColor={colors.primary}
          weight="semibold"
        />
      </ScalePressable>
    </Animated.View>
  );

  const documentsHeader = (
    <View
      style={styles.listHeaderTablet}
      onLayout={(event) => {
        setDocsHeaderHeight(event.nativeEvent.layout.height);
      }}
    >
      <Text style={styles.listTitle}>{t('home.listTitle')}</Text>
      {showViewAllDocuments ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.viewAll')}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/documents' as Href);
          }}
          style={({ pressed }) => [styles.viewAllButton, pressed && styles.viewAllPressed]}
        >
          <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
          <View style={styles.viewAllCount}>
            <Text style={styles.viewAllCountText}>{documents.length}</Text>
          </View>
          <SymbolView
            name={{
              ios: 'chevron.right',
              android: 'chevron_right',
              web: 'chevron_right',
            }}
            size={15}
            tintColor={colors.primary}
          />
        </Pressable>
      ) : documents.length > 0 ? (
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{documents.length}</Text>
        </View>
      ) : null}
    </View>
  );

  const documentsList = (
    <>
      {documents.length === 0 ? (
        <View style={[styles.emptyState, styles.emptyStateTablet]}>
          <EmptyDocumentsArt
            styles={styles}
            locale={locale}
            showcaseLabel={t('home.emptyShowcase')}
          />
          <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('home.emptyText')}</Text>
        </View>
      ) : (
        <View style={styles.tabletDocsList}>
          {recentDocuments.map((doc) => {
            const template = resolveTemplateForDocument(doc, templatesMap);

            return (
              <DocumentCard
                key={doc.id}
                document={doc}
                template={template}
                compact
                onPress={() => router.push(`/document/${doc.id}`)}
                onLongPress={() => setSelectedDocument(doc)}
              />
            );
          })}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {layout.isTablet ? (
        <View style={[styles.container, styles.containerTablet, styles.tabletScreen]}>
          {brandBar}

          <View style={styles.tabletBody}>
            <View style={styles.tabletSidebar}>
              <Animated.View
                entering={FadeInDown.delay(110).duration(480).springify()}
                style={styles.tabletPanel}
              >
                <ScalePressable
                  onPress={() => router.push('/create' as Href)}
                  style={styles.createShell}
                >
                  <LinearGradient
                    colors={['#6366f1', '#4f46e5', '#4338ca']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createGradientTablet}
                  >
                    <View style={styles.createTabletTop}>
                      <View style={styles.createIcon}>
                        <SymbolView
                          name={{ ios: 'plus', android: 'add', web: 'add' }}
                          size={26}
                          tintColor="#fff"
                          weight="bold"
                        />
                      </View>
                      <SymbolView
                        name={{
                          ios: 'chevron.right',
                          android: 'arrow_forward',
                          web: 'arrow_forward',
                        }}
                        size={20}
                        tintColor="rgba(255,255,255,0.9)"
                      />
                    </View>
                    <Text style={styles.createTitle}>{t('home.createDocument')}</Text>
                    <Text style={styles.createSubtitle}>{t('home.createSubtitle')}</Text>
                  </LinearGradient>
                </ScalePressable>

                <View style={styles.tabletTools}>
                  <QuickAction
                    title={t('home.importPdf')}
                    subtitle={t('home.importPdfSubtitle')}
                    icon={{
                      ios: 'square.and.arrow.down.fill',
                      android: 'download',
                      web: 'download',
                    }}
                    accent={colors.importTitle}
                    soft="#ccfbf1"
                    softDark="#134e4a"
                    loading={importing}
                    onPress={handleImportPdf}
                    styles={styles}
                    colors={colors}
                  />
                  <View style={styles.tabletToolsDivider} />
                  <QuickAction
                    title={t('home.templatesTitle')}
                    subtitle={t('home.templatesSubtitle')}
                    icon={{
                      ios: 'square.grid.2x2.fill',
                      android: 'dashboard_customize',
                      web: 'dashboard_customize',
                    }}
                    accent={colors.primary}
                    soft={colors.primarySoft}
                    onPress={() => router.push('/templates' as Href)}
                    styles={styles}
                    colors={colors}
                  />
                </View>
              </Animated.View>
            </View>

            <Animated.View
              entering={FadeInDown.delay(160).duration(450).springify()}
              style={styles.tabletMain}
              onLayout={(event) => {
                setTabletMainHeight(event.nativeEvent.layout.height);
              }}
            >
              <View
                style={[
                  styles.tabletPanel,
                  styles.tabletDocsPanel,
                  tabletMainHeight > 0 ? { maxHeight: tabletMainHeight } : null,
                ]}
              >
                {documentsHeader}
                <ScrollView
                  style={
                    tabletMainHeight > 0
                      ? {
                          maxHeight: tabletDocsViewportHeight,
                        }
                      : undefined
                  }
                  contentContainerStyle={styles.tabletDocsScrollContent}
                  onContentSizeChange={(_width, height) => {
                    setDocsContentHeight(height);
                  }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {documentsList}
                </ScrollView>
              </View>
            </Animated.View>
          </View>
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={[styles.container, layout.listContentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {brandBar}

          <>
            <Animated.View entering={FadeInDown.delay(110).duration(480).springify()}>
              <ScalePressable
                onPress={() => router.push('/create' as Href)}
                style={styles.createShell}
              >
                <LinearGradient
                  colors={['#6366f1', '#4f46e5', '#4338ca']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createGradient}
                >
                  <View style={styles.createIcon}>
                    <SymbolView
                      name={{ ios: 'plus', android: 'add', web: 'add' }}
                      size={26}
                      tintColor="#fff"
                      weight="bold"
                    />
                  </View>
                  <View style={styles.createTextWrap}>
                    <Text style={styles.createTitle}>{t('home.createDocument')}</Text>
                    <Text style={styles.createSubtitle}>{t('home.createSubtitle')}</Text>
                  </View>
                  <SymbolView
                    name={{
                      ios: 'chevron.right',
                      android: 'arrow_forward',
                      web: 'arrow_forward',
                    }}
                    size={22}
                    tintColor="rgba(255,255,255,0.9)"
                  />
                </LinearGradient>
              </ScalePressable>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(160).duration(480).springify()}
              style={styles.toolsCard}
            >
              <QuickAction
                title={t('home.importPdf')}
                subtitle={t('home.importPdfSubtitle')}
                icon={{
                  ios: 'square.and.arrow.down.fill',
                  android: 'download',
                  web: 'download',
                }}
                accent={colors.importTitle}
                soft="#ccfbf1"
                softDark="#134e4a"
                loading={importing}
                onPress={handleImportPdf}
                styles={styles}
                colors={colors}
              />
              <View style={styles.toolsDivider} />
              <QuickAction
                title={t('home.templatesTitle')}
                subtitle={t('home.templatesSubtitle')}
                icon={{
                  ios: 'square.grid.2x2.fill',
                  android: 'dashboard_customize',
                  web: 'dashboard_customize',
                }}
                accent={colors.primary}
                soft={colors.primarySoft}
                onPress={() => router.push('/templates' as Href)}
                styles={styles}
                colors={colors}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(210).duration(450).springify()}
              style={styles.listHeader}
            >
              <Text style={styles.listTitle}>{t('home.listTitle')}</Text>
              {hasMoreDocuments ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.viewAll')}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/documents' as Href);
                  }}
                  style={({ pressed }) => [styles.viewAllButton, pressed && styles.viewAllPressed]}
                >
                  <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
                  <View style={styles.viewAllCount}>
                    <Text style={styles.viewAllCountText}>{documents.length}</Text>
                  </View>
                  <SymbolView
                    name={{
                      ios: 'chevron.right',
                      android: 'chevron_right',
                      web: 'chevron_right',
                    }}
                    size={15}
                    tintColor={colors.primary}
                  />
                </Pressable>
              ) : documents.length > 0 ? (
                <View style={styles.countChip}>
                  <Text style={styles.countChipText}>{documents.length}</Text>
                </View>
              ) : null}
            </Animated.View>

            {documents.length === 0 ? (
              <Animated.View
                entering={FadeInDown.delay(250).duration(500).springify()}
                style={styles.emptyState}
              >
                <EmptyDocumentsArt
                  styles={styles}
                  locale={locale}
                  showcaseLabel={t('home.emptyShowcase')}
                />
                <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
                <Text style={styles.emptyText}>{t('home.emptyText')}</Text>
              </Animated.View>
            ) : (
              <View style={styles.list}>
                {recentDocuments.map((doc, index) => {
                  const template = resolveTemplateForDocument(doc, templatesMap);

                  return (
                    <Animated.View
                      key={doc.id}
                      entering={FadeInDown.delay(80 + index * 45).duration(420).springify()}
                    >
                      <DocumentCard
                        document={doc}
                        template={template}
                        compact
                        onPress={() => router.push(`/document/${doc.id}`)}
                        onLongPress={() => setSelectedDocument(doc)}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </>
      </ScrollView>
      )}

      <ActionSheet
        visible={!!selectedDocument}
        title={selectedDocument?.title ?? ''}
        subtitle={
          selectedDocument && selectedTemplate
            ? `${selectedTemplate.title} · ${selectedDocument.client || t('common.noClient')}`
            : undefined
        }
        accentColor={selectedTemplate?.accentColor}
        onClose={() => setSelectedDocument(null)}
        items={
          selectedDocument
            ? [
                {
                  key: 'open',
                  label: t('common.open'),
                  symbol: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
                  onPress: () => router.push(`/document/${selectedDocument.id}`),
                },
                {
                  key: 'edit',
                  label: t('common.edit'),
                  symbol: { ios: 'pencil', android: 'edit', web: 'edit' },
                  onPress: () => router.push(`/document/edit/${selectedDocument.id}`),
                },
                {
                  key: 'delete',
                  label: t('common.delete'),
                  symbol: { ios: 'trash.fill', android: 'delete', web: 'delete' },
                  tone: 'danger',
                  onPress: () => deleteDocument(selectedDocument.id),
                },
              ]
            : []
        }
      />
    </SafeAreaView>
  );
}

function QuickAction({
  title,
  subtitle,
  icon,
  accent,
  soft,
  softDark,
  loading,
  onPress,
  styles,
  colors,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  accent: string;
  soft: string;
  softDark?: string;
  loading?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const softBg = colors.background === Colors.dark.background && softDark ? softDark : soft;

  return (
    <ScalePressable
      onPress={onPress}
      disabled={loading}
      style={styles.quickAction}
    >
      {loading ? (
        <View style={styles.quickLoading}>
          <ActivityIndicator color={accent} />
        </View>
      ) : (
        <>
          <View style={[styles.quickIcon, { backgroundColor: softBg }]}>
            <SymbolView name={icon} size={20} tintColor={accent} />
          </View>
          <View style={styles.quickText}>
            <Text style={[styles.quickTitle, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.quickSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={18}
            tintColor={colors.textMuted}
          />
        </>
      )}
    </ScalePressable>
  );
}

function EmptyDocumentsArt({
  styles,
  locale,
  showcaseLabel,
}: {
  styles: ReturnType<typeof createStyles>;
  locale: AppLocale;
  showcaseLabel: string;
}) {
  const templates = useMemo(() => getBuiltinTemplates(locale), [locale]);
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(1);
  const halo = useSharedValue(1);
  const current = templates[index] ?? templates[0];

  useEffect(() => {
    if (templates.length <= 1) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const playAppear = () => {
      halo.value = 0;
      halo.value = withTiming(1, {
        duration: EMPTY_HALO_MS,
        easing: Easing.out(Easing.cubic),
      });
      progress.value = withTiming(1, { duration: EMPTY_FADE_MS, easing: EMPTY_EASE });
    };

    const goNext = () => {
      if (cancelled) {
        return;
      }
      setIndex((value) => (value + 1) % templates.length);
      playAppear();
      timer = setTimeout(startCycle, EMPTY_HOLD_MS + EMPTY_FADE_MS);
    };

    const startCycle = () => {
      if (cancelled) {
        return;
      }

      progress.value = withTiming(0, { duration: EMPTY_FADE_MS, easing: EMPTY_EASE }, (finished) => {
        if (finished) {
          runOnJS(goNext)();
        }
      });
    };

    // Soft opening halo on first paint
    halo.value = 0;
    halo.value = withTiming(1, {
      duration: EMPTY_HALO_MS,
      easing: Easing.out(Easing.cubic),
    });
    timer = setTimeout(startCycle, EMPTY_HOLD_MS);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [halo, progress, templates.length]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.92 + progress.value * 0.08 },
      { translateY: (1 - progress.value) * 10 },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.34 * (1 - halo.value * 0.92),
    transform: [{ scale: 0.72 + halo.value * 0.78 }],
  }));

  const haloAStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.5 * (1 - halo.value),
    transform: [{ scale: 0.76 + halo.value * 0.7 }],
  }));

  const haloBStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.32 * (1 - Math.min(halo.value * 1.12, 1)),
    transform: [{ scale: 0.88 + halo.value * 0.92 }],
  }));

  if (!current) {
    return null;
  }

  const gradientEnd = current.gradientEnd || current.accentColor;

  return (
    <View style={styles.emptyShowcase}>
      <Text style={styles.emptyShowcaseLabel}>{showcaseLabel}</Text>

      <View style={styles.emptyArt}>
        <Animated.View
          style={[
            styles.emptyGlow,
            { backgroundColor: current.accentColor },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.emptyHalo,
            { borderColor: current.accentColor },
            haloAStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.emptyHalo,
            styles.emptyHaloSoft,
            { borderColor: current.accentColor },
            haloBStyle,
          ]}
        />

        <Animated.View
          style={[styles.emptyIconWrap, contentStyle]}
          renderToHardwareTextureAndroid
          needsOffscreenAlphaCompositing
        >
          <LinearGradient
            colors={[current.accentColor, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyIcon}
          >
            <TemplateIconView icon={current.icon} size={26} color="#ffffff" />
          </LinearGradient>
          <Text style={[styles.emptyTypeTitle, { color: current.accentColor }]}>
            {current.title}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
      gap: 8,
    },
    containerTablet: {
      width: '100%',
      maxWidth: 1040,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 24,
      gap: 18,
    },
    tabletScreen: {
      flex: 1,
    },
    tabletBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      minHeight: 0,
    },
    tabletSidebar: {
      width: 320,
      flexShrink: 0,
    },
    tabletMain: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      alignSelf: 'stretch',
    },
    tabletPanel: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
      ...AppDesign.cardShadow,
    },
    tabletDocsPanel: {
      width: '100%',
      alignSelf: 'flex-start',
    },
    tabletDocsScrollContent: {
      paddingBottom: 4,
    },
    tabletTools: {
      borderRadius: AppDesign.radius.lg,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    tabletDocsList: {
      gap: 8,
    },
    listHeaderTablet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 2,
      paddingBottom: 2,
      flexShrink: 0,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    },
    brandBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandMark: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      ...AppDesign.cardShadow,
    },
    brandText: {
      flex: 1,
      gap: 2,
    },
    brandName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    brandMeta: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...AppDesign.cardShadow,
    },
    createShell: {
      borderRadius: AppDesign.radius.xl,
      overflow: 'hidden',
      ...AppDesign.shadow,
    },
    createGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      minHeight: 80,
    },
    createGradientTablet: {
      gap: 10,
      paddingVertical: 18,
      paddingHorizontal: 16,
      minHeight: 132,
    },
    createTabletTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    createIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    createTextWrap: {
      flex: 1,
      gap: 3,
    },
    createTitle: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
    },
    createSubtitle: {
      color: 'rgba(255,255,255,0.86)',
      fontSize: 12,
      lineHeight: 17,
    },
    toolsCard: {
      backgroundColor: colors.backgroundSoft,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...AppDesign.cardShadow,
    },
    toolsDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 68,
    },
    tabletToolsDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 14,
    },
    quickAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 64,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    quickLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    quickIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickText: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    quickTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    quickSubtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 3,
      paddingHorizontal: 4,
    },
    listTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    countChip: {
      minWidth: 30,
      height: 30,
      paddingHorizontal: 10,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    countChipText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
      paddingLeft: 10,
      paddingRight: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    viewAllPressed: {
      opacity: 0.75,
      backgroundColor: colors.primarySoft,
    },
    viewAllText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    viewAllCount: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 5,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    viewAllCountText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    emptyState: {
      marginVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 28,
      paddingHorizontal: 18,
      alignItems: 'center',
      gap: 10,
      ...AppDesign.cardShadow,
    },
    emptyStateTablet: {
      minHeight: 220,
      justifyContent: 'center',
      marginVertical: 0,
      paddingVertical: 28,
      borderWidth: 0,
      backgroundColor: colors.backgroundSoft,
      shadowOpacity: 0,
      elevation: 0,
    },
    emptyShowcase: {
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    emptyShowcaseLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    emptyArt: {
      width: '100%',
      height: 124,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyGlow: {
      position: 'absolute',
      width: 70,
      height: 70,
      borderRadius: 35,
      top: 12,
    },
    emptyHalo: {
      position: 'absolute',
      width: 78,
      height: 78,
      borderRadius: 39,
      borderWidth: 2,
      top: 8,
      backgroundColor: 'transparent',
    },
    emptyHaloSoft: {
      borderWidth: 1.5,
    },
    emptyIconWrap: {
      alignItems: 'center',
      gap: 8,
      zIndex: 2,
      backgroundColor: 'transparent',
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      // No elevation/shadow here: Android paints a gray square when
      // opacity is animated on views with elevation.
    },
    emptyTypeTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
    list: {
      gap: 8,
    },
  });
}
