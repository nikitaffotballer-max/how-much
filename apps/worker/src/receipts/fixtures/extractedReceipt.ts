import type { ExtractedReceipt } from '../extractReceipt.js';

/** Ответ модели на fixtures/ofd-receipt.html — таким он должен быть при верном разборе. */
export const EXTRACTED_RECEIPT: ExtractedReceipt = {
  isReceipt: true,
  merchantName: 'Пятёрочка',
  merchantLegalName: 'ООО «АГРОТОРГ»',
  merchantInn: '7825706086',
  purchasedAt: '2026-10-13T14:02:00+03:00',
  total: 606.52,
  paymentType: 'card',
  fn: '7380440700123456',
  fd: '48213',
  fpd: '3456789012',
  items: [
    { name: 'Молоко 930 мл', quantity: 2, price: 89.99, sum: 179.98, category: 'groceries.dairy' },
    { name: 'Хлеб Бородинский', quantity: 1, price: 54.9, sum: 54.9, category: 'groceries.bread' },
    { name: 'Бананы', quantity: 1.234, price: 139.9, sum: 172.64, category: 'groceries.produce' },
    { name: 'Fairy 450 мл', quantity: 1, price: 199, sum: 199, category: 'home.cleaning' },
  ],
};
