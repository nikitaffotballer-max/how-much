export { createPrismaClient } from './client.js';
// Типы моделей (User, Receipt, …) и PrismaClient.
export type * from '../generated/prisma/client.js';
// Перечисления (ReceiptSource, SubscriptionStatus, …) нужны и как значения, и как типы.
export * from '../generated/prisma/enums.js';
