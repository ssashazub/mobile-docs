export type ExportFileNameFormat = 'title' | 'title_date' | 'date_title' | 'id_title';

export type ExportFolderMode = 'app' | 'custom';

export type AppSettings = {
  exportFolderMode: ExportFolderMode;
  /** SAF / picked directory URI when mode is `custom` */
  customExportFolderUri: string | null;
  /** Short label for UI (folder name) */
  customExportFolderLabel: string | null;
  fileNameFormat: ExportFileNameFormat;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  exportFolderMode: 'app',
  customExportFolderUri: null,
  customExportFolderLabel: null,
  fileNameFormat: 'title',
};

export const FILE_NAME_FORMATS: ExportFileNameFormat[] = [
  'title',
  'title_date',
  'date_title',
  'id_title',
];
