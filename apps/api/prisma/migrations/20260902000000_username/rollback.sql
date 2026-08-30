-- rollback
DROP INDEX IF EXISTS "User_username_key";
ALTER TABLE "User" DROP COLUMN "username";
