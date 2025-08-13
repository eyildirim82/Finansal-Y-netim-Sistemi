-- CreateTable
CREATE TABLE "pdf_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateTime" TEXT,
    "dateTimeIso" TEXT NOT NULL,
    "description" TEXT,
    "debit" REAL NOT NULL DEFAULT 0,
    "credit" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "balanceCurrency" TEXT NOT NULL,
    "operation" TEXT,
    "channel" TEXT,
    "direction" TEXT,
    "counterpartyName" TEXT,
    "counterpartyIban" TEXT,
    "hash" TEXT NOT NULL,
    "raw" TEXT,
    "category" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "pdf_transactions_hash_key" ON "pdf_transactions"("hash");
