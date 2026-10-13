import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';

/**
 * Шифрование паролей приложений от почты (ТЗ, раздел 9): AES-256-GCM.
 * GCM не только прячет пароль, но и замечает подмену: изменённая строка в базе не расшифруется.
 * Формат хранения: «v1.iv.tag.шифротекст» в base64 — версия нужна, чтобы когда-нибудь сменить ключ.
 */
const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;

/** Ключ из переменной окружения MAIL_ENCRYPTION_KEY: 32 случайных байта в base64. */
export function parseEncryptionKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      'MAIL_ENCRYPTION_KEY должен содержать 32 байта в base64. Сгенерировать: ' +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return key;
}

export function encryptSecret(plainText: string, key: Buffer): string {
  // Новый случайный iv на каждое шифрование: одинаковые пароли дают разные строки.
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, ...[iv, tag, encrypted].map((part) => part.toString('base64'))].join('.');
}

export function decryptSecret(payload: string, key: Buffer): string {
  const [version, iv, tag, encrypted] = payload.split('.');
  if (version !== VERSION || !iv || !tag || encrypted === undefined) {
    throw new Error('Неизвестный формат зашифрованного пароля');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Переменная MAIL_ENCRYPTION_KEY в схемах окружения API и воркера. */
export const encryptionKeyEnvSchema = z
  .string({ error: 'MAIL_ENCRYPTION_KEY обязателен — см. .env.example' })
  .transform((value, ctx) => {
    try {
      return parseEncryptionKey(value);
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: (error as Error).message });
      return z.NEVER;
    }
  });
