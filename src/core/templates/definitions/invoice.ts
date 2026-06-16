import { defineField } from '@/core/templates/field-def';
import type { BuiltinTemplateDefinition } from '@/core/templates/types';

export const invoiceDefinition: BuiltinTemplateDefinition = {
  id: 'invoice',
  emoji: '🧾',
  accentColor: '#047857',
  gradientEnd: '#10b981',
  locales: {
    uk: { title: 'Рахунок' },
    ru: { title: 'Счёт' },
    en: { title: 'Invoice' },
  },
  fields: [
    defineField('title', {
      uk: { label: 'Назва рахунку', placeholder: 'Рахунок на оплату послуг' },
      ru: { label: 'Название счёта', placeholder: 'Счёт на оплату услуг' },
      en: { label: 'Invoice title', placeholder: 'Invoice for services' },
    }, { required: true }),
    defineField('invoiceNumber', {
      uk: { label: 'Номер рахунку', placeholder: 'INV-0042' },
      ru: { label: 'Номер счёта', placeholder: 'INV-0042' },
      en: { label: 'Invoice number', placeholder: 'INV-0042' },
    }),
    defineField('client', {
      uk: { label: 'Платник', placeholder: 'ТОВ «Клієнт»' },
      ru: { label: 'Плательщик', placeholder: 'ООО «Клиент»' },
      en: { label: 'Payer', placeholder: 'Client LLC' },
    }, { required: true }),
    defineField('clientAddress', {
      uk: { label: 'Адреса платника', placeholder: 'м. Київ, пр. Перемоги, 25' },
      ru: { label: 'Адрес плательщика', placeholder: 'г. Киев, пр. Победы, 25' },
      en: { label: 'Payer address', placeholder: 'Kyiv, Victory Ave, 25' },
    }),
    defineField('provider', {
      uk: { label: 'Отримувач', placeholder: 'ФОП Петров П.П.' },
      ru: { label: 'Получатель', placeholder: 'ИП Петров П.П.' },
      en: { label: 'Recipient', placeholder: 'John Smith' },
    }),
    defineField('items', {
      uk: { label: 'Позиції та послуги', placeholder: 'Розробка — 40 000 грн\nДизайн — 10 000 грн' },
      ru: { label: 'Позиции и услуги', placeholder: 'Разработка — 40 000 грн\nДизайн — 10 000 грн' },
      en: { label: 'Items and services', placeholder: 'Development — 40,000 UAH\nDesign — 10,000 UAH' },
    }, { multiline: true }),
    defineField('amount', {
      uk: { label: 'Сума без ПДВ', placeholder: '50 000 грн' },
      ru: { label: 'Сумма без НДС', placeholder: '50 000 грн' },
      en: { label: 'Amount excl. VAT', placeholder: '50,000 UAH' },
    }, { kind: 'number' }),
    defineField('tax', {
      uk: { label: 'ПДВ', placeholder: '10 000 грн (20%)' },
      ru: { label: 'НДС', placeholder: '10 000 грн (20%)' },
      en: { label: 'VAT', placeholder: '10,000 UAH (20%)' },
    }, { kind: 'number' }),
    defineField('total', {
      uk: { label: 'До сплати', placeholder: '60 000 грн' },
      ru: { label: 'К оплате', placeholder: '60 000 грн' },
      en: { label: 'Total due', placeholder: '60,000 UAH' },
    }, { kind: 'number' }),
    defineField('dueDate', {
      uk: { label: 'Термін оплати', placeholder: '15.03.2026' },
      ru: { label: 'Срок оплаты', placeholder: '15.03.2026' },
      en: { label: 'Payment due date', placeholder: '15.03.2026' },
    }, { kind: 'date' }),
    defineField('bankDetails', {
      uk: { label: 'Реквізити', placeholder: 'IBAN: UA00...' },
      ru: { label: 'Реквизиты', placeholder: 'IBAN: UA00...' },
      en: { label: 'Bank details', placeholder: 'IBAN: UA00...' },
    }, { multiline: true }),
  ],
};
