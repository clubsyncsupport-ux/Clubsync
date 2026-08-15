-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN "reminderOffsets" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PersonalEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "location" TEXT,
    "categoryId" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'NONE',
    "recurrenceParentId" TEXT,
    "recurrenceUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonalEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonalEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PersonalEventCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PersonalEvent" ("categoryId", "createdAt", "description", "endAt", "id", "location", "startAt", "title", "userId") SELECT "categoryId", "createdAt", "description", "endAt", "id", "location", "startAt", "title", "userId" FROM "PersonalEvent";
DROP TABLE "PersonalEvent";
ALTER TABLE "new_PersonalEvent" RENAME TO "PersonalEvent";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "platformRole" TEXT NOT NULL DEFAULT 'STUDENT',
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accountKind" TEXT NOT NULL DEFAULT 'STUDENT',
    "grade" TEXT,
    "schoolId" TEXT,
    "serviceHourGoal" INTEGER NOT NULL DEFAULT 50,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "calendarView" TEXT NOT NULL DEFAULT 'month',
    "weekStartsOn" TEXT NOT NULL DEFAULT 'sunday',
    "timeFormat" TEXT NOT NULL DEFAULT '12h',
    "reminderOffsets" TEXT NOT NULL DEFAULT '1440',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("accountKind", "accountStatus", "avatarUrl", "bio", "calendarView", "createdAt", "email", "firstName", "grade", "id", "lastName", "passwordHash", "platformRole", "schoolId", "serviceHourGoal", "theme", "timeFormat", "updatedAt", "username", "weekStartsOn") SELECT "accountKind", "accountStatus", "avatarUrl", "bio", "calendarView", "createdAt", "email", "firstName", "grade", "id", "lastName", "passwordHash", "platformRole", "schoolId", "serviceHourGoal", "theme", "timeFormat", "updatedAt", "username", "weekStartsOn" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

