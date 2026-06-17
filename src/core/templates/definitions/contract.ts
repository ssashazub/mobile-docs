import { defineField } from '@/core/templates/field-def';
import type { BuiltinTemplateDefinition } from '@/core/templates/types';

export const contractDefinition: BuiltinTemplateDefinition = {
  id: 'contract',
  icon: { kind: 'symbol', value: 'doc.text' },
  accentColor: '#1d4ed8',
  gradientEnd: '#3b82f6',
  locales: {
    uk: { title: 'Договір' },
    ru: { title: 'Договор' },
    en: { title: 'Contract' },
  },
  fields: [
    defineField('title', {
      uk: { label: 'Назва договору', placeholder: 'Договір на надання послуг' },
      ru: { label: 'Название договора', placeholder: 'Договор на оказание услуг' },
      en: { label: 'Contract title', placeholder: 'Service agreement' },
    }, { required: true }),
    defineField('contractNumber', {
      uk: { label: 'Номер договору', placeholder: 'ДГ-2026/014' },
      ru: { label: 'Номер договора', placeholder: 'ДГ-2026/014' },
      en: { label: 'Contract number', placeholder: 'AGR-2026/014' },
    }),
    defineField('client', {
      uk: { label: 'Замовник', placeholder: 'ТОВ «Компанія»' },
      ru: { label: 'Заказчик', placeholder: 'ООО «Компания»' },
      en: { label: 'Client', placeholder: 'Company LLC' },
    }, { required: true }),
    defineField('clientAddress', {
      uk: { label: 'Адреса замовника', placeholder: 'м. Київ, вул. Прикладна, 1' },
      ru: { label: 'Адрес заказчика', placeholder: 'г. Киев, ул. Примерная, 1' },
      en: { label: 'Client address', placeholder: 'Kyiv, Example St, 1' },
    }),
    defineField('provider', {
      uk: { label: 'Виконавець', placeholder: 'ФОП Іванов І.І.' },
      ru: { label: 'Исполнитель', placeholder: 'ИП Иванов И.И.' },
      en: { label: 'Provider', placeholder: 'John Smith' },
    }),
    defineField('providerAddress', {
      uk: { label: 'Адреса виконавця', placeholder: 'м. Київ, вул. Ділова, 10' },
      ru: { label: 'Адрес исполнителя', placeholder: 'г. Киев, ул. Деловая, 10' },
      en: { label: 'Provider address', placeholder: 'Kyiv, Business St, 10' },
    }),
    defineField('subject', {
      uk: { label: 'Предмет договору', placeholder: 'Розробка мобільного застосунку' },
      ru: { label: 'Предмет договора', placeholder: 'Разработка мобильного приложения' },
      en: { label: 'Contract subject', placeholder: 'Mobile app development' },
    }, { multiline: true }),
    defineField('amount', {
      uk: { label: 'Сума', placeholder: '50 000 грн' },
      ru: { label: 'Сумма', placeholder: '50 000 грн' },
      en: { label: 'Amount', placeholder: '50,000 UAH' },
    }, { kind: 'number' }),
    defineField('startDate', {
      uk: { label: 'Дата початку', placeholder: '01.03.2026' },
      ru: { label: 'Дата начала', placeholder: '01.03.2026' },
      en: { label: 'Start date', placeholder: '07.06.2026' },
    }, { kind: 'date' }),
    defineField('endDate', {
      uk: { label: 'Дата завершення', placeholder: '30.06.2026' },
      ru: { label: 'Дата окончания', placeholder: '30.06.2026' },
      en: { label: 'End date', placeholder: '30.06.2026' },
    }, { kind: 'date' }),
    defineField('terms', {
      uk: { label: 'Умови та зобовʼязання', placeholder: 'Оплата 50% аванс, 50% після завершення...' },
      ru: { label: 'Условия и обязательства', placeholder: 'Оплата 50% аванс, 50% по завершении...' },
      en: { label: 'Terms and obligations', placeholder: '50% upfront payment, 50% upon completion...' },
    }, { multiline: true }),
  ],
};
