import { defineField } from '@/core/templates/field-def';
import type { BuiltinTemplateDefinition } from '@/core/templates/types';

export const actDefinition: BuiltinTemplateDefinition = {
  id: 'act',
  emoji: '✅',
  accentColor: '#c2410c',
  gradientEnd: '#f97316',
  locales: {
    uk: { title: 'Акт' },
    ru: { title: 'Акт' },
    en: { title: 'Act' },
  },
  fields: [
    defineField('title', {
      uk: { label: 'Назва акту', placeholder: 'Акт виконаних робіт' },
      ru: { label: 'Название акта', placeholder: 'Акт выполненных работ' },
      en: { label: 'Act title', placeholder: 'Work completion act' },
    }, { required: true }),
    defineField('actNumber', {
      uk: { label: 'Номер акту', placeholder: 'АВР-007' },
      ru: { label: 'Номер акта', placeholder: 'АВР-007' },
      en: { label: 'Act number', placeholder: 'WCA-007' },
    }),
    defineField('client', {
      uk: { label: 'Замовник', placeholder: 'ТОВ «Замовник»' },
      ru: { label: 'Заказчик', placeholder: 'ООО «Заказчик»' },
      en: { label: 'Client', placeholder: 'Client LLC' },
    }, { required: true }),
    defineField('provider', {
      uk: { label: 'Виконавець', placeholder: 'ФОП Сидоров С.С.' },
      ru: { label: 'Исполнитель', placeholder: 'ИП Сидоров С.С.' },
      en: { label: 'Provider', placeholder: 'John Smith' },
    }),
    defineField('workDescription', {
      uk: { label: 'Опис робіт', placeholder: 'Розробка екранів застосунку, інтеграція API...' },
      ru: { label: 'Описание работ', placeholder: 'Разработка экранов приложения, интеграция API...' },
      en: { label: 'Work description', placeholder: 'App screen development, API integration...' },
    }, { multiline: true }),
    defineField('completionDate', {
      uk: { label: 'Дата виконання', placeholder: '10.03.2026' },
      ru: { label: 'Дата выполнения', placeholder: '10.03.2026' },
      en: { label: 'Completion date', placeholder: '10.03.2026' },
    }, { kind: 'date' }),
    defineField('amount', {
      uk: { label: 'Сума', placeholder: '50 000 грн' },
      ru: { label: 'Сумма', placeholder: '50 000 грн' },
      en: { label: 'Amount', placeholder: '50,000 UAH' },
    }, { kind: 'number' }),
    defineField('signatoryClient', {
      uk: { label: 'Підпис замовника', placeholder: 'Іванов І.І.' },
      ru: { label: 'Подпись заказчика', placeholder: 'Иванов И.И.' },
      en: { label: 'Client signature', placeholder: 'John Doe' },
    }),
    defineField('signatoryProvider', {
      uk: { label: 'Підпис виконавця', placeholder: 'Петров П.П.' },
      ru: { label: 'Подпись исполнителя', placeholder: 'Петров П.П.' },
      en: { label: 'Provider signature', placeholder: 'Jane Smith' },
    }),
  ],
};
