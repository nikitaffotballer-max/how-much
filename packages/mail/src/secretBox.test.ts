import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, parseEncryptionKey } from './secretBox.js';

const key = randomBytes(32);

describe('secretBox', () => {
  it('расшифровывает то, что зашифровал', () => {
    const secret = 'abcd efgh ijkl mnop';
    expect(decryptSecret(encryptSecret(secret, key), key)).toBe(secret);
  });

  it('один и тот же пароль каждый раз шифруется по-разному', () => {
    expect(encryptSecret('secret', key)).not.toBe(encryptSecret('secret', key));
  });

  it('не расшифровывает чужим ключом', () => {
    const payload = encryptSecret('secret', key);
    expect(() => decryptSecret(payload, randomBytes(32))).toThrow();
  });

  it('замечает подмену шифротекста', () => {
    const [version, iv, tag] = encryptSecret('secret', key).split('.');
    const forged = [version, iv, tag, Buffer.from('другой').toString('base64')].join('.');
    expect(() => decryptSecret(forged, key)).toThrow();
  });

  it('проверяет длину ключа', () => {
    expect(parseEncryptionKey(key.toString('base64'))).toEqual(key);
    expect(() => parseEncryptionKey('c2hvcnQ=')).toThrow(/32 байта/);
  });
});
