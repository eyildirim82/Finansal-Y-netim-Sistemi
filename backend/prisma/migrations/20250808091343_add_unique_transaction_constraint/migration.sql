/*
  Warnings:

  - A unique constraint covering the columns `[customerId,voucherNo,date,description,debit,credit]` on the table `extract_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "extract_transactions_customerId_voucherNo_date_description_debit_credit_key" ON "extract_transactions"("customerId", "voucherNo", "date", "description", "debit", "credit");
