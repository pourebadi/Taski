-- Add deletion request fields to WorkItem
-- rollback: ALTER TABLE WorkItem DROP COLUMN deletionReason; ALTER TABLE WorkItem DROP COLUMN deletionReasonText; ALTER TABLE WorkItem DROP COLUMN deletionRequestedById; ALTER TABLE WorkItem DROP COLUMN previousState;

ALTER TABLE "WorkItem" ADD COLUMN "deletionReason" TEXT;
ALTER TABLE "WorkItem" ADD COLUMN "deletionReasonText" TEXT;
ALTER TABLE "WorkItem" ADD COLUMN "deletionRequestedById" TEXT;
ALTER TABLE "WorkItem" ADD COLUMN "previousState" TEXT;
