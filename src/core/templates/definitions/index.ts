import { actDefinition } from '@/core/templates/definitions/act';
import { contractDefinition } from '@/core/templates/definitions/contract';
import { invoiceDefinition } from '@/core/templates/definitions/invoice';
import { reportDefinition } from '@/core/templates/definitions/report';
import type { BuiltinTemplateDefinition } from '@/core/templates/types';

/**
 * Реестр встроенных шаблонов.
 * Чтобы добавить новый - создайте файл в definitions/ и подключите сюда.
 */
export const BUILTIN_TEMPLATE_DEFINITIONS: BuiltinTemplateDefinition[] = [
  contractDefinition,
  invoiceDefinition,
  reportDefinition,
  actDefinition,
];
