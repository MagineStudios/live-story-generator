-- DropForeignKey
ALTER TABLE "StoryElement" DROP CONSTRAINT "StoryElement_elementId_fkey";

-- AddForeignKey
ALTER TABLE "StoryElement" ADD CONSTRAINT "StoryElement_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "MyWorldElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
