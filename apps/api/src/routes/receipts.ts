import type { Prisma } from '@how-much/db';
import {
  attentionEmailListSchema,
  categoryListSchema,
  createCashReceiptSchema,
  receiptDetailSchema,
  receiptListQuerySchema,
  receiptListSchema,
  receiptItemSchema,
  updateReceiptItemSchema,
  type ReceiptDetail,
} from '@how-much/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireUserId } from '../auth/requestUser.js';
import { HCHttpError } from '../errors.js';
import type { MailGateway } from '../mail/mailGateway.js';
import {
  mainCategory,
  merchantName,
  receiptWithItems,
  toReceiptListItem,
  topCategory,
  type ReceiptWithItems,
} from '../receipts/receiptView.js';

const idParamsSchema = z.object({ id: z.string() });

const receiptNotFound = () => new HCHttpError(404, 'receipt_not_found', 'Чек не найден');

/**
 * Курсор — дата и id последнего показанного чека. Сортировка по дате с id в придачу
 * не теряет и не повторяет чеки с одинаковым временем при подгрузке.
 */
function encodeCursor(receipt: { purchasedAt: Date; id: string }): string {
  return Buffer.from(`${receipt.purchasedAt.toISOString()}|${receipt.id}`).toString('base64url');
}

function decodeCursor(cursor: string): Prisma.ReceiptWhereInput {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const purchasedAt = new Date(iso ?? '');
  if (!id || Number.isNaN(purchasedAt.getTime())) {
    throw new HCHttpError(400, 'invalid_cursor', 'Некорректный курсор');
  }
  return { OR: [{ purchasedAt: { lt: purchasedAt } }, { purchasedAt, id: { lt: id } }] };
}

type CategoryRow = { key: string; name: string; parent: { key: string } | null };

function categoryRef(category: CategoryRow | null) {
  const topKey = topCategory(category);
  return category && topKey ? { key: category.key, name: category.name, topKey } : null;
}

function toReceiptDetail(receipt: ReceiptWithItems): ReceiptDetail {
  return {
    id: receipt.id,
    merchant: {
      name: merchantName(receipt),
      legalName: receipt.merchant?.name ?? null,
      inn: receipt.merchant?.inn ?? null,
    },
    category: mainCategory(receipt),
    purchasedAt: receipt.purchasedAt.toISOString(),
    total: receipt.totalKopecks,
    source: receipt.source,
    paymentType: receipt.paymentType,
    fiscal: receipt.fn && receipt.fd ? { fn: receipt.fn, fd: receipt.fd, fpd: receipt.fpd } : null,
    items: receipt.items.map((item) => ({
      id: item.id,
      name: item.rawName,
      quantity: Number(item.quantity),
      price: item.priceKopecks,
      sum: item.sumKopecks,
      category: categoryRef(item.category),
      categorySource: item.categorySource,
    })),
  };
}

export const receiptRoutes =
  (mail: MailGateway): FastifyPluginAsync =>
  async (app) => {
    app.get('/receipts', async (request) => {
      const userId = requireUserId(request);
      const { q, category, cursor, limit } = receiptListQuerySchema.parse(request.query);

      const filters: Prisma.ReceiptWhereInput[] = [{ userId }];
      if (q) {
        filters.push({
          OR: [
            { merchant: { displayName: { contains: q, mode: 'insensitive' } } },
            { items: { some: { rawName: { contains: q, mode: 'insensitive' } } } },
          ],
        });
      }
      if (category) {
        filters.push({
          items: { some: { category: { OR: [{ key: category }, { parent: { key: category } }] } } },
        });
      }
      if (cursor) filters.push(decodeCursor(cursor));

      // Берём на один больше, чтобы понять, есть ли следующая страница.
      const rows = await app.db.receipt.findMany({
        where: { AND: filters },
        orderBy: [{ purchasedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: receiptWithItems,
      });
      const page = rows.slice(0, limit);
      const last = page.at(-1);

      return receiptListSchema.parse({
        items: page.map(toReceiptListItem),
        nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
      });
    });

    /** Письма, которые не удалось разобрать: вкладка «Требуют внимания». */
    app.get('/receipts/attention', async (request) => {
      const userId = requireUserId(request);
      const rows = await app.db.rawEmail.findMany({
        where: { mailAccount: { userId }, parseStatus: 'failed' },
        orderBy: { receivedAt: 'desc' },
        take: 100,
      });
      return attentionEmailListSchema.parse(
        rows.map((row) => ({
          id: row.id,
          subject: row.subject || 'Без темы',
          from: row.fromAddress,
          receivedAt: row.receivedAt.toISOString(),
          reason: row.parseError ?? 'Не удалось разобрать письмо',
        })),
      );
    });

    async function findAttentionEmail(userId: string, id: string) {
      const row = await app.db.rawEmail.findFirst({
        where: { id, mailAccount: { userId }, parseStatus: 'failed' },
      });
      if (!row) throw new HCHttpError(404, 'email_not_found', 'Письмо не найдено');
      return row;
    }

    app.post('/receipts/attention/:id/retry', async (request, reply) => {
      const userId = requireUserId(request);
      const { id } = idParamsSchema.parse(request.params);
      await findAttentionEmail(userId, id);
      await app.db.rawEmail.update({
        where: { id },
        data: { parseStatus: 'pending', parseError: null },
      });
      await mail.enqueueReceiptParse(id);
      return reply.status(202).send();
    });

    /** «Это не чек»: письмо больше не показываем. */
    app.post('/receipts/attention/:id/dismiss', async (request, reply) => {
      const userId = requireUserId(request);
      const { id } = idParamsSchema.parse(request.params);
      await findAttentionEmail(userId, id);
      await app.db.rawEmail.update({ where: { id }, data: { parseStatus: 'ignored' } });
      return reply.status(204).send();
    });

    app.get('/receipts/:id', async (request) => {
      const userId = requireUserId(request);
      const { id } = idParamsSchema.parse(request.params);
      const receipt = await app.db.receipt.findFirst({
        where: { id, userId },
        include: receiptWithItems,
      });
      if (!receipt) throw receiptNotFound();
      return receiptDetailSchema.parse(toReceiptDetail(receipt));
    });

    /**
     * Трата наличными. Храним как чек с одной позицией в выбранной категории —
     * так её без доработок учитывают дашборд, фильтры и поиск.
     */
    app.post('/receipts', async (request, reply) => {
      const userId = requireUserId(request);
      const { title, amount, purchasedAt, categoryKey } = createCashReceiptSchema.parse(
        request.body,
      );
      const category = await app.db.category.findUnique({ where: { key: categoryKey } });
      if (!category) throw new HCHttpError(400, 'unknown_category', 'Такой категории нет');

      const receipt = await app.db.receipt.create({
        data: {
          userId,
          purchasedAt: new Date(purchasedAt),
          totalKopecks: amount,
          paymentType: 'cash',
          source: 'cash',
          note: title,
          items: {
            create: {
              position: 0,
              rawName: title,
              quantity: 1,
              priceKopecks: amount,
              sumKopecks: amount,
              categoryId: category.id,
              categorySource: 'user',
            },
          },
        },
        include: receiptWithItems,
      });
      return reply.status(201).send(receiptDetailSchema.parse(toReceiptDetail(receipt)));
    });

    /** Удалить чек: ошибочную трату наличными или чек, который не нужен в статистике. */
    app.delete('/receipts/:id', async (request, reply) => {
      const userId = requireUserId(request);
      const { id } = idParamsSchema.parse(request.params);
      const { count } = await app.db.receipt.deleteMany({ where: { id, userId } });
      if (count === 0) throw receiptNotFound();
      return reply.status(204).send();
    });

    app.get('/categories', async (request) => {
      requireUserId(request);
      const rows = await app.db.category.findMany({
        include: { parent: true },
        orderBy: { key: 'asc' },
      });
      return categoryListSchema.parse(
        rows.flatMap((row) => {
          const ref = categoryRef(row);
          return ref ? [{ ...ref, parentKey: row.parent?.key ?? null }] : [];
        }),
      );
    });

    /** Пользователь поправил категорию позиции — его выбор главнее модели. */
    app.patch('/receipt-items/:id', async (request) => {
      const userId = requireUserId(request);
      const { id } = idParamsSchema.parse(request.params);
      const { categoryKey } = updateReceiptItemSchema.parse(request.body);

      const item = await app.db.receiptItem.findFirst({ where: { id, receipt: { userId } } });
      if (!item) throw new HCHttpError(404, 'receipt_item_not_found', 'Позиция не найдена');
      const category = await app.db.category.findUnique({ where: { key: categoryKey } });
      if (!category) throw new HCHttpError(400, 'unknown_category', 'Такой категории нет');

      const updated = await app.db.receiptItem.update({
        where: { id },
        data: { categoryId: category.id, categorySource: 'user' },
        include: { category: { include: { parent: true } } },
      });
      return receiptItemSchema.parse({
        id: updated.id,
        name: updated.rawName,
        quantity: Number(updated.quantity),
        price: updated.priceKopecks,
        sum: updated.sumKopecks,
        category: categoryRef(updated.category),
        categorySource: updated.categorySource,
      });
    });
  };
