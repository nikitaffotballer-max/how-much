-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('yandex', 'mailru', 'gmail');

-- CreateEnum
CREATE TYPE "MailAccountStatus" AS ENUM ('active', 'auth_failed', 'disabled');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('pending', 'parsed', 'failed', 'ignored');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('kg', 'l', 'pcs');

-- CreateEnum
CREATE TYPE "ReceiptSource" AS ENUM ('email', 'cash', 'manual');

-- CreateEnum
CREATE TYPE "CategorySource" AS ENUM ('merchant', 'llm', 'user');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'canceled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "MailProvider" NOT NULL,
    "login" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "status" "MailAccountStatus" NOT NULL DEFAULT 'active',
    "lastSyncAt" TIMESTAMP(3),
    "lastUid" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_emails" (
    "id" TEXT NOT NULL,
    "mailAccountId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "html" TEXT NOT NULL,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'pending',
    "parseError" TEXT,
    "deleteAfter" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "inn" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "defaultCategoryId" TEXT,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "baseName" TEXT NOT NULL,
    "unit" "ProductUnit",
    "unitSize" DECIMAL(12,3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_normalization_cache" (
    "rawNameHash" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_normalization_cache_pkey" PRIMARY KEY ("rawNameHash")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantId" TEXT,
    "rawEmailId" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "totalKopecks" INTEGER NOT NULL,
    "paymentType" TEXT,
    "fn" TEXT,
    "fd" TEXT,
    "fpd" TEXT,
    "source" "ReceiptSource" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "rawName" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "priceKopecks" INTEGER NOT NULL,
    "sumKopecks" INTEGER NOT NULL,
    "productId" TEXT,
    "categoryId" TEXT,
    "categorySource" "CategorySource",

    CONSTRAINT "receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_category_overrides" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "merchantId" TEXT,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "user_category_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardLabel" TEXT NOT NULL,
    "bookedAt" TIMESTAMP(3) NOT NULL,
    "amountKopecks" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "receiptId" TEXT,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "limitKopecks" INTEGER NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "paymentMethodId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "amountKopecks" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mail_accounts_userId_login_key" ON "mail_accounts"("userId", "login");

-- CreateIndex
CREATE INDEX "raw_emails_deleteAfter_idx" ON "raw_emails"("deleteAfter");

-- CreateIndex
CREATE UNIQUE INDEX "raw_emails_mailAccountId_messageId_key" ON "raw_emails"("mailAccountId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_inn_key" ON "merchants"("inn");

-- CreateIndex
CREATE UNIQUE INDEX "products_normalizedName_key" ON "products"("normalizedName");

-- CreateIndex
CREATE INDEX "products_baseName_idx" ON "products"("baseName");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_rawEmailId_key" ON "receipts"("rawEmailId");

-- CreateIndex
CREATE INDEX "receipts_userId_purchasedAt_idx" ON "receipts"("userId", "purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_userId_fn_fd_key" ON "receipts"("userId", "fn", "fd");

-- CreateIndex
CREATE INDEX "receipt_items_productId_idx" ON "receipt_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_items_receiptId_position_key" ON "receipt_items"("receiptId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "user_category_overrides_userId_productId_key" ON "user_category_overrides"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "user_category_overrides_userId_merchantId_key" ON "user_category_overrides"("userId", "merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_receiptId_key" ON "bank_transactions"("receiptId");

-- CreateIndex
CREATE INDEX "bank_transactions_userId_bookedAt_idx" ON "bank_transactions"("userId", "bookedAt");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_categoryId_key" ON "budgets"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_userId_key" ON "telegram_links"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_chatId_key" ON "telegram_links"("chatId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_emails" ADD CONSTRAINT "raw_emails_mailAccountId_fkey" FOREIGN KEY ("mailAccountId") REFERENCES "mail_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_rawEmailId_fkey" FOREIGN KEY ("rawEmailId") REFERENCES "raw_emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category_overrides" ADD CONSTRAINT "user_category_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category_overrides" ADD CONSTRAINT "user_category_overrides_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category_overrides" ADD CONSTRAINT "user_category_overrides_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category_overrides" ADD CONSTRAINT "user_category_overrides_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
