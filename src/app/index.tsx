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
import { type Href, Stack, router, useFocusEffect } from 'expo-router';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ui/action-sheet';
import { showAppAlert } from '@/components/ui/app-alert';
import { DocumentCard } from '@/components/document-card';
import { DocumentSearchBar } from '@/components/document-search-bar';
import { TemplateIconView } from '@/components/template-icon-view';
import { AppDesign, AppGradients } from '@/constants/app-design';
import { Colors, type ThemeColors } from '@/constants/theme';
import { getBuiltinTemplates } from '@/core/templates/registry';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { resolveTemplateForDocument } from '@/lib/document-display';
import { filterDocumentsByQuery } from '@/lib/document-search';
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
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [importing, setImporting] = useState(false);
  const [tabletMainHeight, setTabletMainHeight] = useState(0);
  const [docsHeaderHeight, setDocsHeaderHeight] = useState(0);
  const [docsContentHeight, setDocsContentHeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [documents]
  );
  const isSearching = searchQuery.trim().length > 0;
  const filteredDocuments = useMemo(
    () => filterDocumentsByQuery(sortedDocuments, searchQuery),
    [searchQuery, sortedDocuments]
  );
  const recentDocuments = useMemo(() => {
    if (isSearching) {
      return filteredDocuments;
    }
    return layout.isTablet ? sortedDocuments : sortedDocuments.slice(0, 3);
  }, [filteredDocuments, isSearching, layout.isTablet, sortedDocuments]);
  const hasMoreDocuments =
    !isSearching && documents.length > (layout.isTablet ? 9 : 3);
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
      router.push(`/document/import-choice/${document.id}`);
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
      <LinearGradient
        colors={AppGradients.brand}
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

      <ScalePressable
        onPress={() => router.push('/settings' as Href)}
        style={styles.iconButton}
      >
        <SymbolView
          name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
          size={20}
          tintColor={colors.primary}
          weight="semibold"
        />
      </ScalePressable>
    </Animated.View>
  );

  const headerGradientColors =
    colors.background === Colors.dark.background
      ? (['#05050a', '#16122a', '#4a3390', '#2a1f55', '#14122a', colors.background] as const)
      : (['#7c6cf0', '#9b87f5', '#c4b5fd', '#ddd6fe', '#eef1ff', colors.background] as const);

  const actionRail = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.actionRailContent}
      style={styles.actionRail}
    >
      <ActionTile
        title={t('home.actionImport')}
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
      <ActionTile
        title={t('home.actionCreate')}
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        accent="#fff"
        soft={colors.primary}
        gradient
        onPress={() => router.push('/create' as Href)}
        styles={styles}
        colors={colors}
      />
      <ActionTile
        title={t('home.actionTemplates')}
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
    </ScrollView>
  );


  const documentsHeader = (
    <View
      style={styles.listHeaderTablet}
      onLayout={(event) => {
        setDocsHeaderHeight(event.nativeEvent.layout.height);
      }}
    >
      <View style={styles.listHeaderTop}>
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
            <Text style={styles.countChipText}>
              {isSearching ? filteredDocuments.length : documents.length}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const documentsList = (
    <>
      {documents.length === 0 ? (
        <ScalePressable
          onPress={() => router.push('/create' as Href)}
          style={[styles.emptyState, styles.emptyStateTablet]}
        >
          <EmptyDocumentsArt
            styles={styles}
            locale={locale}
            showcaseLabel={t('home.emptyShowcase')}
          />
          <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('home.emptyText')}</Text>
        </ScalePressable>
      ) : recentDocuments.length === 0 ? (
        <View style={[styles.emptyState, styles.emptyStateTablet]}>
          <View style={styles.searchEmptyIcon}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={28}
              tintColor={colors.onPrimaryContainer}
            />
          </View>
          <Text style={styles.emptyTitle}>{t('home.searchEmptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('home.searchEmptyText')}</Text>
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
      <Stack.Screen options={{ headerShown: false }} />
      {layout.isTablet ? (
        <View style={[styles.container, styles.containerTablet, styles.tabletScreen]}>
          <View style={[styles.tabletHeaderHero, { paddingTop: Math.max(insets.top, 12) }]}>
            <LinearGradient
              colors={headerGradientColors}
              locations={[0, 0.1, 0.32, 0.52, 0.78, 1]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={styles.headerGradientFill}
            />
            <Animated.View entering={FadeInDown.duration(420).springify()} style={styles.tabletTopBar}>
              <LinearGradient
                colors={AppGradients.brand}
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

              <View style={styles.tabletHeaderMeta}>
                <Text style={styles.tabletHeaderTitle}>Mobile Docs</Text>
                <Text style={styles.tabletHeaderCount}>
                  {documents.length} {pluralDocuments(documents.length)}
                  {' · '}
                  {templates.length} {t('home.actionTemplates').toLocaleLowerCase()}
                </Text>
              </View>

              <View style={styles.tabletHeaderSearch}>
                <DocumentSearchBar value={searchQuery} onChangeText={setSearchQuery} />
              </View>

              <ScalePressable
                onPress={() => router.push('/settings' as Href)}
                style={styles.iconButton}
              >
                <SymbolView
                  name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
                  size={20}
                  tintColor={colors.primary}
                  weight="semibold"
                />
              </ScalePressable>
            </Animated.View>
          </View>

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
                    colors={AppGradients.brand}
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
                  keyboardShouldPersistTaps="handled"
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
        contentContainerStyle={[styles.containerPhone, layout.listContentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerHero}>
          <LinearGradient
            colors={headerGradientColors}
            locations={[0, 0.1, 0.32, 0.52, 0.78, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.headerGradientFill}
          />
          <View style={[styles.phonePad, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
            {brandBar}

            {documents.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(40).duration(400).springify()}>
                <DocumentSearchBar value={searchQuery} onChangeText={setSearchQuery} />
              </Animated.View>
            ) : null}

            <Animated.View
              entering={FadeInDown.delay(80).duration(450).springify()}
              style={styles.greeting}
            >
              <Text style={styles.greetingTitle}>Mobile Docs</Text>
              <Text style={styles.greetingMeta}>
                {documents.length} {pluralDocuments(documents.length)}
                {' · '}
                {templates.length} {t('home.actionTemplates').toLocaleLowerCase()}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(450).springify()}>
              {actionRail}
            </Animated.View>
          </View>

          <Animated.View
            entering={FadeInDown.delay(180).duration(480).springify()}
            style={styles.docsSheet}
          >
            <View style={styles.listHeaderTop}>
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
                  <Text style={styles.countChipText}>
                    {isSearching ? filteredDocuments.length : documents.length}
                  </Text>
                </View>
              ) : null}
            </View>

            {documents.length === 0 ? (
              <ScalePressable
                onPress={() => router.push('/create' as Href)}
                style={styles.emptyState}
              >
                <EmptyDocumentsArt
                  styles={styles}
                  locale={locale}
                  showcaseLabel={t('home.emptyShowcase')}
                />
                <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
                <Text style={styles.emptyText}>{t('home.emptyText')}</Text>
              </ScalePressable>
            ) : recentDocuments.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.searchEmptyIcon}>
                  <SymbolView
                    name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                    size={28}
                    tintColor={colors.onPrimaryContainer}
                  />
                </View>
                <Text style={styles.emptyTitle}>{t('home.searchEmptyTitle')}</Text>
                <Text style={styles.emptyText}>{t('home.searchEmptyText')}</Text>
              </View>
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
          </Animated.View>
        </View>
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

function ActionTile({
  title,
  icon,
  accent,
  soft,
  softDark,
  gradient,
  loading,
  onPress,
  styles,
  colors,
}: {
  title: string;
  icon: IconName;
  accent: string;
  soft: string;
  softDark?: string;
  gradient?: boolean;
  loading?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const softBg = colors.background === Colors.dark.background && softDark ? softDark : soft;

  return (
    <ScalePressable onPress={onPress} disabled={loading} style={styles.actionTile}>
      {loading ? (
        <View style={styles.actionTileLoading}>
          <ActivityIndicator color={accent} />
        </View>
      ) : gradient ? (
        <LinearGradient
          colors={AppGradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionTileGradient}
        >
          <View style={[styles.actionTileIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <SymbolView name={icon} size={20} tintColor="#fff" weight="bold" />
          </View>
          <Text style={[styles.actionTileTitle, { color: '#fff' }]} numberOfLines={1}>
            {title}
          </Text>
        </LinearGradient>
      ) : (
        <View style={[styles.actionTileInner, { backgroundColor: colors.surface }]}>
          <View style={[styles.actionTileIcon, { backgroundColor: softBg }]}>
            <SymbolView name={icon} size={20} tintColor={accent} />
          </View>
          <Text style={[styles.actionTileTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </ScalePressable>
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
    <ScalePressable onPress={onPress} disabled={loading} style={styles.quickAction}>
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
  const isDark = colors.background === Colors.dark.background;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerHero: {
      position: 'relative',
      overflow: 'hidden',
      flexGrow: 1,
    },
    tabletHeaderHero: {
      position: 'relative',
      overflow: 'hidden',
      marginHorizontal: -24,
      marginTop: -12,
      paddingHorizontal: 24,
      paddingBottom: 18,
      gap: 14,
      marginBottom: 2,
    },
    tabletTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap',
    },
    tabletHeaderMeta: {
      flexShrink: 0,
      gap: 2,
      minWidth: 140,
    },
    tabletHeaderTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    tabletHeaderCount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabletHeaderSearch: {
      flex: 1,
      minWidth: 220,
    },
    headerGradientFill: {
      ...StyleSheet.absoluteFill,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
      gap: 8,
    },
    containerPhone: {
      flexGrow: 1,
      paddingTop: 0,
      paddingBottom: 0,
      gap: 0,
    },
    phonePad: {
      paddingHorizontal: 20,
      paddingBottom: 36,
      gap: 14,
    },
    containerTablet: {
      width: '100%',
      maxWidth: 1040,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 24,
      gap: 16,
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
      backgroundColor: isDark ? colors.surface : colors.backgroundSoft,
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
      gap: 10,
      paddingHorizontal: 2,
      paddingBottom: 2,
      flexShrink: 0,
    },
    listHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchEmptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryContainer,
      marginBottom: 12,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    },
    brandMark: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      ...AppDesign.cardShadow,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...AppDesign.cardShadow,
    },
    greeting: {
      gap: 4,
      paddingTop: 2,
    },
    greetingTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.6,
    },
    greetingMeta: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionRail: {
      marginHorizontal: -20,
    },
    actionRailContent: {
      paddingHorizontal: 20,
      gap: 10,
    },
    actionTile: {
      width: 132,
      borderRadius: AppDesign.radius.lg,
      overflow: 'hidden',
      ...AppDesign.cardShadow,
    },
    actionTileInner: {
      minHeight: 108,
      padding: 14,
      gap: 14,
      justifyContent: 'space-between',
      borderRadius: AppDesign.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    actionTileGradient: {
      minHeight: 108,
      padding: 14,
      gap: 14,
      justifyContent: 'space-between',
      borderRadius: AppDesign.radius.lg,
    },
    actionTileIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTileTitle: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    actionTileLoading: {
      minHeight: 108,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    docsSheet: {
      marginTop: -20,
      flexGrow: 1,
      // Light: slightly tinted sheet so white cards stand out; dark: keep low surface.
      backgroundColor: isDark ? colors.surfaceContainerLow : colors.backgroundSoft,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      gap: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...AppDesign.cardShadow,
    },
    createShell: {
      borderRadius: AppDesign.radius.xl,
      overflow: 'hidden',
      ...AppDesign.shadow,
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
      marginVertical: 4,
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
