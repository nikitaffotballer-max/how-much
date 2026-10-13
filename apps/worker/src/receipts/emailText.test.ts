import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { receiptTextFromHtml } from './emailText.js';

const html = readFileSync(new URL('./fixtures/ofd-receipt.html', import.meta.url), 'utf8');

describe('receiptTextFromHtml', () => {
  const text = receiptTextFromHtml(html);

  it('оставляет строки чека и фискальные реквизиты', () => {
    expect(text).toContain('Молоко Простоквашино 2,5% 930 мл');
    expect(text).toContain('606.52');
    expect(text).toContain('7380440700123456');
  });

  it('вырезает адреса почты, телефоны, картинки и ссылки', () => {
    expect(text).not.toContain('buyer@example.com');
    expect(text).not.toContain('555-55-05');
    expect(text).not.toContain('logo.png');
    expect(text).not.toContain('check.ofd.example');
    expect(text).toContain('[email]');
  });
});
