/*
  Warnings:

  - Added the required column `userId` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Önce varsayılan kullanıcı ID'sini al
-- Eğer hiç kullanıcı yoksa, yeni bir kullanıcı oluştur
INSERT OR IGNORE INTO "users" ("id", "username", "email", "password", "role", "isActive", "createdAt", "updatedAt") 
VALUES ('default-user-id', 'default', 'default@example.com', 'default', 'USER', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Yeni customers tablosunu oluştur
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
    "tag1" TEXT,
    "tag2" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Mevcut müşterileri yeni tabloya kopyala, varsayılan kullanıcı ID'si ile
INSERT INTO "new_customers" ("accountType", "address", "code", "createdAt", "id", "isActive", "lastPaymentDate", "name", "nameVariations", "originalName", "paymentPattern", "phone", "tag1", "tag2", "type", "updatedAt", "userId") 
SELECT "accountType", "address", "code", "createdAt", "id", "isActive", "lastPaymentDate", "name", "nameVariations", "originalName", "paymentPattern", "phone", "tag1", "tag2", "type", "updatedAt", (SELECT id FROM "users" LIMIT 1) as "userId" 
FROM "customers";

DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
