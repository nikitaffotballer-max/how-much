import type { PrismaClient } from '@how-much/db';
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'hc_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Сессию продлеваем не чаще раза в сутки, чтобы не писать в базу на каждый запрос. */
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Создаёт сессию и возвращает токен для cookie. Сам токен в базе не хранится — только хеш. */
export async function createSession(
  db: PrismaClient,
  userId: string,
  userAgent: string | undefined,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: userAgent?.slice(0, 500) ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

/** Возвращает id пользователя по токену из cookie или null, если сессия не найдена или истекла. */
export async function resolveSession(db: PrismaClient, token: string): Promise<string | null> {
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (now - session.lastUsedAt.getTime() > SESSION_REFRESH_MS) {
    await db.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date(now), expiresAt: new Date(now + SESSION_TTL_MS) },
    });
  }
  return session.userId;
}

export async function deleteSession(db: PrismaClient, token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** После смены пароля выходим на всех устройствах, кроме текущего. */
export async function deleteOtherSessions(
  db: PrismaClient,
  userId: string,
  keepToken: string,
): Promise<void> {
  await db.session.deleteMany({ where: { userId, tokenHash: { not: hashToken(keepToken) } } });
}
