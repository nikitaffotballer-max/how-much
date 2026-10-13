import type { LlmProvider } from '@how-much/llm';
import { z } from 'zod';

export interface CategoryOption {
  key: string;
  /** «Продукты → Молочное» — модели проще выбрать по названию, чем по ключу. */
  title: string;
}

/** Схема ответа модели. Деньги — в рублях: так модель ошибается реже, чем в копейках. */
export function receiptExtractionSchema(categoryKeys: readonly [string, ...string[]]) {
  return z.object({
    isReceipt: z
      .boolean()
      .describe('true, только если в письме кассовый чек со списком купленных позиций'),
    merchantName: z
      .string()
      .nullable()
      .describe('Название магазина, как его знает покупатель: «Пятёрочка», «Ozon», а не ООО'),
    merchantLegalName: z.string().nullable().describe('Юридическое название продавца из чека'),
    merchantInn: z.string().nullable().describe('ИНН продавца, только цифры'),
    purchasedAt: z
      .string()
      .nullable()
      .describe(
        'Дата и время покупки в ISO 8601 с часовым поясом, например 2026-10-13T14:02:00+03:00',
      ),
    total: z.number().nullable().describe('Итог чека в рублях'),
    paymentType: z.enum(['card', 'cash', 'other']).nullable(),
    fn: z.string().nullable().describe('Номер фискального накопителя (ФН)'),
    fd: z.string().nullable().describe('Номер фискального документа (ФД)'),
    fpd: z.string().nullable().describe('Фискальный признак документа (ФП или ФПД)'),
    items: z.array(
      z.object({
        name: z.string().describe('Название позиции как в чеке'),
        quantity: z.number().describe('Количество или вес'),
        price: z.number().describe('Цена за единицу в рублях'),
        sum: z.number().describe('Сумма позиции в рублях с учётом скидки'),
        category: z.enum(categoryKeys),
      }),
    ),
  });
}

export type ExtractedReceipt = z.infer<ReturnType<typeof receiptExtractionSchema>>;

function systemPrompt(categories: readonly CategoryOption[]) {
  return [
    'Ты разбираешь электронные кассовые чеки из российских магазинов.',
    'На входе текст письма. Если это не кассовый чек с позициями (реклама, статус заказа, ссылка на чек без позиций) — верни isReceipt: false и пустые поля.',
    'Если это чек — перенеси данные без выдумок: чего нет в тексте, то null.',
    'Если часовой пояс не указан, считай время московским (+03:00).',
    'Для каждой позиции выбери самую точную категорию из списка:',
    ...categories.map(({ key, title }) => `- ${key}: ${title}`),
  ].join('\n');
}

/** Достаёт из текста письма чек по схеме. */
export function extractReceipt(
  llm: LlmProvider,
  text: string,
  categories: readonly CategoryOption[],
): Promise<ExtractedReceipt> {
  const keys = categories.map(({ key }) => key);
  if (keys.length === 0) throw new Error('Справочник категорий пуст — выполните pnpm db:seed');

  return llm.generate({
    system: systemPrompt(categories),
    prompt: text,
    schema: receiptExtractionSchema(keys as [string, ...string[]]),
  });
}
