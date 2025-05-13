/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `OnboardingSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_userId_key" ON "OnboardingSession"("userId");
