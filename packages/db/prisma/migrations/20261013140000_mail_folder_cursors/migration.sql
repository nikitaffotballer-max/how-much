-- Позиция синхронизации теперь своя у каждой папки: UID в IMAP уникален только внутри папки.
-- Старый lastUid относился только к «Входящим»; папки перечитаются с даты импорта,
-- а уже сохранённые письма не задублируются (уникальность по Message-ID).
ALTER TABLE "mail_accounts" DROP COLUMN "lastUid",
ADD COLUMN     "folderCursors" JSONB NOT NULL DEFAULT '{}';
