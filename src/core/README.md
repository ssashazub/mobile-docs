# Mobile Docs Core

Ядро приложения: **шаблоны документов** и **рендер PDF**.  
Не зависит от React Native экранов.

## Быстрый старт

```typescript
import { defineField, getBuiltinTemplates, renderDocumentPdfHtml } from '@/core';
```

## Добавить шаблон

1. `templates/definitions/my-template.ts` - `BuiltinTemplateDefinition`
2. `templates/definitions/index.ts` - добавить в массив
3. `npx tsc --noEmit`

Подробно: [DOCS.md](../../DOCS.md#ядро-srccore--главное-для-разработки-шаблонов)

## PDF

| Модуль | Назначение |
|--------|------------|
| `pdf/html.ts` | Экранирование, обёртка страницы |
| `pdf/styles.ts` | CSS по `ResolvedPdfDesign` |
| `pdf/parts/header.ts` | 6 стилей заголовка |
| `pdf/parts/fields.ts` | 5 стилей полей |
| `pdf/parts/footer.ts` | Подвал |
| `pdf/render.ts` | Сборка HTML документа |
