import type { PrismaClient } from '@how-much/db';
import type { LlmProvider } from '@how-much/llm';
import { checkReceipt, type CheckedReceipt } from './checkReceipt.js';
import { receiptTextFromHtml } from './emailText.js';
import { extractReceipt, type CategoryOption } from './extractReceipt.js';

export interface ParseDeps {
  db: PrismaClient;
  llm: LlmProvider;
}

export type ParseResult = 'parsed' | 'duplicate' | 'ignored' | 'failed' | 'skipped';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/** Чек с одной кассы в пределах пары минут и на ту же сумму — это одна покупка. */
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

async function loadCategories(db: PrismaClient) {
  const rows = await db.category.findMany({ include: { parent: true }, orderBy: { key: 'asc' } });
  const options: CategoryOption[] = rows.map((row) => ({
    key: row.key,
    title: row.parent ? `${row.parent.name} → ${row.name}` : row.name,
  }));
  return { options, idByKey: new Map(rows.map((row) => [row.key, row.id])) };
}

async function findOrCreateMerchant(tx: Tx, receipt: CheckedReceipt) {
  const name = receipt.merchantLegalName ?? receipt.merchantName;
  if (receipt.merchantInn) {
    return tx.merchant.upsert({
      where: { inn: receipt.merchantInn },
      update: {},
      create: { inn: receipt.merchantInn, name, displayName: receipt.merchantName },
    });
  }
  const existing = await tx.merchant.findFirst({
    where: { inn: null, displayName: receipt.merchantName },
  });
  return existing ?? tx.merchant.create({ data: { name, displayName: receipt.merchantName } });
}

/** Дубль — тот же чек, пришедший вторым письмом: по фискальным реквизитам или по сумме и времени. */
function findDuplicate(tx: Tx, userId: string, merchantId: string, receipt: CheckedReceipt) {
  if (receipt.fn && receipt.fd) {
    return tx.receipt.findUnique({
      where: { userId_fn_fd: { userId, fn: receipt.fn, fd: receipt.fd } },
    });
  }
  const time = receipt.purchasedAt.getTime();
  return tx.receipt.findFirst({
    where: {
      userId,
      merchantId,
      totalKopecks: receipt.totalKopecks,
      purchasedAt: {
        gte: new Date(time - DUPLICATE_WINDOW_MS),
        lte: new Date(time + DUPLICATE_WINDOW_MS),
      },
    },
  });
}

/**
 * Разбор письма в чек (ТЗ, 3.3): текст письма → модель → проверка суммы → Receipt с позициями.
 * Ошибки модели пробрасываем — задачу повторит очередь; ошибки данных записываем в письмо.
 */
export async function parseRawEmail(
  { db, llm }: ParseDeps,
  rawEmailId: string,
): Promise<ParseResult> {
  const raw = await db.rawEmail.findUnique({
    where: { id: rawEmailId },
    include: { mailAccount: { select: { userId: true } } },
  });
  if (!raw || raw.parseStatus !== 'pending') return 'skipped';

  const categories = await loadCategories(db);
  const extracted = await extractReceipt(llm, receiptTextFromHtml(raw.html), categories.options);

  if (!extracted.isReceipt) {
    await db.rawEmail.update({ where: { id: raw.id }, data: { parseStatus: 'ignored' } });
    return 'ignored';
  }

  const checked = checkReceipt(extracted);
  if (!checked.ok) {
    await db.rawEmail.update({
      where: { id: raw.id },
      data: { parseStatus: 'failed', parseError: checked.reason },
    });
    return 'failed';
  }

  const receipt = checked.receipt;
  const userId = raw.mailAccount.userId;

  return db.$transaction(async (tx) => {
    const merchant = await findOrCreateMerchant(tx, receipt);

    if (await findDuplicate(tx, userId, merchant.id, receipt)) {
      await tx.rawEmail.update({ where: { id: raw.id }, data: { parseStatus: 'parsed' } });
      return 'duplicate';
    }

    await tx.receipt.create({
      data: {
        userId,
        merchantId: merchant.id,
        rawEmailId: raw.id,
        purchasedAt: receipt.purchasedAt,
        totalKopecks: receipt.totalKopecks,
        paymentType: receipt.paymentType,
        fn: receipt.fn,
        fd: receipt.fd,
        fpd: receipt.fpd,
        source: 'email',
        items: {
          create: receipt.items.map((item, position) => ({
            position,
            rawName: item.name,
            quantity: item.quantity,
            priceKopecks: item.priceKopecks,
            sumKopecks: item.sumKopecks,
            categoryId: categories.idByKey.get(item.categoryKey) ?? null,
            categorySource: 'llm' as const,
          })),
        },
      },
    });
    await tx.rawEmail.update({ where: { id: raw.id }, data: { parseStatus: 'parsed' } });
    return 'parsed';
  });
}
