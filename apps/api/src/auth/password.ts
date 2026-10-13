import { hash, verify } from '@node-rs/argon2';

/** argon2id — рекомендация OWASP для паролей; параметры библиотеки по умолчанию подходят. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

/**
 * Хеш несуществующего пароля. Если email не найден, всё равно проверяем пароль против него —
 * иначе по времени ответа можно узнать, зарегистрирован ли email.
 */
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hash('hc-dummy-password-for-timing');
  return dummyHash;
}
