-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "totalDebit" REAL NOT NULL DEFAULT 0,
    "totalCredit" REAL NOT NULL DEFAULT 0,
    "netBalance" REAL NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "balances_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_balances" ("customerId", "id", "lastUpdated", "netBalance", "totalCredit", "totalDebit") SELECT "customerId", "id", "lastUpdated", "netBalance", "totalCredit", "totalDebit" FROM "balances";
DROP TABLE "balances";
ALTER TABLE "new_balances" RENAME TO "balances";
CREATE UNIQUE INDEX "balances_customerId_key" ON "balances"("customerId");
CREATE TABLE "new_bank_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL DEFAULT 'YAPIKREDI',
    "direction" TEXT NOT NULL,
    "accountIban" TEXT NOT NULL,
    "maskedAccount" TEXT,
    "transactionDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "senderName" TEXT,
    "counterpartyName" TEXT,
    "balanceAfter" REAL,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,
    "matchedCustomerId" TEXT,
    "confidenceScore" REAL,
    "rawEmailData" TEXT,
    "parsedData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "bank_transactions_matchedCustomerId_fkey" FOREIGN KEY ("matchedCustomerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bank_transactions" ("accountIban", "amount", "balanceAfter", "bankCode", "confidenceScore", "counterpartyName", "createdAt", "direction", "id", "isMatched", "maskedAccount", "matchedCustomerId", "messageId", "parsedData", "processedAt", "rawEmailData", "senderName", "transactionDate") SELECT "accountIban", "amount", "balanceAfter", "bankCode", "confidenceScore", "counterpartyName", "createdAt", "direction", "id", "isMatched", "maskedAccount", "matchedCustomerId", "messageId", "parsedData", "processedAt", "rawEmailData", "senderName", "transactionDate" FROM "bank_transactions";
DROP TABLE "bank_transactions";
ALTER TABLE "new_bank_transactions" RENAME TO "bank_transactions";
CREATE UNIQUE INDEX "bank_transactions_messageId_key" ON "bank_transactions"("messageId");
CREATE TABLE "new_extract_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extractId" TEXT NOT NULL,
    "customerId" TEXT,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "debit" REAL NOT NULL DEFAULT 0,
    "credit" REAL NOT NULL DEFAULT 0,
    "documentType" TEXT,
    "voucherNo" TEXT,
    "dueDate" DATETIME,
    "amountBase" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "amountNet" REAL NOT NULL DEFAULT 0,
    "vat" REAL NOT NULL DEFAULT 0,
    "sourceRow" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "extract_transactions_extractId_fkey" FOREIGN KEY ("extractId") REFERENCES "extracts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "extract_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_extract_transactions" ("amountBase", "amountNet", "createdAt", "credit", "customerId", "date", "debit", "description", "discount", "documentType", "dueDate", "extractId", "id", "sourceRow", "vat", "voucherNo") SELECT "amountBase", "amountNet", "createdAt", "credit", "customerId", "date", "debit", "description", "discount", "documentType", "dueDate", "extractId", "id", "sourceRow", "vat", "voucherNo" FROM "extract_transactions";
DROP TABLE "extract_transactions";
ALTER TABLE "new_extract_transactions" RENAME TO "extract_transactions";
CREATE UNIQUE INDEX "extract_transactions_customerId_voucherNo_date_description_debit_credit_key" ON "extract_transactions"("customerId", "voucherNo", "date", "description", "debit", "credit");
CREATE TABLE "new_payment_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankTransactionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "matchedAmount" REAL NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "matchMethod" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_matches_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payment_matches_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payment_matches" ("bankTransactionId", "confidenceScore", "createdAt", "customerId", "id", "isConfirmed", "matchMethod", "matchedAmount") SELECT "bankTransactionId", "confidenceScore", "createdAt", "customerId", "id", "isConfirmed", "matchMethod", "matchedAmount" FROM "payment_matches";
DROP TABLE "payment_matches";
ALTER TABLE "new_payment_matches" RENAME TO "payment_matches";
CREATE TABLE "new_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "categoryId" TEXT,
    "customerId" TEXT,
    "userId" TEXT NOT NULL,
    "sourceFile" TEXT,
    "sourceRow" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("amount", "categoryId", "createdAt", "currency", "customerId", "date", "description", "id", "metadata", "sourceFile", "sourceRow", "type", "updatedAt", "userId") SELECT "amount", "categoryId", "createdAt", "currency", "customerId", "date", "description", "id", "metadata", "sourceFile", "sourceRow", "type", "updatedAt", "userId" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
