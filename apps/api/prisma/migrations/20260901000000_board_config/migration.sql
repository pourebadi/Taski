-- افزودن چیدمان بورد در سطح سازمان (JSON در یک ستون متنی).
-- SQLite: ستون nullable، بدون نیاز به backfill. states و ماشین حالت دست‌نخورده.
ALTER TABLE "Organization" ADD COLUMN "boardConfig" TEXT;
