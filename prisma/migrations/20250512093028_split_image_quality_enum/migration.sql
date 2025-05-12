-- CreateEnum
CREATE TYPE "ImageQuality" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "ImageVariant" ADD COLUMN     "quality" "ImageQuality" NOT NULL DEFAULT 'HIGH';
