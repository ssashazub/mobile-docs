import { BUILTIN_PDF_STYLES, DEFAULT_PDF_STYLE } from '@/constants/pdf-layouts';
import { getAppLocale } from '@/i18n';
import { normalizePdfStyle } from '@/lib/template-helpers';
import type { AppLocale } from '@/i18n/types';
import type { DocumentTemplate } from '@/types/template';

const TEMPLATE_META = {
  contract: { emoji: '📄', accentColor: '#1d4ed8', gradientEnd: '#3b82f6' },
  invoice: { emoji: '🧾', accentColor: '#047857', gradientEnd: '#10b981' },
  report: { emoji: '📊', accentColor: '#6d28d9', gradientEnd: '#8b5cf6' },
  act: { emoji: '✅', accentColor: '#c2410c', gradientEnd: '#f97316' },
} as const;

const TEMPLATE_CONTENT: Record<
  AppLocale,
  Record<
    keyof typeof TEMPLATE_META,
    { title: string; fields: DocumentTemplate['fields'] }
  >
> = {
  uk: {
    contract: {
      title: 'Договір',
      fields: [
        { key: 'title', label: 'Назва договору', placeholder: 'Договір на надання послуг', required: true },
        { key: 'contractNumber', label: 'Номер договору', placeholder: 'ДГ-2026/014' },
        { key: 'client', label: 'Замовник', placeholder: 'ТОВ «Компанія»', required: true },
        { key: 'clientAddress', label: 'Адреса замовника', placeholder: 'м. Київ, вул. Прикладна, 1' },
        { key: 'provider', label: 'Виконавець', placeholder: 'ФОП Іванов І.І.' },
        { key: 'providerAddress', label: 'Адреса виконавця', placeholder: 'м. Київ, вул. Ділова, 10' },
        { key: 'subject', label: 'Предмет договору', placeholder: 'Розробка мобільного застосунку', multiline: true },
        { key: 'amount', label: 'Сума', placeholder: '50 000 грн' },
        { key: 'startDate', label: 'Дата початку', placeholder: '01.03.2026' },
        { key: 'endDate', label: 'Дата завершення', placeholder: '30.06.2026' },
        { key: 'terms', label: 'Умови та зобовʼязання', placeholder: 'Оплата 50% аванс, 50% після завершення...', multiline: true },
      ],
    },
    invoice: {
      title: 'Рахунок',
      fields: [
        { key: 'title', label: 'Назва рахунку', placeholder: 'Рахунок на оплату послуг', required: true },
        { key: 'invoiceNumber', label: 'Номер рахунку', placeholder: 'INV-0042' },
        { key: 'client', label: 'Платник', placeholder: 'ТОВ «Клієнт»', required: true },
        { key: 'clientAddress', label: 'Адреса платника', placeholder: 'м. Київ, пр. Перемоги, 25' },
        { key: 'provider', label: 'Отримувач', placeholder: 'ФОП Петров П.П.' },
        { key: 'items', label: 'Позиції та послуги', placeholder: 'Розробка — 40 000 грн\nДизайн — 10 000 грн', multiline: true },
        { key: 'amount', label: 'Сума без ПДВ', placeholder: '50 000 грн' },
        { key: 'tax', label: 'ПДВ', placeholder: '10 000 грн (20%)' },
        { key: 'total', label: 'До сплати', placeholder: '60 000 грн' },
        { key: 'dueDate', label: 'Термін оплати', placeholder: 'до 15.03.2026' },
        { key: 'bankDetails', label: 'Реквізити', placeholder: 'IBAN: UA00...', multiline: true },
      ],
    },
    report: {
      title: 'Звіт',
      fields: [
        { key: 'title', label: 'Назва звіту', placeholder: 'Звіт про виконану роботу', required: true },
        { key: 'reportNumber', label: 'Номер звіту', placeholder: 'ЗВ-2026/03' },
        { key: 'client', label: 'Замовник або проєкт', placeholder: 'Проєкт Mobile Docs', required: true },
        { key: 'period', label: 'Період', placeholder: 'Березень 2026' },
        { key: 'author', label: 'Автор', placeholder: 'Команда розробки' },
        { key: 'summary', label: 'Короткий зміст', placeholder: 'Виконано основні задачі етапу 1...', multiline: true },
        { key: 'conclusions', label: 'Висновки', placeholder: 'Проєкт йде за графіком...', multiline: true },
        { key: 'recommendations', label: 'Рекомендації', placeholder: 'Рекомендується розширити тестування...', multiline: true },
      ],
    },
    act: {
      title: 'Акт',
      fields: [
        { key: 'title', label: 'Назва акту', placeholder: 'Акт виконаних робіт', required: true },
        { key: 'actNumber', label: 'Номер акту', placeholder: 'АВР-007' },
        { key: 'client', label: 'Замовник', placeholder: 'ТОВ «Замовник»', required: true },
        { key: 'provider', label: 'Виконавець', placeholder: 'ФОП Сидоров С.С.' },
        { key: 'workDescription', label: 'Опис робіт', placeholder: 'Розробка екранів застосунку, інтеграція API...', multiline: true },
        { key: 'completionDate', label: 'Дата виконання', placeholder: '10.03.2026' },
        { key: 'amount', label: 'Сума', placeholder: '50 000 грн' },
        { key: 'signatoryClient', label: 'Підпис замовника', placeholder: 'Іванов І.І.' },
        { key: 'signatoryProvider', label: 'Підпис виконавця', placeholder: 'Петров П.П.' },
      ],
    },
  },
  ru: {
    contract: {
      title: 'Договор',
      fields: [
        { key: 'title', label: 'Название договора', placeholder: 'Договор на оказание услуг', required: true },
        { key: 'contractNumber', label: 'Номер договора', placeholder: 'ДГ-2026/014' },
        { key: 'client', label: 'Заказчик', placeholder: 'ООО «Компания»', required: true },
        { key: 'clientAddress', label: 'Адрес заказчика', placeholder: 'г. Киев, ул. Примерная, 1' },
        { key: 'provider', label: 'Исполнитель', placeholder: 'ИП Иванов И.И.' },
        { key: 'providerAddress', label: 'Адрес исполнителя', placeholder: 'г. Киев, ул. Деловая, 10' },
        { key: 'subject', label: 'Предмет договора', placeholder: 'Разработка мобильного приложения', multiline: true },
        { key: 'amount', label: 'Сумма', placeholder: '50 000 грн' },
        { key: 'startDate', label: 'Дата начала', placeholder: '01.03.2026' },
        { key: 'endDate', label: 'Дата окончания', placeholder: '30.06.2026' },
        { key: 'terms', label: 'Условия и обязательства', placeholder: 'Оплата 50% аванс, 50% по завершении...', multiline: true },
      ],
    },
    invoice: {
      title: 'Счёт',
      fields: [
        { key: 'title', label: 'Название счёта', placeholder: 'Счёт на оплату услуг', required: true },
        { key: 'invoiceNumber', label: 'Номер счёта', placeholder: 'INV-0042' },
        { key: 'client', label: 'Плательщик', placeholder: 'ООО «Клиент»', required: true },
        { key: 'clientAddress', label: 'Адрес плательщика', placeholder: 'г. Киев, пр. Победы, 25' },
        { key: 'provider', label: 'Получатель', placeholder: 'ИП Петров П.П.' },
        { key: 'items', label: 'Позиции и услуги', placeholder: 'Разработка — 40 000 грн\nДизайн — 10 000 грн', multiline: true },
        { key: 'amount', label: 'Сумма без НДС', placeholder: '50 000 грн' },
        { key: 'tax', label: 'НДС', placeholder: '10 000 грн (20%)' },
        { key: 'total', label: 'К оплате', placeholder: '60 000 грн' },
        { key: 'dueDate', label: 'Срок оплаты', placeholder: 'до 15.03.2026' },
        { key: 'bankDetails', label: 'Реквизиты', placeholder: 'IBAN: UA00...', multiline: true },
      ],
    },
    report: {
      title: 'Отчёт',
      fields: [
        { key: 'title', label: 'Название отчёта', placeholder: 'Отчёт о проделанной работе', required: true },
        { key: 'reportNumber', label: 'Номер отчёта', placeholder: 'ОТ-2026/03' },
        { key: 'client', label: 'Заказчик или проект', placeholder: 'Проект Mobile Docs', required: true },
        { key: 'period', label: 'Период', placeholder: 'Март 2026' },
        { key: 'author', label: 'Автор', placeholder: 'Команда разработки' },
        { key: 'summary', label: 'Краткое содержание', placeholder: 'Выполнены основные задачи этапа 1...', multiline: true },
        { key: 'conclusions', label: 'Выводы', placeholder: 'Проект идёт по графику...', multiline: true },
        { key: 'recommendations', label: 'Рекомендации', placeholder: 'Рекомендуется расширить тестирование...', multiline: true },
      ],
    },
    act: {
      title: 'Акт',
      fields: [
        { key: 'title', label: 'Название акта', placeholder: 'Акт выполненных работ', required: true },
        { key: 'actNumber', label: 'Номер акта', placeholder: 'АВР-007' },
        { key: 'client', label: 'Заказчик', placeholder: 'ООО «Заказчик»', required: true },
        { key: 'provider', label: 'Исполнитель', placeholder: 'ИП Сидоров С.С.' },
        { key: 'workDescription', label: 'Описание работ', placeholder: 'Разработка экранов приложения, интеграция API...', multiline: true },
        { key: 'completionDate', label: 'Дата выполнения', placeholder: '10.03.2026' },
        { key: 'amount', label: 'Сумма', placeholder: '50 000 грн' },
        { key: 'signatoryClient', label: 'Подпись заказчика', placeholder: 'Иванов И.И.' },
        { key: 'signatoryProvider', label: 'Подпись исполнителя', placeholder: 'Петров П.П.' },
      ],
    },
  },
};

export function getDefaultTemplates(locale: AppLocale = getAppLocale()): DocumentTemplate[] {
  const now = new Date().toISOString();
  const content = TEMPLATE_CONTENT[locale];

  return (Object.keys(TEMPLATE_META) as Array<keyof typeof TEMPLATE_META>).map((id) => ({
    id,
    title: content[id].title,
    emoji: TEMPLATE_META[id].emoji,
    accentColor: TEMPLATE_META[id].accentColor,
    gradientEnd: TEMPLATE_META[id].gradientEnd,
    pdfStyle: normalizePdfStyle(BUILTIN_PDF_STYLES[id] ?? DEFAULT_PDF_STYLE, id),
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
    fields: content[id].fields.map((field) => ({ ...field })),
  }));
}

/** @deprecated Use getDefaultTemplates() */
export const DEFAULT_TEMPLATES = getDefaultTemplates();
