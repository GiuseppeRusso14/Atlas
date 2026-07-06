-- CreateEnum
CREATE TYPE "ProfitEntryType" AS ENUM ('ACCANTONAMENTO', 'SPESA');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MENSILE', 'ANNUALE');

-- CreateTable
CREATE TABLE "ProfitEntry" (
    "id" TEXT NOT NULL,
    "type" "ProfitEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "quoteId" TEXT,
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "billing" "BillingCycle" NOT NULL DEFAULT 'MENSILE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfitEntry_type_date_idx" ON "ProfitEntry"("type", "date");

-- CreateIndex
CREATE INDEX "ProfitEntry_quoteId_idx" ON "ProfitEntry"("quoteId");

-- CreateIndex
CREATE INDEX "Subscription_active_idx" ON "Subscription"("active");

-- AddForeignKey
ALTER TABLE "ProfitEntry" ADD CONSTRAINT "ProfitEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitEntry" ADD CONSTRAINT "ProfitEntry_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitEntry" ADD CONSTRAINT "ProfitEntry_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
