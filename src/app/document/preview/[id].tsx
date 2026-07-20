import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getDocuments } from '@/lib/document-storage';
import {
  prepareDocumentPdf,
  printPreparedPdf,
  sharePreparedPdf,
  type PreparedPdfExport,
} from '@/lib/export-pdf';
import type { Document } from '@/types/document';

function parseDocumentId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const parsedId = Number(rawId);

  if (!rawId || Number.isNaN(parsedId)) {
    return null;
  }

  return parsedId;
}

function withPreviewChrome(html: string): string {
  // Keep preview as print paper: WebView may auto-darken pages in app dark mode.
  // Fill the available preview width while keeping A4 portrait proportions.
  const chrome = `
    <meta name="color-scheme" content="light" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3" />
    <style>
      :root { color-scheme: light only; }
      html, body {
        color-scheme: light only !important;
        background: #e8ecf8 !important;
        width: 100% !important;
        max-width: none !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        /* Print HTML zooms for Android A4; preview must stay unscaled. */
        zoom: 1 !important;
      }
      body {
        color: #0f172a !important;
        padding: 0 !important;
      }
      .page-shell {
        width: 100% !important;
      }
      .page {
        width: 100% !important;
        max-width: none !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 0 !important;
        padding: 20px 18px 24px !important;
        background: #ffffff !important;
        color: #0f172a !important;
        border-radius: 0;
        box-shadow: none;
        overflow: visible;
        box-sizing: border-box !important;
        display: block !important;
      }
      .page-main {
        width: 100% !important;
      }
      .footer {
        margin-top: 28px !important;
      }
      .header-title, .header-meta, .footer,
      .section-body, .field-label, .field-value,
      .grid-value, .card-value, .column-value {
        color: inherit;
      }
      .header-title { color: #0f172a !important; }
      .header-meta { color: #64748b !important; }
      .footer { color: #94a3b8 !important; }
      .section-body, .field-value,
      .grid-value, .card-value, .column-value { color: #334155 !important; }
      .field-label { color: #94a3b8 !important; }
      .fields-table td {
        background: #ffffff !important;
        color: #0f172a !important;
        border-color: #cbd5e1 !important;
      }
      .fields-table .label {
        background: #f8fafc !important;
        color: #334155 !important;
      }
      .fields-table .value {
        background: #ffffff !important;
        color: #0f172a !important;
      }
      .grid-item, .card-item, .column-item {
        background: #ffffff !important;
      }
      .hero-gradient, .hero-solid, .hero-banner { color: #ffffff !important; }
      .hero-title, .hero-meta, .hero-kicker { color: #ffffff !important; }
    </style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${chrome}</head>`);
  }

  return `<!DOCTYPE html><html><head>${chrome}</head><body>${html}</body></html>`;
}

export default function DocumentPdfPreviewScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = parseDocumentId(id);

  const [document, setDocument] = useState<Document | null>(null);
  const [prepared, setPrepared] = useState<PreparedPdfExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'share' | 'print' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (documentId === null) {
      setError(t('document.notFound'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPrepared(null);

    try {
      const documents = await getDocuments();
      const found = documents.find((item) => item.id === documentId);

      if (!found) {
        setError(t('document.notFound'));
        return;
      }

      setDocument(found);
      const next = await prepareDocumentPdf(found);
      setPrepared(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('pdf.generateFailed'));
    } finally {
      setLoading(false);
    }
  }, [documentId, t]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const handleShare = async () => {
    if (!prepared) {
      return;
    }

    setBusy('share');
    try {
      await sharePreparedPdf(prepared);
    } catch (shareError) {
      Alert.alert(
        t('document.exportError'),
        shareError instanceof Error ? shareError.message : t('pdf.generateFailed')
      );
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    if (!prepared) {
      return;
    }

    setBusy('print');
    try {
      await printPreparedPdf(prepared);
    } catch (printError) {
      // User dismissed the print sheet - not an error worth alerting.
      if (printError instanceof Error && /cancel|dismiss|closed/i.test(printError.message)) {
        return;
      }
      Alert.alert(
        t('document.exportError'),
        printError instanceof Error ? printError.message : t('pdf.printFailed')
      );
    } finally {
      setBusy(null);
    }
  };

  const webSource = useMemo(() => {
    if (!prepared) {
      return null;
    }

    if (prepared.previewHtml) {
      return { html: withPreviewChrome(prepared.previewHtml) };
    }

    return { uri: prepared.uri };
  }, [prepared]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('document.previewTitle'),
          headerBackTitle: t('common.back'),
        }}
      />

      <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {loading ? (
          <View style={styles.centered}>
            <LoadingState label={t('document.exportingPdf')} />
          </View>
        ) : error || !prepared || !document ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error ?? t('document.notFound')}</Text>
            <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
            {documentId !== null ? (
              <PrimaryButton label={t('document.previewRetry')} onPress={loadPreview} />
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.previewShell}>
              <View style={styles.previewMeta}>
                <SymbolView
                  name={{ ios: 'doc.text.magnifyingglass', android: 'preview', web: 'preview' }}
                  size={16}
                  tintColor={colors.primary}
                  weight="semibold"
                />
                <Text style={styles.previewMetaText} numberOfLines={1}>
                  {document.title}
                </Text>
              </View>

              <View style={styles.webWrap}>
                {webSource ? (
                  <WebView
                    source={webSource}
                    originWhitelist={['*']}
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    setSupportMultipleWindows={false}
                    forceDarkOn={false}
                    style={styles.webview}
                    startInLoadingState
                    renderLoading={() => (
                      <View style={styles.webLoading}>
                        <LoadingState />
                      </View>
                    )}
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={handlePrint}
                disabled={busy !== null}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  (pressed || busy === 'print') && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: 'printer.fill', android: 'print', web: 'print' }}
                  size={18}
                  tintColor={colors.primary}
                  weight="semibold"
                />
                <Text style={styles.secondaryActionText}>
                  {busy === 'print' ? t('document.printingPdf') : t('document.printPdf')}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleShare}
                disabled={busy !== null}
                style={({ pressed }) => [
                  styles.primaryAction,
                  (pressed || busy === 'share') && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                  size={18}
                  tintColor="#ffffff"
                  weight="semibold"
                />
                <Text style={styles.primaryActionText}>
                  {busy === 'share' ? t('document.sharingPdf') : t('document.sharePdf')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 0,
      gap: 10,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 24,
    },
    errorText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    previewShell: {
      flex: 1,
      borderRadius: 0,
      borderWidth: 0,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    previewMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.backgroundSoft,
    },
    previewMetaText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    webWrap: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    webview: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    webLoading: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
    },
    secondaryAction: {
      flex: 1,
      minHeight: 52,
      borderRadius: AppDesign.radius.md,
      borderWidth: 1.5,
      borderColor: colors.templatesBorder,
      backgroundColor: colors.primarySoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    secondaryActionText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 15,
    },
    primaryAction: {
      flex: 1.15,
      minHeight: 52,
      borderRadius: AppDesign.radius.md,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
      ...AppDesign.shadow,
    },
    primaryActionText: {
      color: '#ffffff',
      fontWeight: '800',
      fontSize: 15,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
  });
}
