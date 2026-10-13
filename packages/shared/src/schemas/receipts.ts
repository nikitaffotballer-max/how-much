import { z } from 'zod';
import { HC_CATEGORY_KEYS } from '../categories.js';

const kopecks = z.number().int();

export const receiptSourceSchema = z.enum(['email', 'cash', 'manual']);

/** Строка списка чеков — и в разделе «Чеки», и в «Последних покупках» на дашборде. */
export const receiptListItemSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  /** Категория, на которую пришлось больше всего денег в чеке. */
  category: z.enum(HC_CATEGORY_KEYS),
  purchasedAt: z.iso.datetime(),
  source: receiptSourceSchema,
  itemsPreview: z.string(),
  total: kopecks,
});

export type ReceiptListItem = z.infer<typeof receiptListItemSchema>;

/** Параметры GET /api/v1/receipts. */
export const receiptListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(HC_CATEGORY_KEYS).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type ReceiptListQuery = z.input<typeof receiptListQuerySchema>;

export const receiptListSchema = z.object({
  items: z.array(receiptListItemSchema),
  /** Передайте в cursor, чтобы получить следующую страницу; null — дальше чеков нет. */
  nextCursor: z.string().nullable(),
});

export type ReceiptList = z.infer<typeof receiptListSchema>;

export const categoryRefSchema = z.object({
  key: z.string(),
  name: z.string(),
  /** Верхний уровень — для цвета и иконки. */
  topKey: z.enum(HC_CATEGORY_KEYS),
});

export const receiptItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  price: kopecks,
  sum: kopecks,
  category: categoryRefSchema.nullable(),
  /** Кто выбрал категорию: магазин, модель или сам пользователь. */
  categorySource: z.enum(['merchant', 'llm', 'user']).nullable(),
});

export type ReceiptItem = z.infer<typeof receiptItemSchema>;

/** Ответ GET /api/v1/receipts/:id. */
export const receiptDetailSchema = z.object({
  id: z.string(),
  merchant: z.object({
    name: z.string(),
    legalName: z.string().nullable(),
    inn: z.string().nullable(),
  }),
  category: z.enum(HC_CATEGORY_KEYS),
  purchasedAt: z.iso.datetime(),
  total: kopecks,
  source: receiptSourceSchema,
  paymentType: z.string().nullable(),
  fiscal: z.object({ fn: z.string(), fd: z.string(), fpd: z.string().nullable() }).nullable(),
  items: z.array(receiptItemSchema),
});

export type ReceiptDetail = z.infer<typeof receiptDetailSchema>;

/** Тело PATCH /api/v1/receipt-items/:id. */
export const updateReceiptItemSchema = z.object({
  categoryKey: z.string().min(1),
});

/** Справочник категорий для выбора при правке: GET /api/v1/categories. */
export const categoryListSchema = z.array(
  categoryRefSchema.extend({ parentKey: z.string().nullable() }),
);

export type CategoryOption = z.infer<typeof categoryListSchema>[number];

/** Письмо, которое не удалось разобрать автоматически: GET /api/v1/receipts/attention. */
export const attentionEmailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.string(),
  receivedAt: z.iso.datetime(),
  reason: z.string(),
});

export type AttentionEmail = z.infer<typeof attentionEmailSchema>;

export const attentionEmailListSchema = z.array(attentionEmailSchema);
