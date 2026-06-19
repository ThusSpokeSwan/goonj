-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "ministry" TEXT,
    "state" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "genderRestriction" TEXT NOT NULL,
    "incomeCeiling" REAL,
    "occupations" TEXT NOT NULL,
    "casteCategories" TEXT NOT NULL,
    "expiryDate" DATETIME,
    "applicationSteps" TEXT NOT NULL,
    "documentUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
