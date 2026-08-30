-- افزودن نام‌کاربری به‌عنوان هویت ورود؛ backfill از قسمت قبل از @ ایمیل
-- با مدیریت تداخل (ali, ali2, ali3 ...). states و رمزها دست‌نخورده.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

WITH ranked AS (
  SELECT
    "id",
    lower(substr("email", 1, instr("email", '@') - 1)) AS base,
    ROW_NUMBER() OVER (
      PARTITION BY lower(substr("email", 1, instr("email", '@') - 1))
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM "User"
)
UPDATE "User"
SET "username" = (
  SELECT base || CASE WHEN rn = 1 THEN '' ELSE CAST(rn AS TEXT) END
  FROM ranked WHERE ranked."id" = "User"."id"
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
