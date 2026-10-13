import { describe, expect, it } from 'vitest';
import { detectMailProvider } from './mailProviders.js';

describe('detectMailProvider', () => {
  it('узнаёт провайдера по домену, в том числе по дополнительным', () => {
    expect(detectMailProvider('ivan@yandex.ru')).toBe('yandex');
    expect(detectMailProvider('ivan@ya.ru')).toBe('yandex');
    expect(detectMailProvider('ivan@bk.ru')).toBe('mailru');
    expect(detectMailProvider('Ivan@GMAIL.com')).toBe('gmail');
  });

  it('для неизвестного домена и строки без @ возвращает null', () => {
    expect(detectMailProvider('ivan@company.ru')).toBeNull();
    expect(detectMailProvider('ivan')).toBeNull();
  });
});
