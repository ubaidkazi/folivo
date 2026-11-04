-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'LOAN_RECEIVABLE', 'LOAN_PAYABLE');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "JournalEntryType" AS ENUM ('OPENING_BALANCE', 'INCOME', 'EXPENSE', 'TRANSFER', 'CREDIT_CARD_PAYMENT', 'LENDING', 'BORROWING', 'REPAYMENT', 'REFUND', 'ADJUSTMENT', 'REVERSAL');

-- CreateTable
CREATE TABLE "financial_entity" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_account" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_account" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "systemKey" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "JournalEntryType" NOT NULL,
    "description" TEXT,
    "effectiveDate" DATE NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT NOT NULL,
    "reversesEntryId" TEXT,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_line" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "direction" "JournalDirection" NOT NULL,
    "amountCents" BIGINT NOT NULL,

    CONSTRAINT "journal_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_entity_ownerId_key" ON "financial_entity"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_account_ledgerAccountId_key" ON "financial_account"("ledgerAccountId");

-- CreateIndex
CREATE INDEX "financial_account_entityId_idx" ON "financial_account"("entityId");

-- CreateIndex
CREATE INDEX "financial_account_entityId_type_idx" ON "financial_account"("entityId", "type");

-- CreateIndex
CREATE INDEX "ledger_account_entityId_type_idx" ON "ledger_account"("entityId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_account_entityId_systemKey_key" ON "ledger_account"("entityId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_reversesEntryId_key" ON "journal_entry"("reversesEntryId");

-- CreateIndex
CREATE INDEX "journal_entry_entityId_effectiveDate_idx" ON "journal_entry"("entityId", "effectiveDate");

-- CreateIndex
CREATE INDEX "journal_entry_entityId_type_idx" ON "journal_entry"("entityId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_entityId_idempotencyKey_key" ON "journal_entry"("entityId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "journal_line_journalEntryId_idx" ON "journal_line"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_line_ledgerAccountId_idx" ON "journal_line"("ledgerAccountId");

-- AddForeignKey
ALTER TABLE "financial_entity" ADD CONSTRAINT "financial_entity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "financial_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "ledger_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "financial_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "financial_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reversesEntryId_fkey" FOREIGN KEY ("reversesEntryId") REFERENCES "journal_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "ledger_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
