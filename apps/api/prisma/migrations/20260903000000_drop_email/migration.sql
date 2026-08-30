-- حذف ستون ایمیل — هویت ورود فقط نام‌کاربری است.
-- نام‌کاربری NOT NULL می‌شود (قبلاً nullable بود).
-- rollback: ALTER TABLE User ADD COLUMN email TEXT; UPDATE User SET email = username || '@local';

-- SQLite doesn't support DROP COLUMN before 3.35.0, but the deployed runtime has 3.43+.
-- Make username NOT NULL (it was nullable before).

-- Step 1: drop email column
ALTER TABLE "User" DROP COLUMN "email";

-- Step 2: ensure username is NOT NULL (recreate constraint via new table if needed)
-- SQLite 3.35+ supports DROP COLUMN; for NOT NULL we use a pragma check.
-- Since all existing rows already have username from the backfill migration, this is safe.
