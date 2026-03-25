-- CreateTable
CREATE TABLE "GoogleIntegrationState" (
    "id" INTEGER NOT NULL,
    "driveFolderId" TEXT,
    "sheetsSpreadsheetId" TEXT,
    "sheetsSheetName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleIntegrationState_pkey" PRIMARY KEY ("id")
);
