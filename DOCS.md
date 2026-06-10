# Mobile Docs — документация проекта

Краткий путеводитель: где что лежит, за что отвечает и куда лезть при правках.  
Описаны только **прикладные** файлы приложения (без системных/шаблонных файлов Expo).

---

## Что делает приложение

1. **Документы** — создаёшь по шаблону, заполняешь поля, смотришь, редактируешь, экспортируешь PDF.
2. **Шаблоны** — встроенные (Договор, Рахунок, Звіт, Акт) + свои кастомные. Настраиваются поля, цвет, вид PDF.
3. **Локализация** — украинский и русский (по языку системы).
4. **Хранение** — всё локально в AsyncStorage на устройстве.

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

Общая навигация и заголовки шапки: `src/app/_layout.tsx`

---

## Структура папок

```
src/
├── app/                  # Экраны (Expo Router — файл = маршрут)
├── components/           # UI-компоненты
├── constants/            # Константы, дефолты, дизайн
├── hooks/                # React-хуки приложения
├── i18n/                 # Переводы uk / ru
├── lib/                  # Логика: хранение, PDF, хелперы
└── types/                # TypeScript-типы
```

---

## Экраны — `src/app/`

### `index.tsx` — главная
- Загружает документы и шаблоны при каждом фокусе экрана.
- Показывает карточки документов (`DocumentCard`).
- Долгое нажатие на документ → меню (открыть / редактировать / удалить) через `ActionSheet`.
- **Править:** текст кнопок, пустое состояние, внешний вид списка.

### `create/index.tsx` — выбор шаблона (шаг 1)
- Список шаблонов (`DocumentTypeCard`).
- Кнопка «Керувати шаблонами» → `/templates`.
- **Править:** заголовки, подписи, список шаблонов.

### `create/[templateId].tsx` — форма нового документа (шаг 2)
- Загружает шаблон по `templateId`.
- Поля формы (`FormField`) из шаблона.
- Выбор вида PDF (`PdfLayoutPicker`) — сохраняется в документ.
- Сохраняет документ через `addDocument()`.
- **Править:** логику создания, валидацию обязательных полей, расположение блоков.

### `document/[id].tsx` — просмотр документа
- Показывает все поля документа.
- Кнопка «Экспорт PDF» → `exportDocumentPdf()`.
- Кнопка Edit в шапке → редактирование.
- **Править:** внешний вид карточки, кнопку экспорта.

### `document/edit/[id].tsx` — редактирование документа
- Загружает документ + шаблон.
- Редактируемые поля + вид PDF.
- Сохраняет через `updateDocument()`.
- **Править:** валидацию, поля, сохранение.

### `templates/index.tsx` — список шаблонов
- Все шаблоны (встроенные + кастомные).
- Кнопка «+ Создать шаблон».
- Удаление только кастомных шаблонов.
- **Править:** список, кнопку создания, удаление.

### `templates/create.tsx` — создание шаблона
- Выбор основы (пустой / существующий шаблон).
- Название, эмодзі, цвет.
- Вид PDF (`PdfLayoutPicker`).
- Редактор полей (`TemplateFieldEditor`).
- Сохраняет через `saveTemplate()`.
- **Править:** дефолтные поля при создании, форму, валидацию.

### `templates/edit/[id].tsx` — редактирование шаблона
- То же, что create, но для существующего шаблона.
- Для встроенных шаблонов — кнопка «Скинути до стандарту» (`resetTemplateToDefault`).
- **Править:** поля шаблона, PDF-стиль, сброс встроенных.

### `_layout.tsx` — корневой layout
- Stack-навигация, цвет шапки, заголовки основных экранов.
- **Править:** глобальные заголовки, стиль header.

---

## Компоненты — `src/components/`

### Прикладные (наши)

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `document-card.tsx` | Карточка документа на главной | Внешний вид списка на главной |
| `document-type-card.tsx` | Карточка шаблона (выбор типа) | Внешний вид при выборе шаблона |
| `pdf-layout-picker.tsx` | Выбор макета PDF (4 варианта + переключатели) | Новый макет, превью, подписи |
| `template-field-editor.tsx` | Редактор одного поля шаблона (название, placeholder, multiline, required) | Поля в редакторе шаблонов |

### UI — `src/components/ui/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `primary-button.tsx` | Основная кнопка (primary / secondary) | Стиль кнопок по всему приложению |
| `form-field.tsx` | Поле ввода с подписью | Стиль полей в формах документов |
| `action-sheet.tsx` | Нижнее меню действий (долгое нажатие) | Меню на главной |

---

## Логика — `src/lib/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `document-storage.ts` | CRUD документов в AsyncStorage (`getDocuments`, `addDocument`, `updateDocument`, `deleteDocument`) | Как сохраняются документы |
| `template-storage.ts` | CRUD шаблонов (`getTemplates`, `saveTemplate`, `deleteTemplate`, `resetTemplateToDefault`) | Как сохраняются шаблоны |
| `document-helpers.ts` | Сборка документа из полей, нормализация старых данных, `getNextDocumentId` | Логика title/client/description, миграция старых документов |
| `template-helpers.ts` | Пустой шаблон, пустое поле, нормализация PDF-стиля, ключи полей | Дефолты при создании шаблона, генерация key поля |
| `pdf-templates.ts` | HTML для PDF (4 макета: classic, minimal, formal, compact) | **Как выглядит PDF** — верстка, стили, секции |
| `export-pdf.ts` | Генерация PDF файла + Share | Имя файла, ошибки экспорта, способ шаринга |

---

## Типы — `src/types/`

| Файл | Содержимое |
|------|------------|
| `document.ts` | `Document` — id, title, templateId, client, description, fields, pdfStyle?, createdAt |
| `template.ts` | `DocumentTemplate`, `TemplateField`, `PdfStyle`, `PdfLayout` |

**Править**, если добавляешь новые поля в документ или шаблон (и потом обновить storage + экраны).

---

## Константы — `src/constants/`

| Файл | За что отвечает | Когда править |
|------|-----------------|---------------|
| `storage.ts` | Ключи AsyncStorage: `documents`, `document_templates` | Только при смене ключей хранения |
| `default-templates.ts` | **Встроенные шаблоны** (Договор, Рахунок, Звіт, Акт) — поля, названия uk/ru | Добавить/изменить поля встроенных шаблонов |
| `pdf-layouts.ts` | Список макетов PDF, дефолтный стиль, дефолты для встроенных шаблонов | Новый макет или дефолтный вид PDF |
| `template-colors.ts` | Палитра цветов для кастомных шаблонов (6 пресетов) | Добавить/изменить цвета |
| `app-design.ts` | Цвета, радиусы, тени UI приложения | **Глобальный дизайн** приложения |

---

## Переводы — `src/i18n/`

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
├── documents          → Document[]     (lib/document-storage.ts)
└── document_templates → DocumentTemplate[] (lib/template-storage.ts)
```

- При первом запуске шаблоны **сидятся** из `default-templates.ts` (4 встроенных).
- Документы хранят `templateId` + `fields` + опционально свой `pdfStyle`.
- Шаблоны хранят `fields`, `pdfStyle`, цвета, emoji.

**Не сохранять данные через `useEffect` на главной** — только через `document-storage` / `template-storage`.

---

## PDF — как устроено

```
Документ + Шаблон
       ↓
pdf-templates.ts  → HTML (макет по pdfStyle.layout)
       ↓
export-pdf.ts     → expo-print → PDF файл → expo-sharing
```

- Макет берётся из `document.pdfStyle`, если есть, иначе из `template.pdfStyle`.
- 4 макета: `classic`, `minimal`, `formal`, `compact`.
- UI выбора: `components/pdf-layout-picker.tsx`.
- Дефолты макетов: `constants/pdf-layouts.ts`.

---

## Где что править — шпаргалка

| Задача | Файлы |
|--------|-------|
| Текст на экране | `i18n/locales/uk.ts`, `ru.ts`, `types.ts` |
| Цвета / отступы UI | `constants/app-design.ts` |
| Главная страница | `app/index.tsx`, `components/document-card.tsx` |
| Создание документа | `app/create/index.tsx`, `app/create/[templateId].tsx` |
| Просмотр / экспорт PDF | `app/document/[id].tsx`, `lib/export-pdf.ts` |
| Редактирование документа | `app/document/edit/[id].tsx` |
| Список шаблонов | `app/templates/index.tsx` |
| Создание шаблона | `app/templates/create.tsx` |
| Редактирование шаблона | `app/templates/edit/[id].tsx` |
| Поля встроенных шаблонов (Договор и т.д.) | `constants/default-templates.ts` |
| Редактор поля шаблона | `components/template-field-editor.tsx` |
| Вид PDF (макеты) | `lib/pdf-templates.ts`, `constants/pdf-layouts.ts`, `components/pdf-layout-picker.tsx` |
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

Основной дизайн приложения — **`constants/app-design.ts`**, не `theme.ts`.

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

*Документ актуален для структуры `src/` проекта mobile-docs (Expo SDK 56).*
