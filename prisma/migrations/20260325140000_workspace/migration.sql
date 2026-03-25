-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "sheetsSpreadsheetId" TEXT NOT NULL,
    "sheetsSheetName" TEXT NOT NULL,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWorkspace" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_joinCode_key" ON "Workspace"("joinCode");

-- CreateIndex
CREATE INDEX "UserWorkspace_userEmail_idx" ON "UserWorkspace"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspace_userEmail_workspaceId_key" ON "UserWorkspace"("userEmail", "workspaceId");

-- AddForeignKey
ALTER TABLE "UserWorkspace" ADD CONSTRAINT "UserWorkspace_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
