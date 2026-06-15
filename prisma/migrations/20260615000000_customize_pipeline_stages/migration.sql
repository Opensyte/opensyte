-- Customize sales pipeline stages.
-- Replaces the LeadStatus enum value set and remaps existing rows to the
-- closest new stage so no leads/deals are lost (migration-safe).
--
-- Old -> New mapping:
--   NEW         -> IDENTIFIED
--   CONTACTED   -> MESSAGED
--   QUALIFIED   -> IN_CONVERSATION
--   PROPOSAL    -> PROPOSAL_SENT
--   NEGOTIATION -> PROPOSAL_SENT
--   CLOSED_WON  -> WON
--   CLOSED_LOST -> LOST

-- 1. Create the new enum type with the new pipeline stages.
CREATE TYPE "LeadStatus_new" AS ENUM (
  'IDENTIFIED',
  'CONNECTION_SENT',
  'CONNECTED',
  'MESSAGED',
  'IN_CONVERSATION',
  'CALL_BOOKED',
  'PROPOSAL_SENT',
  'WON',
  'LOST'
);

-- 2. Migrate Customer.status (nullable) onto the new type, remapping values.
ALTER TABLE "Customer"
  ALTER COLUMN "status" TYPE "LeadStatus_new"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'IDENTIFIED'
      WHEN 'CONTACTED' THEN 'MESSAGED'
      WHEN 'QUALIFIED' THEN 'IN_CONVERSATION'
      WHEN 'PROPOSAL' THEN 'PROPOSAL_SENT'
      WHEN 'NEGOTIATION' THEN 'PROPOSAL_SENT'
      WHEN 'CLOSED_WON' THEN 'WON'
      WHEN 'CLOSED_LOST' THEN 'LOST'
      ELSE NULL
    END
  )::"LeadStatus_new";

-- 3. Migrate Deal.status (NOT NULL) onto the new type, remapping values.
ALTER TABLE "Deal"
  ALTER COLUMN "status" TYPE "LeadStatus_new"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'IDENTIFIED'
      WHEN 'CONTACTED' THEN 'MESSAGED'
      WHEN 'QUALIFIED' THEN 'IN_CONVERSATION'
      WHEN 'PROPOSAL' THEN 'PROPOSAL_SENT'
      WHEN 'NEGOTIATION' THEN 'PROPOSAL_SENT'
      WHEN 'CLOSED_WON' THEN 'WON'
      WHEN 'CLOSED_LOST' THEN 'LOST'
      ELSE 'IDENTIFIED'
    END
  )::"LeadStatus_new";

-- 4. Swap the old enum out for the new one.
DROP TYPE "LeadStatus";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
