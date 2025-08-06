-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "extract_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_extract_transactions" ("createdAt", "credit", "customerId", "date", "debit", "description", "documentType", "extractId", "id", "sourceRow") SELECT "createdAt", "credit", "customerId", "date", "debit", "description", "documentType", "extractId", "id", "sourceRow" FROM "extract_transactions";
DROP TABLE "extract_transactions";
ALTER TABLE "new_extract_transactions" RENAME TO "extract_transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
