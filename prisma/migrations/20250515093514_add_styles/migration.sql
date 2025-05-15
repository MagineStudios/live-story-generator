-- AlterTable
ALTER TABLE "OnboardingSession" ADD COLUMN     "visualStyleId" TEXT;

-- AlterTable
ALTER TABLE "VisualStyle" ADD COLUMN     "color" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "promptTemplate" TEXT,
ADD COLUMN     "textColor" TEXT;
