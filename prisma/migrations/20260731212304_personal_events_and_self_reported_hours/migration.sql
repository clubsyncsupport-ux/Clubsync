-- CreateTable
CREATE TABLE "PersonalEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonalEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceHourRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clubId" TEXT,
    "eventId" TEXT,
    "hours" REAL NOT NULL,
    "taskDescription" TEXT,
    "eventImpact" TEXT,
    "reflection" TEXT,
    "organizationName" TEXT,
    "supervisorName" TEXT,
    "performedAt" DATETIME,
    "selfReported" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceHourRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceHourRecord_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceHourRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceHourRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceHourRecord" ("approvedAt", "approvedById", "clubId", "createdAt", "eventId", "eventImpact", "hours", "id", "reflection", "status", "taskDescription", "updatedAt", "userId") SELECT "approvedAt", "approvedById", "clubId", "createdAt", "eventId", "eventImpact", "hours", "id", "reflection", "status", "taskDescription", "updatedAt", "userId" FROM "ServiceHourRecord";
DROP TABLE "ServiceHourRecord";
ALTER TABLE "new_ServiceHourRecord" RENAME TO "ServiceHourRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
