import type { PrismaClient } from '@how-much/db';
import type { LlmProvider } from '@how-much/llm';
import { checkReceipt, type CheckedReceipt, type ReceiptDraft } from './checkReceipt.js';
import { receiptTextFromHtml } from './emailText.js';
import { extractReceipt, type CategoryOption } from './extractReceipt.js';
import { parseReceiptTemplate, readRequisites } from './templateParser.js';

export interface ParseDeps {
  db: PrismaClient;
  /** null — разбор моделью выключен: что не разобрал шаблон, ждёт в очереди. */
  llm: LlmProvider | null;
}

/**
 * deferred — шаблон не подошёл, а модель выключена: письмо остаётся pending
 * и разберётся, когда модель включат (плановый обход снова поставит его в очередь).
 */
export type ParseResult = 'parsed' | 'duplicate' | 'ignored' | 'failed' | 'skipped' | 'deferred';

/** Письмо без чека внутри: например, Ozon присылает только кнопку «Скачать чек». */
const NO_RECEIPT_CONTENT = 'В письме нет самого чека — только ссылка на него';

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

/** «vkusvill.ru» — имя-заглушка из «Места расчётов», когда юридического имени в чеке не было. */
const isSiteName = (name: string) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(name);

async function findOrCreateMerchant(tx: Tx, receipt: CheckedReceipt) {
  const name = receipt.merchantLegalName ?? receipt.merchantName;
  if (receipt.merchantInn) {
    const existing = await tx.merchant.findUnique({ where: { inn: receipt.merchantInn } });
    if (!existing) {
      return tx.merchant.create({
        data: { inn: receipt.merchantInn, name, displayName: receipt.merchantName },
      });
    }
    // Пришёл чек с настоящим именем — заменяем им имя-сайт; остальные имена не трогаем.
    if (isSiteName(existing.displayName) && !isSiteName(receipt.merchantName)) {
      return tx.merchant.update({
        where: { id: existing.id },
        data: { name, displayName: receipt.merchantName },
      });
    }
    return existing;
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
 * Разбор письма в чек (ТЗ, 3.3). Сначала всё бесплатное: отсеиваем письма без чека и дубли
 * по фискальным номерам, пробуем шаблон. Модель — только если шаблон не справился.
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

  const userId = raw.mailAccount.userId;
  const text = receiptTextFromHtml(raw.html);
  const requisites = readRequisites(text);

  if (requisites.total === null && requisites.fn === null && requisites.fd === null) {
    await db.rawEmail.update({
      where: { id: raw.id },
      data: { parseStatus: 'ignored', parseError: NO_RECEIPT_CONTENT },
    });
    return 'ignored';
  }

  // Один чек часто приходит дважды (от магазина и от ОФД) — второй разбирать незачем.
  if (requisites.fn && requisites.fd) {
    const existing = await db.receipt.findUnique({
      where: { userId_fn_fd: { userId, fn: requisites.fn, fd: requisites.fd } },
      select: { id: true },
    });
    if (existing) {
      await db.rawEmail.update({ where: { id: raw.id }, data: { parseStatus: 'parsed' } });
      return 'duplicate';
    }
  }

  const categories = await loadCategories(db);
  let draft: ReceiptDraft;
  let source: 'template' | 'llm' = 'template';

  const template = parseReceiptTemplate(text, raw.subject);
  if (template && checkReceipt(template).ok) {
    draft = template;
  } else if (llm) {
    const extracted = await extractReceipt(llm, text, categories.options);
    if (!extracted.isReceipt) {
      await db.rawEmail.update({ where: { id: raw.id }, data: { parseStatus: 'ignored' } });
      return 'ignored';
    }
    draft = extracted;
    source = 'llm';
  } else {
    return 'deferred';
  }

  const checked = checkReceipt(draft);
  if (!checked.ok) {
    await db.rawEmail.update({
      where: { id: raw.id },
      data: { parseStatus: 'failed', parseError: checked.reason },
    });
    return 'failed';
  }

  const receipt = checked.receipt;

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
            // У шаблона категории нет: позиция возьмёт категорию магазина (ТЗ, 4: Free — по продавцу).
            categoryId: item.categoryKey
              ? (categories.idByKey.get(item.categoryKey) ?? null)
              : null,
            categorySource: item.categoryKey && source === 'llm' ? ('llm' as const) : null,
          })),
        },
      },
    });
    await tx.rawEmail.update({ where: { id: raw.id }, data: { parseStatus: 'parsed' } });
    return 'parsed';
  });
}
