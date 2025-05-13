/*
  Warnings:

  - The `storyGoal` column on the `OnboardingSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tone` column on the `OnboardingSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "OnboardingSession" ADD COLUMN     "currentStep" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "storyGoal",
ADD COLUMN     "storyGoal" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "tone",
ADD COLUMN     "tone" TEXT[] DEFAULT ARRAY[]::TEXT[];
