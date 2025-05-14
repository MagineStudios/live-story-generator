-- CreateTable
CREATE TABLE "CharacterAttributes" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "age" TEXT,
    "gender" TEXT,
    "skinColor" TEXT,
    "hairColor" TEXT,
    "hairStyle" TEXT,
    "eyeColor" TEXT,
    "ethnicity" TEXT,
    "furColor" TEXT,
    "furStyle" TEXT,
    "markings" TEXT,
    "breed" TEXT,
    "outfit" TEXT,
    "accessories" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAttributes_elementId_key" ON "CharacterAttributes"("elementId");

-- AddForeignKey
ALTER TABLE "CharacterAttributes" ADD CONSTRAINT "CharacterAttributes_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "MyWorldElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
