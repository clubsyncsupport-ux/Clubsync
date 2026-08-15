-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN "attendanceNote" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "building" TEXT,
    "room" TEXT,
    "address" TEXT,
    "mapLink" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "allowedGrades" TEXT,
    "maxParticipants" INTEGER,
    "registrationDeadline" DATETIME,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "awardsServiceHours" BOOLEAN NOT NULL DEFAULT false,
    "defaultServiceHours" REAL NOT NULL DEFAULT 0,
    "serviceTaskDescription" TEXT,
    "attendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "eventImpact" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'NONE',
    "recurrenceParentId" TEXT,
    "recurrenceUntil" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("address", "allowedGrades", "awardsServiceHours", "bannerUrl", "building", "category", "clubId", "createdAt", "createdById", "defaultServiceHours", "description", "endAt", "eventImpact", "id", "mapLink", "maxParticipants", "recurrence", "recurrenceParentId", "recurrenceUntil", "registrationDeadline", "room", "serviceTaskDescription", "startAt", "status", "timezone", "title", "updatedAt", "visibility", "waitlistEnabled") SELECT "address", "allowedGrades", "awardsServiceHours", "bannerUrl", "building", "category", "clubId", "createdAt", "createdById", "defaultServiceHours", "description", "endAt", "eventImpact", "id", "mapLink", "maxParticipants", "recurrence", "recurrenceParentId", "recurrenceUntil", "registrationDeadline", "room", "serviceTaskDescription", "startAt", "status", "timezone", "title", "updatedAt", "visibility", "waitlistEnabled" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
