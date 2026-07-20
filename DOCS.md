# Mobile Docs - документация проекта

Краткий путеводитель: где что лежит, за что отвечает и куда лезть при правках.  
Описаны только **прикладные** файлы приложения (без системных/шаблонных файлов Expo).

---

## Что делает приложение

1. **Документы** - создаёшь по шаблону, заполняешь поля, смотришь, редактируешь, экспортируешь PDF.
2. **Шаблоны** - встроенные (Договор, Рахунок, Звіт, Акт) + свои кастомные. Настраиваются поля, цвет, вид PDF.
3. **Локализация** - украинский, русский, английский (по языку системы).
4. **Импорт PDF** - свои документы и сторонние PDF-формы.
5. **Хранение** - всё локально в AsyncStorage на устройстве.

---

## Навигация (маршруты)

| Маршрут | Файл | Что видит пользователь |
|---------|------|------------------------|
| `/` | `src/app/index.tsx` | Главная: список документов, кнопки «Создать» и «Шаблоны» |
| `/create` | `src/app/create/index.tsx` | Шаг 1: выбор шаблона для нового документа |
| `/create/[templateId]` | `src/app/create/[templateId].tsx` | Шаг 2: поля + вид PDF + кнопка «Создать документ» |
| `/document/[id]` | `src/app/document/[id].tsx` | Просмотр документа + экспорт PDF |
| `/document/edit/[id]` | `src/app/document/edit/[id].tsx` | Редактирование документа + вид PDF |
| `/templates` | `src/app/templates/index.tsx` | Список всех шаблонов |
| `/templates/create` | `src/app/templates/create.tsx` | Создание своего шаблона |
| `/templates/edit/[id]` | `src/app/templates/edit/[id].tsx` | Редактирование шаблона |
| `/pdf-styles` | `src/app/pdf-styles/index.tsx` | Сохранённые PDF-стили |

Общая навигация и заголовки шапки: `src/app/_layout.tsx`

---

## Структура папок

```
src/
├── app/                  # Экраны (Expo Router - файл = маршрут)
├── core/                 # ★ Ядро: шаблоны и PDF (без UI)
├── components/           # UI-компоненты
├── constants/            # Константы, дефолты, дизайн
├── hooks/                # React-хуки приложения
├── i18n/                 # Переводы uk / ru / en
├── lib/                  # Логика: хранение, импорт, хелперы
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
- Загружает документы и шаблоны при каждом фокусе экрана.
- Показывает карточки документов (`DocumentCard`).
- Долгое нажатие на документ → меню (открыть / редактировать / удалить) через `ActionSheet`.
- **Править:** текст кнопок, пустое состояние, внешний вид списка.

### `create/index.tsx` - выбор шаблона (шаг 1)
- Список шаблонов (`DocumentTypeCard`).
- Кнопка «Керувати шаблонами» → `/templates`.
- **Править:** заголовки, подписи, список шаблонов.

### `create/[templateId].tsx` - форма нового документа (шаг 2)
- Загружает шаблон по `templateId`.
- Поля формы (`FormField`) из шаблона.
- Выбор вида PDF (`PdfLayoutPicker`) - сохраняется в документ.
- Сохраняет документ через `addDocument()`.
- **Править:** логику создания, валидацию обязательных полей, расположение блоков.

### `document/[id].tsx` - просмотр документа
- Показывает все поля документа.
- Кнопка «Экспорт PDF» → `exportDocumentPdf()`.
- Кнопка Edit в шапке → редактирование.
- **Править:** внешний вид карточки, кнопку экспорта.

### `document/edit/[id].tsx` - редактирование документа
- Загружает документ + шаблон.
- Редактируемые поля + вид PDF.
- Сохраняет через `updateDocument()`.
- **Править:** валидацию, поля, сохранение.

### `templates/index.tsx` - список шаблонов
- Все шаблоны (встроенные + кастомные).
- Кнопка «+ Создать шаблон».
- Удаление только кастомных шаблонов.
- **Править:** список, кнопку создания, удаление.

### `templates/create.tsx` - создание шаблона
- Выбор основы (пустой / существующий шаблон).
- Название, эмодзі, цвет.
- Вид PDF (`PdfLayoutPicker`).
- Редактор полей (`TemplateFieldEditor`).
- Сохраняет через `saveTemplate()`.
- **Править:** дефолтные поля при создании, форму, валидацию.

### `templates/edit/[id].tsx` - редактирование шаблона
- То же, что create, но для существующего шаблона.
- Для встроенных шаблонов - кнопка «Скинути до стандарту» (`resetTemplateToDefault`).
- **Править:** поля шаблона, PDF-стиль, сброс встроенных.

### `_layout.tsx` - корневой layout
- Stack-навигация, цвет шапки, заголовки основных экранов.
- **Править:** глобальные заголовки, стиль header.

---

## Компоненты - `src/components/`

### Прикладные (наши)

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `document-card.tsx` | Карточка документа на главной | Внешний вид списка на главной |
| `document-type-card.tsx` | Карточка шаблона (выбор типа) | Внешний вид при выборе шаблона |
| `pdf-layout-picker.tsx` | Выбор макета PDF (8 пресетов + конструктор + свои стили) | Новый макет, превью, сохранённые стили |
| `pdf-style-constructor.tsx` | Конструктор PDF: заголовок, поля, шрифт, цвета | Новые опции кастомного стиля |
| `validated-form-field.tsx` | Поле ввода с валидацией по типу (дата, число…) | Типы полей, фильтрация ввода |
| `pdf-form-field.tsx` | Поле импортированной PDF-формы (checkbox, radio…) | Импорт PDF |
| `template-field-editor.tsx` | Редактор одного поля шаблона | Поля в редакторе шаблонов |

### UI - `src/components/ui/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `primary-button.tsx` | Основная кнопка (primary / secondary) | Стиль кнопок по всему приложению |
| `form-field.tsx` | Поле ввода с подписью | Стиль полей в формах документов |
| `action-sheet.tsx` | Нижнее меню действий (долгое нажатие) | Меню на главной |

---

## Логика - `src/lib/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `document-storage.ts` | CRUD документов в AsyncStorage (`getDocuments`, `addDocument`, `updateDocument`, `deleteDocument`) | Как сохраняются документы |
| `template-storage.ts` | CRUD шаблонов | Как сохраняются шаблоны |
| `pdf-style-storage.ts` | CRUD сохранённых PDF-стилей | Свои стили из конструктора |
| `pdf-style-resolver.ts` | Слияние пресета макета и кастомного design | Логика конструктора PDF |
| `field-validation.ts` | Валидация полей (дата, число, email…) | Правила ввода |
| `document-helpers.ts` | Сборка документа из полей | Логика title/client/description |
| `template-helpers.ts` | Пустой шаблон, нормализация PDF-стиля | Дефолты при создании шаблона |
| `pdf-templates.ts` | Re-export → `core/pdf/render.ts` | Совместимость; правки - в `core/pdf/` |
| `export-pdf.ts` | Генерация PDF + Share | Имя файла, ошибки экспорта |
| `import-pdf.ts` | Импорт PDF (свой / сторонний) | Импорт форм |

---

## Типы - `src/types/`

| Файл | Содержимое |
|------|------------|
| `document.ts` | `Document` - id, title, templateId, client, description, fields, pdfStyle?, createdAt |
| `template.ts` | `DocumentTemplate`, `TemplateField`, `PdfStyle`, `PdfLayout` |

**Править**, если добавляешь новые поля в документ или шаблон (и потом обновить storage + экраны).

---

## Константы - `src/constants/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `storage.ts` | Ключи AsyncStorage: `documents`, `document_templates` | Только при смене ключей хранения |
| `default-templates.ts` | Re-export → `core/templates` | Совместимость |
| `pdf-layouts.ts` | 8 макетов, пресеты design, дефолты PDF | Новый макет или пресет |
| `template-colors.ts` | Палитра цветов для кастомных шаблонов (6 пресетов) | Добавить/изменить цвета |
| `app-design.ts` | Цвета, радиусы, тени UI приложения | **Глобальный дизайн** приложения |

---

## Переводы - `src/i18n/`

| Файл | За что отвечает |
|------|-----------------|
| `index.ts` | Выбор языка (uk/ru), функции `t()`, `pluralDocuments()` |
| `types.ts` | TypeScript-схема всех строк перевода |
| `locales/uk.ts` | Украинские тексты |
| `locales/ru.ts` | Русские тексты |

Хук для экранов: `src/hooks/use-i18n.ts` → `const { t } = useI18n()`

**Править тексты в UI:**
1. Добавь ключ в `types.ts`
2. Добавь строку в `uk.ts` и `ru.ts`
3. Используй `t('section.key')` на экране

Секции переводов: `home`, `create`, `templates`, `document`, `common`, `pdf`

---

## Хранение данных

```
AsyncStorage
├── documents          → Document[]
├── document_templates → кастомные шаблоны (встроенные - из core)
└── pdf_styles         → сохранённые PDF-стили конструктора
```

- Встроенные шаблоны **не хранятся** - собираются из `core/templates/definitions/` при каждом `getTemplates()`.
- Документы хранят `templateId` + `fields` + опционально свой `pdfStyle`.
- Шаблоны хранят `fields`, `pdfStyle`, цвета, emoji.

**Не сохранять данные через `useEffect` на главной** - только через `document-storage` / `template-storage`.

---

## PDF - как устроено

См. раздел **«PDF-ядро»** выше. Кратко:

- 8 пресетов макетов + кастомный конструктор + сохранённые стили
- UI: `pdf-layout-picker.tsx`, `pdf-style-constructor.tsx`
- Дефолты: `constants/pdf-layouts.ts`
- Рендер: `core/pdf/`

---

## Где что править - шпаргалка

| Задача | Файлы |
|--------|-------|
| **Новый встроенный шаблон** | `core/templates/definitions/*.ts` → `definitions/index.ts` |
| Поля встроенного шаблона | Тот же файл definition (через `defineField`) |
| Вид PDF (HTML/CSS) | `core/pdf/parts/*`, `core/pdf/styles.ts` |
| Новый пресет макета PDF | `constants/pdf-layouts.ts` + i18n |
| Конструктор PDF в UI | `components/pdf-style-constructor.tsx` |
| Текст на экране | `i18n/locales/uk.ts`, `ru.ts`, `types.ts` |
| Цвета / отступы UI | `constants/app-design.ts` |
| Главная страница | `app/index.tsx`, `components/document-card.tsx` |
| Создание документа | `app/create/index.tsx`, `app/create/[templateId].tsx` |
| Просмотр / экспорт PDF | `app/document/[id].tsx`, `lib/export-pdf.ts` |
| Редактирование документа | `app/document/edit/[id].tsx` |
| Список шаблонов | `app/templates/index.tsx` |
| Создание шаблона | `app/templates/create.tsx` |
| Редактирование шаблона | `app/templates/edit/[id].tsx` |
| Поля встроенных шаблонов (Договор и т.д.) | `core/templates/definitions/` |
| Редактор поля шаблона | `components/template-field-editor.tsx` |
| Вид PDF (макеты) | `core/pdf/`, `constants/pdf-layouts.ts`, `components/pdf-layout-picker.tsx` |
| Выбор макета PDF в форме | `create/[templateId].tsx`, `templates/create.tsx`, `templates/edit/[id].tsx` |
| Сохранение документов | `lib/document-storage.ts` |
| Сохранение шаблонов | `lib/template-storage.ts` |
| Новое поле в типе документа | `types/document.ts` → `document-helpers.ts` → экраны |
| Новое поле в типе шаблона | `types/template.ts` → storage → экраны шаблонов |
| Заголовки навигации | `app/_layout.tsx` + ключи в `i18n` |
| Кнопки | `components/ui/primary-button.tsx` |
| Поля ввода | `components/ui/form-field.tsx` |
| Меню долгого нажатия | `components/ui/action-sheet.tsx` |

---

## Потоки пользователя

### Создать документ
```
Главная → /create → выбрать шаблон → /create/[id] → заполнить + вид PDF → сохранить
→ /document/[id]
```

### Создать свой шаблон
```
Шаблоны → /templates/create → выбрать основу → настроить поля + PDF → сохранить
→ /templates/edit/[id]
```

### Изменить встроенный шаблон
```
Шаблоны → нажать на шаблон → /templates/edit/[id] → сохранить
(или «Скинути» для возврата к дефолту)
```

### Экспорт PDF
```
/document/[id] → кнопка «Експорт PDF» → системное меню «Поделиться»
```

---

## Файлы, которые можно не трогать

Это системные / шаблонные файлы Expo, не относятся к логике Mobile Docs:

- `src/app/explore.tsx`
- `src/components/themed-text.tsx`, `themed-view.tsx`
- `src/components/animated-icon.*`, `app-tabs.*`, `web-badge.tsx`
- `src/components/hint-row.tsx`, `external-link.tsx`, `ui/collapsible.tsx`
- `src/constants/theme.ts` (тема Expo-шаблона, не основной дизайн)
- `src/hooks/use-color-scheme.*`, `use-theme.ts`
- `src/global.css`, `*.module.css`
- `scripts/`, `assets/`, `app.json`, `package.json`

Основной дизайн приложения - **`constants/app-design.ts`**, не `theme.ts`.

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
| PDF | `expo-print`, `expo-sharing`, `expo-file-system` |
| Градиенты | `expo-linear-gradient` |
| Язык системы | `expo-localization` |
| Навигация | `expo-router` |

---

*Документ актуален для структуры `src/` проекта mobile-docs (Expo SDK 56). Ядро: `src/core/`.*
