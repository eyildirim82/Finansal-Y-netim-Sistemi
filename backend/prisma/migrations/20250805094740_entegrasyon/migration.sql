-- AlterTable
ALTER TABLE "customers" ADD COLUMN "accountType" TEXT;
ALTER TABLE "customers" ADD COLUMN "lastPaymentDate" DATETIME;
ALTER TABLE "customers" ADD COLUMN "nameVariations" TEXT;
ALTER TABLE "customers" ADD COLUMN "originalName" TEXT;
ALTER TABLE "customers" ADD COLUMN "paymentPattern" TEXT;
ALTER TABLE "customers" ADD COLUMN "tag1" TEXT;
ALTER TABLE "customers" ADD COLUMN "tag2" TEXT;

-- CreateTable
CREATE TABLE "extracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "extracts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "extract_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extractId" TEXT NOT NULL,
    "customerId" TEXT,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "debit" REAL NOT NULL DEFAULT 0,
    "credit" REAL NOT NULL DEFAULT 0,
    "documentType" TEXT,
    "sourceRow" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "extract_transactions_extractId_fkey" FOREIGN KEY ("extractId") REFERENCES "extracts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "extract_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bank_transactions" (
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
    CONSTRAINT "bank_transactions_matchedCustomerId_fkey" FOREIGN KEY ("matchedCustomerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankTransactionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "matchedAmount" REAL NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "matchMethod" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_matches_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payment_matches_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cash_flows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "openingBalance" REAL NOT NULL,
    "closingBalance" REAL NOT NULL,
    "totalIncome" REAL NOT NULL DEFAULT 0,
    "totalExpense" REAL NOT NULL DEFAULT 0,
    "difference" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "report_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportKey" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "recordId" TEXT,
    "oldData" TEXT,
    "newData" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_messageId_key" ON "bank_transactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "report_cache_reportKey_key" ON "report_cache"("reportKey");
