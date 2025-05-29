-- Add privacy and social features to stories
ALTER TABLE "Story" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Story" ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Story" ADD COLUMN "viewsCount" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for efficient queries
CREATE INDEX "Story_isPublic_createdAt_idx" ON "Story"("isPublic", "createdAt");
CREATE INDEX "Story_userId_createdAt_idx" ON "Story"("userId", "createdAt");

-- Create StoryLike table
CREATE TABLE "StoryLike" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryLike_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for one like per user per story
CREATE UNIQUE INDEX "StoryLike_storyId_userId_key" ON "StoryLike"("storyId", "userId");

-- Create indexes for efficient queries
CREATE INDEX "StoryLike_storyId_idx" ON "StoryLike"("storyId");
CREATE INDEX "StoryLike_userId_idx" ON "StoryLike"("userId");

-- Add foreign key constraints
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;