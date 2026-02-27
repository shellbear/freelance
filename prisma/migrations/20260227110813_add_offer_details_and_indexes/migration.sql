-- CreateIndex
CREATE INDEX "Offer_publishedAt_idx" ON "Offer"("publishedAt");

-- CreateIndex
CREATE INDEX "Offer_maximumSalary_minimumSalary_idx" ON "Offer"("maximumSalary" DESC, "minimumSalary" DESC);

-- CreateIndex
CREATE INDEX "Offer_company_idx" ON "Offer"("company");

-- CreateIndex
CREATE INDEX "Offer_job_idx" ON "Offer"("job");
