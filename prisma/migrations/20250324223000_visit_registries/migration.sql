-- CreateEnum
CREATE TYPE "ScheduledVisitStatus" AS ENUM ('SCHEDULED', 'CHECKED_IN', 'DENIED');

-- CreateEnum
CREATE TYPE "WalkInVisitStatus" AS ENUM ('AWAITING_APPROVAL', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "ScheduledVisit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visitorFullName" TEXT NOT NULL,
    "visitorCompany" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "visitStartTime" TEXT NOT NULL,
    "visitEndTime" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "idReference" TEXT,
    "notifyEmails" TEXT[] NOT NULL,
    "status" "ScheduledVisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "checkedInAt" TIMESTAMP(3),
    "checkedInByEmail" TEXT,
    "deniedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkInVisit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visitorFullName" TEXT NOT NULL,
    "visitorCompany" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "curpOrId" TEXT,
    "ineOcrRaw" TEXT,
    "approvalEmail" TEXT NOT NULL,
    "approvalToken" TEXT NOT NULL,
    "status" "WalkInVisitStatus" NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WalkInVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalkInVisit_approvalToken_key" ON "WalkInVisit"("approvalToken");
