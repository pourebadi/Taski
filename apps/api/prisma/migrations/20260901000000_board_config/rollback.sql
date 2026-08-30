-- rollback: حذف ستون. (SQLite 3.35+ از DROP COLUMN پشتیبانی می‌کند)
ALTER TABLE "Organization" DROP COLUMN "boardConfig";
