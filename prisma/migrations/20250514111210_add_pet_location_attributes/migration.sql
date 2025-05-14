-- CreateTable
CREATE TABLE "PetAttributes" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "age" TEXT,
    "gender" TEXT,
    "breed" TEXT,
    "furColor" TEXT,
    "furStyle" TEXT,
    "markings" TEXT,
    "eyeColor" TEXT,
    "collar" TEXT,
    "outfit" TEXT,
    "accessories" TEXT,

    CONSTRAINT "PetAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectAttributes" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "material" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "details" TEXT,
    "accessories" TEXT,

    CONSTRAINT "ObjectAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationAttributes" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "locationType" TEXT,
    "setting" TEXT,
    "timeOfDay" TEXT,
    "weather" TEXT,
    "notable" TEXT,

    CONSTRAINT "LocationAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PetAttributes_elementId_key" ON "PetAttributes"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectAttributes_elementId_key" ON "ObjectAttributes"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationAttributes_elementId_key" ON "LocationAttributes"("elementId");

-- AddForeignKey
ALTER TABLE "PetAttributes" ADD CONSTRAINT "PetAttributes_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "MyWorldElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectAttributes" ADD CONSTRAINT "ObjectAttributes_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "MyWorldElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAttributes" ADD CONSTRAINT "LocationAttributes_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "MyWorldElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
