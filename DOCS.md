# Mobile Docs - документация проекта

Краткий путеводитель: где что лежит, за что отвечает и куда лезть при правках.  
Описаны только **прикладные** файлы приложения (без системных/шаблонных файлов Expo).

---

## Что делает приложение

1. **Документы** - создаёшь по шаблону, заполняешь поля, смотришь превью, редактируешь, печатаешь / сохраняешь / шаришь PDF.
2. **Шаблоны** - встроенные (Договор, Рахунок, Звіт, Акт) + свои кастомные. Настраиваются поля, иконка, цвет, вид PDF.
3. **Локализация** - украинский, русский, английский (система или вручную в настройках).
4. **Тема** - светлая / тёмная / как на устройстве (в настройках).
5. **Импорт PDF** - свои документы и сторонние PDF-формы (поля, checkbox, radio).
6. **Настройки** - язык, тема, вибрация, папка экспорта, формат имени файла, очистка, About.
7. **Хранение** - всё локально в AsyncStorage (+ файлы PDF в файловой системе устройства).

---

## Навигация (маршруты)

| Маршрут | Файл | Что видит пользователь |
|---------|------|------------------------|
| `/` | `src/app/index.tsx` | Главная: создать / импорт / шаблоны, последние документы, настройки |
| `/documents` | `src/app/documents/index.tsx` | Библиотека всех документов |
| `/create` | `src/app/create/index.tsx` | Шаг 1: выбор шаблона |
| `/create/[templateId]` | `src/app/create/[templateId].tsx` | Шаг 2: поля + вид PDF → превью |
| `/document/[id]` | `src/app/document/[id].tsx` | Просмотр полей документа |
| `/document/edit/[id]` | `src/app/document/edit/[id].tsx` | Редактирование документа + вид PDF |
| `/document/preview/[id]` | `src/app/document/preview/[id].tsx` | Превью PDF: Save PDF / More |
| `/templates` | `src/app/templates/index.tsx` | Список всех шаблонов |
| `/templates/create` | `src/app/templates/create.tsx` | Создание своего шаблона |
| `/templates/edit/[id]` | `src/app/templates/edit/[id].tsx` | Редактирование шаблона |
| `/pdf-styles` | `src/app/pdf-styles/index.tsx` | Сохранённые PDF-стили |
| `/settings` | `src/app/settings/index.tsx` | Настройки |
| `/settings/privacy` | `src/app/settings/privacy.tsx` | Политика конфиденциальности |
| `/settings/terms` | `src/app/settings/terms.tsx` | Условия пользования |

Общая навигация, splash и провайдеры: `src/app/_layout.tsx`

---

## Структура папок

```
src/
├── app/                  # Экраны (Expo Router - файл = маршрут)
├── core/                 # ★ Ядро: шаблоны и PDF (без UI)
├── components/           # UI-компоненты
├── constants/            # Константы, дефолты, дизайн, layout
├── contexts/             # Тема, язык, app settings
├── hooks/                # React-хуки приложения
├── i18n/                 # Переводы uk / ru / en
├── lib/                  # Логика: хранение, импорт, экспорт, хелперы
└── types/                # TypeScript-типы
```

---

## Ядро (`src/core/`) - главное для разработки шаблонов

Ядро отделено от экранов и AsyncStorage. Здесь описываются **встроенные шаблоны** и **сборка PDF**.  
Экраны и `lib/*` только вызывают API ядра.

```
src/core/
├── index.ts                    # Публичный API (re-export)
├── templates/
│   ├── types.ts                # BuiltinTemplateDefinition, TemplateFieldDefinition
│   ├── field-def.ts            # defineField(), resolveTemplateFields(), CommonFieldKeys
│   ├── registry.ts             # buildBuiltinTemplate(), getBuiltinTemplates()
│   ├── definitions/
│   │   ├── index.ts            # BUILTIN_TEMPLATE_DEFINITIONS - реестр
│   │   ├── contract.ts         # Один файл = один встроенный шаблон
│   │   ├── invoice.ts
│   │   ├── report.ts
│   │   └── act.ts
│   └── index.ts
└── pdf/
    ├── html.ts                 # escapeHtml, formatFieldValue, wrapPdfPage
    ├── styles.ts               # buildPdfStyles(design)
    ├── render.ts               # renderDocumentPdfHtml() - оркестратор
    ├── parts/
    │   ├── header.ts           # renderPdfHeader()
    │   ├── fields.ts           # renderPdfFields() - sections/list/table/cards/columns
    │   └── footer.ts           # renderPdfFooter()
    └── index.ts
```

### Импорт из ядра

```typescript
import {
  defineField,
  getBuiltinTemplates,
  BUILTIN_TEMPLATE_DEFINITIONS,
  renderDocumentPdfHtml,
  renderPdfHeader,
  buildPdfStyles,
} from '@/core';
```

Старые пути (`constants/default-templates.ts`, `lib/pdf-templates.ts`) оставлены как тонкие обёртки для совместимости.

---

## Как добавить новый встроенный шаблон (пошагово)

### 1. Создайте файл определения

`src/core/templates/definitions/offer.ts`:

```typescript
import { defineField } from '@/core/templates/field-def';
import type { BuiltinTemplateDefinition } from '@/core/templates/types';

export const offerDefinition: BuiltinTemplateDefinition = {
  id: 'offer',                    // уникальный id (латиница)
  emoji: '📋',
  accentColor: '#4f46e5',
  gradientEnd: '#6366f1',
  locales: {
    uk: { title: 'Комерційна пропозиція' },
    ru: { title: 'Коммерческое предложение' },
    en: { title: 'Commercial offer' },
  },
  fields: [
    defineField('title', {
      uk: { label: 'Назва', placeholder: 'Пропозиція для клієнта' },
      ru: { label: 'Название', placeholder: 'Предложение для клиента' },
      en: { label: 'Title', placeholder: 'Offer for client' },
    }, { required: true }),
    defineField('client', {
      uk: { label: 'Клієнт', placeholder: 'ТОВ «Компанія»' },
      ru: { label: 'Клиент', placeholder: 'ООО «Компания»' },
      en: { label: 'Client', placeholder: 'Company LLC' },
    }, { required: true }),
    defineField('amount', {
      uk: { label: 'Сума', placeholder: '10 000' },
      ru: { label: 'Сумма', placeholder: '10 000' },
      en: { label: 'Amount', placeholder: '10,000' },
    }, { kind: 'number' }),
    defineField('validUntil', {
      uk: { label: 'Дійсна до', placeholder: '07.06.2026' },
      ru: { label: 'Действует до', placeholder: '07.06.2026' },
      en: { label: 'Valid until', placeholder: '07.06.2026' },
    }, { kind: 'date' }),
  ],
};
```

### 2. Зарегистрируйте в реестре

`src/core/templates/definitions/index.ts`:

```typescript
import { offerDefinition } from '@/core/templates/definitions/offer';

export const BUILTIN_TEMPLATE_DEFINITIONS = [
  contractDefinition,
  invoiceDefinition,
  reportDefinition,
  actDefinition,
  offerDefinition,   // ← добавить
];
```

### 3. (Опционально) Дефолтный PDF-стиль

`src/constants/pdf-layouts.ts` → `BUILTIN_PDF_STYLES`:

```typescript
offer: { layout: 'modern' },
```

### 4. (Опционально) Название в переводах

`src/i18n/locales/uk.ts` → `templateNames.offer = 'Комерційна пропозиція'` (и ru/en).

### 5. Проверка

```bash
npx tsc --noEmit
```

После перезапуска приложения шаблон появится в списке (встроенные всегда подмешиваются из ядра).

---

## API полей шаблона (`defineField`)

| Параметр | Описание |
|----------|----------|
| `key` | Стабильный ключ поля (`title`, `client`, `amount`…) |
| `locales` | Подписи и placeholder для `uk`, `ru`, `en` |
| `required` | Обязательное при создании документа |
| `multiline` | Многострочный ввод |
| `kind` | `text` \| `date` \| `number` \| `email` \| `phone` - валидация |

Константа `CommonFieldKeys` в `field-def.ts` - список типичных ключей для единообразия.

**Валидация в UI:** при ошибке поле подсвечивается красной рамкой, экран скроллится к нему и трясётся (`useFieldFocusOnError`). Дата в формате `ДД.ММ.ГГГГ` (например `07.06.2026`).

---

## PDF-ядро: как устроена сборка

```
Document + DocumentTemplate
       ↓
normalizePdfStyle() + resolvePdfDesign()   (lib/pdf-style-resolver.ts)
       ↓
renderDocumentPdfHtml()                  (core/pdf/render.ts)
  ├── buildPdfStyles(design)             (core/pdf/styles.ts)
  ├── renderPdfHeader(...)               (core/pdf/parts/header.ts)
  ├── renderPdfFields(...)               (core/pdf/parts/fields.ts)
  └── renderPdfFooter(...)               (core/pdf/parts/footer.ts)
       ↓
wrapPdfPage() → HTML
       ↓
export-pdf.ts → expo-print → PDF
```

### Варианты заголовка (`headerStyle`)
`gradient` · `solid` · `banner` · `sidebar` · `line` · `minimal`

### Варианты полей (`fieldsStyle`)
`sections` · `list` · `table` · `cards` · `columns`

Пресеты макетов (`classic`, `modern`, …) задают комбинацию header + fields в `constants/pdf-layouts.ts` → `LAYOUT_DESIGN_PRESETS`.

### Как добавить новый стиль полей в PDF

1. Добавьте вариант в тип `PdfFieldsStyle` (`types/pdf-style-design.ts`)
2. Реализуйте рендер в `core/pdf/parts/fields.ts`
3. Добавьте CSS в `core/pdf/styles.ts`
4. Добавьте опцию в конструктор (`components/pdf-style-constructor.tsx`) и i18n

### Как добавить новый стиль заголовка

Аналогично: `PdfHeaderStyle` → `core/pdf/parts/header.ts` → `styles.ts` → UI.

---

## Шаблон нового встроенного шаблона (копипаст)

Скопируйте `definitions/contract.ts`, переименуйте `id`, цвета, поля.  
Минимальный чеклист:

- [ ] Файл в `core/templates/definitions/`
- [ ] Запись в `definitions/index.ts`
- [ ] Уникальный `id`
- [ ] Локали `uk`, `ru`, `en` для title и каждого поля
- [ ] `kind: 'date'` / `'number'` где нужна валидация
- [ ] `npx tsc --noEmit`

---

## Экраны - `src/app/`

### `index.tsx` - главная
- Карточки действий: создать документ, импорт PDF, шаблоны.
- Кнопка настроек (Material-иконка).
- Телефон: до **3** последних документов; кнопка «Смотреть все» если больше 3.
- Планшет: все документы в колонке; «Смотреть все» если не влезают по высоте.
- Долгое нажатие → ActionSheet (открыть / редактировать / удалить).
- Пустое состояние: анимация иконок типов документов.
- **Править:** компактность карточек, сетку планшета, empty-state.

### `documents/index.tsx` - библиотека документов
- Полный список документов (новые сверху).
- То же долгое нажатие и действия, что на главной.
- **Править:** сортировку, пустое состояние списка.

### `create/index.tsx` - выбор шаблона (шаг 1)
- Список шаблонов (`DocumentTypeCard`).
- Меню «⋯» (`EditorOverflowMenu`): главное меню / библиотека.
- **Править:** заголовки, подписи, список шаблонов.

### `create/[templateId].tsx` - форма нового документа (шаг 2)
- Поля формы + вид PDF (`PdfLayoutPicker`).
- Валидация + фокус на ошибочном поле.
- Guard несохранённых изменений (`useUnsavedChangesGuard`).
- После сохранения → `/document/preview/[id]`.
- **Править:** логику создания, валидацию, layout формы.

### `document/[id].tsx` - просмотр полей
- Показывает поля документа.
- Переход в редактирование / превью.
- **Править:** внешний вид карточки полей.

### `document/edit/[id].tsx` - редактирование
- Поля + вид PDF, guard при выходе с изменениями.
- Меню «⋯».
- **Править:** валидацию, сохранение.

### `document/preview/[id].tsx` - превью PDF ★
- WebView с HTML/PDF превью (на планшете — «лист» по центру).
- Кнопки: **Save PDF** (share/сохранение) и **More**.
- More: печать, Save to library → `/documents`, переименовать, редактировать.
- **Править:** набор действий, chrome превью, диалог переименования.

### `templates/index.tsx` - список шаблонов
- Встроенные + кастомные; удаление только кастомных.
- **Править:** список, кнопку создания.

### `templates/create.tsx` / `templates/edit/[id].tsx`
- Основа, название, иконка (`TemplateIconPicker`), цвет, PDF-стиль, поля.
- Для встроенных: «Скинути до стандарту».
- Меню «⋯» + guard несохранённых изменений.
- **Править:** дефолты, форму, сброс.

### `settings/index.tsx` - настройки
Секции:
- **General** — язык, тема, вибрация (haptics)
- **Export** — папка сохранения, формат имени файла
- **Storage** — очистить кеш, удалить документы
- **About** — версия, privacy, terms, feedback, rate app
- **Править:** иерархию секций, модалки выбора (`LanguagePickerModal`, `SettingsPickerModal`).

### `settings/privacy.tsx` / `settings/terms.tsx`
- Юридические тексты через `components/legal-screen.tsx`.

### `_layout.tsx` - корневой layout
- Провайдеры: тема → язык → app settings → AppAlert → Stack.
- Splash скрывается только после гидрации настроек (без мигания тёмной темы).
- Ориентация: телефон — portrait lock; планшет — unlock.
- **Править:** заголовки Stack, orientation, порядок провайдеров.

---

## Компоненты - `src/components/`

### Прикладные (наши)

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `document-card.tsx` | Карточка документа | Список на главной / в библиотеке |
| `document-type-card.tsx` | Карточка шаблона | Выбор типа документа |
| `pdf-layout-picker.tsx` | Макеты PDF + свои стили | Новый макет, выделение выбранного стиля |
| `pdf-style-constructor.tsx` | Конструктор PDF | Новые опции кастомного стиля |
| `validated-form-field.tsx` | Поле с валидацией + shake | Типы полей, красная рамка |
| `pdf-form-field.tsx` | Поле импортированной PDF-формы | Импорт PDF |
| `template-field-editor.tsx` | Редактор поля шаблона | Поля в редакторе шаблонов |
| `template-icon-picker.tsx` | Выбор иконки шаблона (symbol / emoji / none) | Набор иконок |
| `template-icon-view.tsx` | Отображение иконки шаблона | UI иконок |
| `legal-screen.tsx` | Общий layout для privacy/terms | Юридические экраны |

### UI - `src/components/ui/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `primary-button.tsx` | Основная кнопка | Стиль кнопок |
| `form-field.tsx` | Поле ввода с подписью | Стиль полей |
| `action-sheet.tsx` | Нижнее меню действий | Long-press, More на превью |
| `app-alert.tsx` | Стилизованные диалоги (`showAppAlert`) | Подтверждения, ошибки |
| `editor-overflow-menu.tsx` | Меню «⋯» в редакторах | Навигация домой / в библиотеку |
| `language-picker-modal.tsx` | Выбор языка в настройках | Список языков |
| `settings-picker-modal.tsx` | Универсальный пикер настроек | Тема, формат имени и т.д. |
| `theme-switcher.tsx` | Переключатель темы (если ещё где-то используется) | UI темы |
| `loading-state.tsx` | Экран загрузки | Превью / async экраны |

---

## Контексты - `src/contexts/`

| Файл | За что отвечает |
|------|-----------------|
| `theme-preference-context.tsx` | light / dark / system + гидрация |
| `locale-preference-context.tsx` | system / uk / ru / en |
| `app-settings-context.tsx` | папка экспорта, имя файла, haptics |

Хранение предпочтений: `lib/theme-preference-storage.ts`, `lib/locale-preference-storage.ts`, `lib/app-settings-storage.ts`.

---

## Хуки - `src/hooks/`

| Файл | За что отвечает |
|------|-----------------|
| `use-i18n.ts` | `t()`, `pluralDocuments()`, текущая локаль |
| `use-theme.ts` | Цвета текущей темы |
| `use-layout.ts` | Телефон / планшет, колонки, `contentStyle` / `gridStyle` |
| `use-unsaved-changes-guard.ts` | Диалог «Сохранить изменения?» при уходе |
| `use-field-focus-on-error.ts` | Скролл + shake обязательного поля |
| `use-modal-sheet-animation.ts` | Анимация bottom sheets |

---

## Логика - `src/lib/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `document-storage.ts` | CRUD документов | Как сохраняются документы |
| `template-storage.ts` | CRUD шаблонов | Как сохраняются шаблоны |
| `pdf-style-storage.ts` | CRUD сохранённых PDF-стилей | Свои стили из конструктора |
| `pdf-style-resolver.ts` | Слияние пресета и design | Логика конструктора PDF |
| `field-validation.ts` | Валидация полей | Правила ввода (дата через точку и т.д.) |
| `field-validation-alert.ts` | Алерты ошибок валидации | Текст ошибок |
| `document-helpers.ts` | Сборка документа из полей | title / client / description |
| `document-display.ts` | Резолв шаблона для документа, imported-form | Карточки, превью |
| `template-helpers.ts` | Пустой шаблон, нормализация PDF-стиля | Дефолты шаблона |
| `template-icon.ts` | symbol / emoji / none хелперы | Иконки шаблонов |
| `pdf-templates.ts` | Re-export → `core/pdf/render.ts` | Совместимость |
| `export-pdf.ts` | prepare / print / share PDF | Экспорт и превью |
| `export-file-name.ts` | Имя файла по настройке | Форматы имени |
| `export-folder.ts` | Папка экспорта (app / custom SAF) | Куда писать PDF |
| `import-pdf.ts` | Импорт PDF (свой / сторонний) | Импорт форм |
| `pdf-form.ts` | Применение значений к AcroForm | Импортированные формы |
| `pdf-metadata.ts` | Метаданные в PDF | Распознавание «своих» PDF |
| `pdf-bytes.ts` | base64 ↔ bytes | Низкоуровневая работа с PDF |
| `pdf-file-storage.ts` | Файлы оригинальных PDF на диске | Хранение импортов |
| `clear-cache.ts` / `clear-documents.ts` | Очистка из настроек | Storage-секция |
| `haptics.ts` | Обёртка expo-haptics с вкл/выкл | Вибрация |
| `about-actions.ts` | Версия, feedback email, rate app | About |

---

## Типы - `src/types/`

| Файл | Содержимое |
|------|------------|
| `document.ts` | `Document` (+ `source`, `formFields`, `originalPdfUri` для импорта) |
| `template.ts` | `DocumentTemplate` с `icon: TemplateIcon`, `PdfStyle`, `PdfLayout` |
| `pdf-style-design.ts` | Design-токены конструктора PDF |
| `field-validation.ts` | `FieldInputKind`, ошибки валидации |
| `app-settings.ts` | Папка экспорта, формат имени, haptics |
| `theme-preference.ts` | `light` \| `dark` \| `system` |
| `locale-preference.ts` | `system` \| `uk` \| `ru` \| `en` |

**Править**, если добавляешь новые поля в документ/шаблон/настройки (и потом storage + экраны).

---

## Константы - `src/constants/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `storage.ts` | Ключи AsyncStorage | Новые ключи хранения |
| `default-templates.ts` | Re-export → `core/templates` | Совместимость |
| `pdf-layouts.ts` | 8 макетов, пресеты design | Новый макет / пресет |
| `template-colors.ts` | Палитра цветов шаблонов | Цвета |
| `template-icons.ts` | Пресеты Material/SF Symbol иконок | Новые иконки шаблонов |
| `app-design.ts` | Радиусы, тени UI | Глобальный вид |
| `layout.ts` | Breakpoints планшета, max widths | Адаптив |
| `theme.ts` | Палитры light/dark | Цвета темы |
| `app-info.ts` | Email feedback и т.п. | About |
| `pdf-page.ts` / `imported-pdf.ts` | Размеры страницы, константы импорта | PDF |

---

## Переводы - `src/i18n/`

| Файл | За что отвечает |
|------|-----------------|
| `index.ts` | `resolveAppLocale()`, `t()`, `pluralDocuments()`, override языка |
| `types.ts` | TypeScript-схема всех строк |
| `locales/uk.ts` | Украинские тексты |
| `locales/ru.ts` | Русские тексты |
| `locales/en.ts` | Английские тексты |

Хук: `src/hooks/use-i18n.ts` → `const { t } = useI18n()`

**Править тексты:**
1. Ключ в `types.ts`
2. Строка в `uk.ts`, `ru.ts`, `en.ts`
3. `t('section.key')` на экране

Секции: `common`, `home`, `create`, `templates`, `document`, `pdf`, `settings`, `theme`, `import`, …

---

## Хранение данных

```
AsyncStorage
├── documents            → Document[]
├── document_templates   → кастомные шаблоны (встроенные - из core)
├── pdf_styles           → сохранённые PDF-стили конструктора
├── theme_preference     → light | dark | system
├── locale_preference    → system | uk | ru | en
└── app_settings         → папка экспорта, имя файла, haptics

Файловая система
└── оригиналы импортированных PDF (pdf-file-storage)
```

- Встроенные шаблоны **не хранятся** - собираются из `core/templates/definitions/` при каждом `getTemplates()`.
- Документы хранят `templateId` + `fields` + опционально `pdfStyle` / данные импорта.
- Шаблоны хранят `fields`, `pdfStyle`, цвета, `icon` (emoji deprecated, синхронизируется для PDF).

**Не сохранять данные через `useEffect` на главной** - только через storage-модули.

---

## Настройки и предпочтения

```
Settings screen
├── General
│   ├── Language     → locale-preference-context
│   ├── Theme        → theme-preference-context
│   └── Haptics      → app_settings.hapticsEnabled → lib/haptics.ts
├── Export
│   ├── Save folder  → app | custom (SAF)
│   └── File naming  → title | title_date | date_title | id_title
├── Storage
│   ├── Clear cache
│   └── Delete documents
└── About
    ├── Version / Privacy / Terms
    └── Feedback / Rate app
```

---

## Адаптив (телефон / планшет)

- Токены: `constants/layout.ts` (`tabletMinWidth: 768`, `largeTabletMinWidth: 1024`).
- Хук: `hooks/use-layout.ts` → `isTablet`, `columns` (1/2/3), `contentStyle`, `gridStyle`.
- Ориентация (`_layout.tsx` + `expo-screen-orientation` в `app.json`):
  - телефон — lock `PORTRAIT_UP`
  - планшет — unlock (все ориентации)
- Превью PDF на планшете — центрированный «лист» (`Layout.previewPageMaxWidth`).

---

## PDF - как устроено

См. раздел **«PDF-ядро»** выше. Кратко:

- 8 пресетов макетов + кастомный конструктор + сохранённые стили
- UI: `pdf-layout-picker.tsx`, `pdf-style-constructor.tsx`
- Дефолты: `constants/pdf-layouts.ts`
- Рендер: `core/pdf/`
- Экспорт/превью: `lib/export-pdf.ts` (`prepareDocumentPdf`, `printPreparedPdf`, `sharePreparedPdf`)

---

## Где что править - шпаргалка

| Задача | Файлы |
|--------|-------|
| **Новый встроенный шаблон** | `core/templates/definitions/*.ts` → `definitions/index.ts` |
| Поля встроенного шаблона | Тот же файл definition (`defineField`) |
| Иконка шаблона | `constants/template-icons.ts`, `template-icon-picker.tsx` |
| Вид PDF (HTML/CSS) | `core/pdf/parts/*`, `core/pdf/styles.ts` |
| Новый пресет макета PDF | `constants/pdf-layouts.ts` + i18n |
| Конструктор PDF в UI | `components/pdf-style-constructor.tsx` |
| Текст на экране | `i18n/locales/{uk,ru,en}.ts`, `types.ts` |
| Цвета темы / UI | `constants/theme.ts`, `constants/app-design.ts` |
| Главная | `app/index.tsx`, `components/document-card.tsx` |
| Библиотека документов | `app/documents/index.tsx` |
| Создание документа | `app/create/*` |
| Превью / Save PDF / More | `app/document/preview/[id].tsx`, `lib/export-pdf.ts` |
| Редактирование документа | `app/document/edit/[id].tsx` |
| Шаблоны | `app/templates/*` |
| Настройки | `app/settings/*`, `contexts/*`, `types/app-settings.ts` |
| Меню «⋯» | `components/ui/editor-overflow-menu.tsx` |
| Диалоги | `components/ui/app-alert.tsx` |
| Несохранённые изменения | `hooks/use-unsaved-changes-guard.ts` |
| Валидация + shake поля | `lib/field-validation.ts`, `hooks/use-field-focus-on-error.ts` |
| Планшетный layout | `constants/layout.ts`, `hooks/use-layout.ts` |
| Ориентация экрана | `app/_layout.tsx`, `app.json` (plugin) |
| Вибрация | `lib/haptics.ts`, настройки |
| Сохранение документов | `lib/document-storage.ts` |
| Сохранение шаблонов | `lib/template-storage.ts` |
| Импорт PDF | `lib/import-pdf.ts`, `lib/pdf-form.ts` |
| Заголовки навигации | `app/_layout.tsx` + i18n |

---

## Потоки пользователя

### Создать документ
```
Главная → /create → шаблон → /create/[id] → поля + PDF
→ сохранить → /document/preview/[id]
→ Save PDF | More (печать / библиотека / переименовать / редактировать)
```

### Библиотека документов
```
Главная → «Смотреть все» (или More → Save to library)
→ /documents → открыть / редактировать / удалить
```

### Создать свой шаблон
```
Шаблоны → /templates/create → основа → иконка + поля + PDF → сохранить
→ /templates/edit/[id]
```

### Изменить встроенный шаблон
```
Шаблоны → /templates/edit/[id] → сохранить
(или «Скинути» для возврата к дефолту)
```

### Настройки
```
Главная → иконка настроек → /settings
→ язык / тема / вибрация / экспорт / очистка / about
```

### Импорт PDF
```
Главная → Импорт PDF → выбор файла → поля формы → редактирование → экспорт
```

---

## Файлы, которые можно не трогать

Системные / шаблонные файлы Expo, не относятся к логике Mobile Docs:

- `src/app/explore.tsx`
- `src/components/themed-text.tsx`, `themed-view.tsx`
- `src/components/animated-icon.*`, `app-tabs.*`, `web-badge.tsx`
- `src/components/hint-row.tsx`, `external-link.tsx`, `ui/collapsible.tsx`
- `src/hooks/use-color-scheme.*` (низкоуровнево; предпочтения темы — через context)
- `src/global.css`, `*.module.css`
- `scripts/`, `assets/`

`app.json` / `package.json` трогать только при плагинах (orientation, sharing и т.п.) или зависимостях.

Основной дизайн приложения - **`constants/app-design.ts`** + **`constants/theme.ts`**.

---

## Быстрый старт для разработки

```bash
npm install
npx expo start
```

- **Android:** `a` в терминале или `npm run android`
- **iOS:** `i` в терминале или `npm run ios`
- **Web:** `w` в терминале или `npm run web`

TypeScript-проверка: `npx tsc --noEmit`

---

## Зависимости по фичам

| Фича | Пакет |
|------|-------|
| Хранение | `@react-native-async-storage/async-storage` |
| PDF генерация / печать | `expo-print`, `expo-sharing`, `expo-file-system` |
| PDF формы / метаданные | `pdf-lib` |
| Превью HTML | `react-native-webview` |
| Импорт файла | `expo-document-picker` |
| Градиенты | `expo-linear-gradient` |
| Язык системы | `expo-localization` |
| Иконки Material / SF | `expo-symbols` |
| Вибрация | `expo-haptics` (через `lib/haptics.ts`) |
| Ориентация | `expo-screen-orientation` |
| Навигация | `expo-router` |
| Анимации | `react-native-reanimated` |
| Оценка приложения | `expo-store-review` |

---

*Документ актуален для структуры `src/` проекта mobile-docs (Expo SDK 56). Ядро: `src/core/`. Новое: настройки, превью PDF, библиотека документов, адаптив планшетов, иконки шаблонов, guards и стилизованные алерты.*
