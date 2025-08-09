/*
  Warnings:

  - You are about to drop the column `dueDate` on the `customers` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "nameVariations" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "accountType" TEXT,
    "lastPaymentDate" DATETIME,
    "paymentPattern" TEXT,
    "dueDays" INTEGER,
    "tag1" TEXT,
    "tag2" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_customers" ("accountType", "address", "code", "createdAt", "id", "isActive", "lastPaymentDate", "name", "nameVariations", "originalName", "paymentPattern", "phone", "tag1", "tag2", "type", "updatedAt", "userId") SELECT "accountType", "address", "code", "createdAt", "id", "isActive", "lastPaymentDate", "name", "nameVariations", "originalName", "paymentPattern", "phone", "tag1", "tag2", "type", "updatedAt", "userId" FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
