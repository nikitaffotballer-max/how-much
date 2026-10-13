import { describe, expect, it } from 'vitest';
import { isReceiptEmail } from './receiptSenders.js';

describe('isReceiptEmail', () => {
  it('принимает любые письма от ОФД, включая поддомены', () => {
    expect(isReceiptEmail('noreply@ofd.ru', 'Ваш документ')).toBe(true);
    expect(isReceiptEmail('echeck@mail.1-ofd.ru', '')).toBe(true);
  });

  it('от магазина принимает только письма про чек', () => {
    expect(isReceiptEmail('noreply@ozon.ru', 'Электронный чек по заказу 123')).toBe(true);
    expect(isReceiptEmail('news@ozon.ru', 'Скидки до 70% только сегодня')).toBe(false);
  });

  it('не путает похожие домены и игнорирует неизвестных отправителей', () => {
    expect(isReceiptEmail('noreply@notofd.ru', 'Чек')).toBe(false);
    expect(isReceiptEmail('friend@gmail.com', 'Чек за ужин')).toBe(false);
  });
});
