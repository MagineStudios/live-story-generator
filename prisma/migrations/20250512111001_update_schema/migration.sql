/*
  Warnings:

  - Added the required column `styleName` to the `Story` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ElementCategory" AS ENUM ('CHARACTER', 'PET', 'LOCATION', 'OBJECT');

-- AlterTable
ALTER TABLE "MusicTask" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "animationUrl" TEXT,
ADD COLUMN     "musicUrl" TEXT,
ADD COLUMN     "styleName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StoryPage" ADD COLUMN     "editedText" TEXT,
ADD COLUMN     "microprompts" TEXT[];

-- CreateTable
CREATE TABLE "StoryElement" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MyWorldElement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "category" "ElementCategory" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isDetectedInStory" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MyWorldElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicLibrary" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "category" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "musicUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualStyle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryElement_storyId_elementId_key" ON "StoryElement"("storyId", "elementId");

-- CreateIndex
CREATE INDEX "MyWorldElement_userId_category_idx" ON "MyWorldElement"("userId", "category");

-- AddForeignKey
ALTER TABLE "StoryElement" ADD CONSTRAINT "StoryElement_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryElement" ADD CONSTRAINT "StoryElement_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "MyWorldElement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MyWorldElement" ADD CONSTRAINT "MyWorldElement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
