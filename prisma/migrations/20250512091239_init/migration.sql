-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('SUBMITTED', 'PROCESSING', 'SUCCEED', 'FAILED');

-- CreateEnum
CREATE TYPE "VideoQuality" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "visualStyle" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryPage" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "chosenImageId" TEXT,

    CONSTRAINT "StoryPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageVariant" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "userId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "isChosen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT,
    "pageId" TEXT,
    "prompt" TEXT NOT NULL,
    "quality" "VideoQuality" NOT NULL DEFAULT 'LOW',
    "status" "JobStatus" NOT NULL DEFAULT 'SUBMITTED',
    "videoUrl" TEXT,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT,
    "prompt" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'SUBMITTED',
    "musicUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryPage_chosenImageId_key" ON "StoryPage"("chosenImageId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPage" ADD CONSTRAINT "StoryPage_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPage" ADD CONSTRAINT "StoryPage_chosenImageId_fkey" FOREIGN KEY ("chosenImageId") REFERENCES "ImageVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageVariant" ADD CONSTRAINT "ImageVariant_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "StoryPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageVariant" ADD CONSTRAINT "ImageVariant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTask" ADD CONSTRAINT "VideoTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTask" ADD CONSTRAINT "VideoTask_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTask" ADD CONSTRAINT "VideoTask_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "StoryPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicTask" ADD CONSTRAINT "MusicTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicTask" ADD CONSTRAINT "MusicTask_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
