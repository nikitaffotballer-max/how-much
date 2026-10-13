import { describe, expect, it } from 'vitest';
import { checkReceipt } from './checkReceipt.js';
import { parseReceiptTemplate, readRequisites } from './templateParser.js';

// Тексты повторяют вёрстку настоящих писем ОФД после html-to-text, но данные выдуманы.

const PLATFORMA_OFD = `
ООО "ЗЕЛЁНАЯ ЛАВКА"
ИНН 7700000001
КАССОВЫЙ ЧЕК №3136
Приход   13.10.2026 16:31
Кассир   Кассир
167 шт. x 1.00
Общая стоимость позиции с учетом скидок и наценок   167.00
Признак предмета расчета   Платеж
1 x 364.00
Общая стоимость позиции с учетом скидок и наценок   364.00
ИТОГ   = 531.00
НАЛИЧНЫМИ   0.00
БЕЗНАЛИЧНЫМИ   531.00
НДС ИТОГА ЧЕКА С РАСЧЁТНОЙ СТАВКОЙ 10/110   15.18
N ФН   7380000000000001
N ФД   57261
ФПД   1586314648
`;

const TAXCOM = `
Общество с ограниченной ответственностью "Красивое
Яблоко"
КАССОВЫЙ ЧЕК №: 149   25.02.26 03:43
ИНН 6600000002
ПРИХОД
19000511578 Маска для лица с ретинолом
25 гр ; шт.
5 x 198.00   990.00
НДС 22%   178.52
Признак способа расчета   ПОЛНЫЙ РАСЧЕТ
ИТОГО:   990.00
ИТОГО без НДС:   0.00
БЕЗНАЛИЧНЫМИ:   990.00
ФН №: 7380000000000002
ФД №: 4181
ФП: 1746096132
`;

const SABY = `
16.09.26 16:15                           КАССИР Иванова Анна
Приход                                   СМЕНА 134
Подушка ортопедическая 50х70
3590.00 x 2.000                          7180.00
                                         НДС 22%
ИТОГО                                    7 180.00
ККТ 0000736661029373                     ФН 7380000000000003
ФП 845723476                             ФД 22195
ИНН 3900000003
МЕСТО РАСЧЕТОВ "Торговый дом "Сон""
`;

const FIRST_OFD = `
АО "Овощи и фрукты"
ИНН: 7700000004
КАССОВЫЙ ЧЕК. ПРИХОД
10.10.2026 12:49
№    Наименование                                  Цена за ед.   Кол.   Сумма
1.   [M] Кефир 2,5%, 900 г                         146.00        1      146.00
2.   Огурцы короткоплодные                         198,0         0,155 кг.   30,69
ИТОГО:                                             176.69
Безналичными                                                     176.69
ФН № 7380000000000004   ФД № 46   ФП 1234567
`;

describe('readRequisites', () => {
  it('читает ФН, ФД, ФП и итог в разных написаниях', () => {
    expect(readRequisites(PLATFORMA_OFD)).toEqual({
      fn: '7380000000000001',
      fd: '57261',
      fpd: '1586314648',
      total: 531,
    });
    expect(readRequisites(SABY)).toMatchObject({ fd: '22195', fpd: '845723476', total: 7180 });
  });

  it('у ссылки на чек без содержимого реквизитов нет', () => {
    const ozon = 'ВАШ ЭЛЕКТРОННЫЙ ЧЕК\nПо вашему заказу сформирован электронный чек.\nСкачать чек';
    expect(readRequisites(ozon)).toEqual({ fn: null, fd: null, fpd: null, total: null });
  });
});

describe('parseReceiptTemplate', () => {
  it('Платформа ОФД: предоплата без названий, сумма строкой ниже', () => {
    const draft = parseReceiptTemplate(PLATFORMA_OFD, 'Чек + подарок');

    expect(draft).toMatchObject({
      merchantName: 'Зелёная лавка',
      merchantInn: '7700000001',
      purchasedAt: '2026-10-13T16:31:00+03:00',
      paymentType: 'card',
    });
    expect(draft?.items.map((item) => [item.name, item.quantity, item.price, item.sum])).toEqual([
      ['Оплата без списка товаров', 167, 1, 167],
      ['Оплата без списка товаров', 1, 364, 364],
    ]);
  });

  it('Taxcom: название на двух строках, артикул и единица убраны', () => {
    const draft = parseReceiptTemplate(TAXCOM, 'Кассовый чек');

    expect(draft).toMatchObject({
      merchantName: 'Красивое Яблоко',
      purchasedAt: '2026-02-25T03:43:00+03:00',
    });
    expect(draft?.items).toEqual([
      {
        name: 'Маска для лица с ретинолом 25 гр',
        quantity: 5,
        price: 198,
        sum: 990,
        category: null,
      },
    ]);
  });

  it('Saby: сначала цена, потом количество', () => {
    const draft = parseReceiptTemplate(SABY, 'Чек от ООО "Торговый дом "Сон""');

    expect(draft?.merchantName).toBe('Торговый дом Сон');
    expect(draft?.items).toEqual([
      { name: 'Подушка ортопедическая 50х70', quantity: 2, price: 3590, sum: 7180, category: null },
    ]);
  });

  it('таблица Первого ОФД: маркировка и единицы не мешают', () => {
    const draft = parseReceiptTemplate(FIRST_OFD, 'Чек');

    expect(draft?.merchantName).toBe('Овощи и фрукты');
    expect(draft?.items.map((item) => [item.name, item.quantity, item.sum])).toEqual([
      ['Кефир 2,5%, 900 г', 1, 146],
      ['Огурцы короткоплодные', 0.155, 30.69],
    ]);
  });

  it.each([
    [PLATFORMA_OFD, ''],
    [TAXCOM, ''],
    // У Saby юридическое имя продавца — только в теме письма.
    [SABY, 'Чек от ООО "Торговый дом "Сон""'],
    [FIRST_OFD, ''],
  ])('сумма позиций сходится с итогом', (text, subject) => {
    const draft = parseReceiptTemplate(text, subject);
    expect(draft && checkReceipt(draft).ok).toBe(true);
  });

  it('незнакомый формат отдаёт модели', () => {
    expect(parseReceiptTemplate('Кассовый чек\nИТОГ 100.00\nФН 7380000000000005', '')).toBeNull();
  });
});
