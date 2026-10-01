-- Persist provider-specific transaction classifications emitted by the email parser.
-- PDF/other import paths may leave this column NULL.
ALTER TABLE "bank_transactions"
ADD COLUMN "transactionType" TEXT;
