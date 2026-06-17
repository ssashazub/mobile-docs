import { defineField } from '@/core/templates/field-def';
import type { BuiltinTemplateDefinition } from '@/core/templates/types';

export const reportDefinition: BuiltinTemplateDefinition = {
  id: 'report',
  icon: { kind: 'symbol', value: 'chart.bar' },
  accentColor: '#6d28d9',
  gradientEnd: '#8b5cf6',
  locales: {
    uk: { title: 'Звіт' },
    ru: { title: 'Отчёт' },
    en: { title: 'Report' },
  },
  fields: [
    defineField('title', {
      uk: { label: 'Назва звіту', placeholder: 'Звіт про виконану роботу' },
      ru: { label: 'Название отчёта', placeholder: 'Отчёт о проделанной работе' },
      en: { label: 'Report title', placeholder: 'Work progress report' },
    }, { required: true }),
    defineField('reportNumber', {
      uk: { label: 'Номер звіту', placeholder: 'ЗВ-2026/03' },
      ru: { label: 'Номер отчёта', placeholder: 'ОТ-2026/03' },
      en: { label: 'Report number', placeholder: 'REP-2026/03' },
    }),
    defineField('client', {
      uk: { label: 'Замовник або проєкт', placeholder: 'Проєкт Mobile Docs' },
      ru: { label: 'Заказчик или проект', placeholder: 'Проект Mobile Docs' },
      en: { label: 'Client or project', placeholder: 'Mobile Docs project' },
    }, { required: true }),
    defineField('period', {
      uk: { label: 'Період', placeholder: 'Березень 2026' },
      ru: { label: 'Период', placeholder: 'Март 2026' },
      en: { label: 'Period', placeholder: 'March 2026' },
    }),
    defineField('author', {
      uk: { label: 'Автор', placeholder: 'Команда розробки' },
      ru: { label: 'Автор', placeholder: 'Команда разработки' },
      en: { label: 'Author', placeholder: 'Development team' },
    }),
    defineField('summary', {
      uk: { label: 'Короткий зміст', placeholder: 'Виконано основні задачі етапу 1...' },
      ru: { label: 'Краткое содержание', placeholder: 'Выполнены основные задачи этапа 1...' },
      en: { label: 'Summary', placeholder: 'Main tasks of phase 1 have been completed...' },
    }, { multiline: true }),
    defineField('conclusions', {
      uk: { label: 'Висновки', placeholder: 'Проєкт йде за графіком...' },
      ru: { label: 'Выводы', placeholder: 'Проект идёт по графику...' },
      en: { label: 'Conclusions', placeholder: 'The project is on schedule...' },
    }, { multiline: true }),
    defineField('recommendations', {
      uk: { label: 'Рекомендації', placeholder: 'Рекомендується розширити тестування...' },
      ru: { label: 'Рекомендации', placeholder: 'Рекомендуется расширить тестирование...' },
      en: { label: 'Recommendations', placeholder: 'It is recommended to expand testing...' },
    }, { multiline: true }),
  ],
};
