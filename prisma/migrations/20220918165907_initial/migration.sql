-- CreateEnum
CREATE TYPE "OfferSource" AS ENUM ('FREEWORK');

-- CreateTable
CREATE TABLE "Offer" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minimumSalary" INTEGER,
    "maximumSalary" INTEGER,
    "sourceId" TEXT NOT NULL,
    "source" "OfferSource" NOT NULL,
    "companyId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jobId" TEXT,
    "job" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_sourceId_key" ON "Offer"("sourceId");
