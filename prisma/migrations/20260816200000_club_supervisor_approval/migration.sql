-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "missionStatement" TEXT,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "schoolId" TEXT NOT NULL,
    "meetingSchedule" TEXT,
    "meetingLocation" TEXT,
    "contactEmail" TEXT,
    "instagramUrl" TEXT,
    "websiteUrl" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mergedIntoId" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "pendingSupervisorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Club_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Club_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Club_pendingSupervisorId_fkey" FOREIGN KEY ("pendingSupervisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Club" ("bannerUrl", "category", "color", "contactEmail", "createdAt", "createdById", "description", "id", "instagramUrl", "logoUrl", "meetingLocation", "meetingSchedule", "mergedIntoId", "missionStatement", "name", "requiresApproval", "schoolId", "slug", "status", "updatedAt", "websiteUrl") SELECT "bannerUrl", "category", "color", "contactEmail", "createdAt", "createdById", "description", "id", "instagramUrl", "logoUrl", "meetingLocation", "meetingSchedule", "mergedIntoId", "missionStatement", "name", "requiresApproval", "schoolId", "slug", "status", "updatedAt", "websiteUrl" FROM "Club";
DROP TABLE "Club";
ALTER TABLE "new_Club" RENAME TO "Club";
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
