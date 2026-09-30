-- Financial values are stored with two decimal places.
-- Existing DOUBLE PRECISION values are rounded explicitly during conversion.

ALTER TABLE "transactions"
  ALTER COLUMN "amount" TYPE DECIMAL(18,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "pdf_transactions"
  ALTER COLUMN "debit" TYPE DECIMAL(18,2) USING ROUND("debit"::numeric, 2),
  ALTER COLUMN "credit" TYPE DECIMAL(18,2) USING ROUND("credit"::numeric, 2),
  ALTER COLUMN "amount" TYPE DECIMAL(18,2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "balance" TYPE DECIMAL(18,2) USING ROUND("balance"::numeric, 2);

ALTER TABLE "balances"
  ALTER COLUMN "totalDebit" TYPE DECIMAL(18,2) USING ROUND("totalDebit"::numeric, 2),
  ALTER COLUMN "totalCredit" TYPE DECIMAL(18,2) USING ROUND("totalCredit"::numeric, 2),
  ALTER COLUMN "netBalance" TYPE DECIMAL(18,2) USING ROUND("netBalance"::numeric, 2);

ALTER TABLE "extract_transactions"
  ALTER COLUMN "debit" TYPE DECIMAL(18,2) USING ROUND("debit"::numeric, 2),
  ALTER COLUMN "credit" TYPE DECIMAL(18,2) USING ROUND("credit"::numeric, 2),
  ALTER COLUMN "amountBase" TYPE DECIMAL(18,2) USING ROUND("amountBase"::numeric, 2),
  ALTER COLUMN "discount" TYPE DECIMAL(18,2) USING ROUND("discount"::numeric, 2),
  ALTER COLUMN "amountNet" TYPE DECIMAL(18,2) USING ROUND("amountNet"::numeric, 2),
  ALTER COLUMN "vat" TYPE DECIMAL(18,2) USING ROUND("vat"::numeric, 2);

ALTER TABLE "bank_transactions"
  ALTER COLUMN "amount" TYPE DECIMAL(18,2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "balanceAfter" TYPE DECIMAL(18,2) USING ROUND("balanceAfter"::numeric, 2);

ALTER TABLE "payment_matches"
  ALTER COLUMN "matchedAmount" TYPE DECIMAL(18,2) USING ROUND("matchedAmount"::numeric, 2);

ALTER TABLE "cash_flows"
  ALTER COLUMN "openingBalance" TYPE DECIMAL(18,2) USING ROUND("openingBalance"::numeric, 2),
  ALTER COLUMN "closingBalance" TYPE DECIMAL(18,2) USING ROUND("closingBalance"::numeric, 2),
  ALTER COLUMN "totalIncome" TYPE DECIMAL(18,2) USING ROUND("totalIncome"::numeric, 2),
  ALTER COLUMN "totalExpense" TYPE DECIMAL(18,2) USING ROUND("totalExpense"::numeric, 2),
  ALTER COLUMN "difference" TYPE DECIMAL(18,2) USING ROUND("difference"::numeric, 2);
