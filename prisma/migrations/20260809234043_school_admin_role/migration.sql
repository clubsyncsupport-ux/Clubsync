-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "schoolAdminOfId" TEXT,
    "serviceHourGoal" INTEGER NOT NULL DEFAULT 50,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "calendarView" TEXT NOT NULL DEFAULT 'month',
    "weekStartsOn" TEXT NOT NULL DEFAULT 'sunday',
    "timeFormat" TEXT NOT NULL DEFAULT '12h',
    "reminderOffsets" TEXT NOT NULL DEFAULT '1440',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_schoolAdminOfId_fkey" FOREIGN KEY ("schoolAdminOfId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("accountKind", "accountStatus", "avatarUrl", "bio", "calendarView", "createdAt", "email", "firstName", "grade", "id", "lastName", "passwordHash", "platformRole", "reminderOffsets", "schoolId", "serviceHourGoal", "theme", "timeFormat", "updatedAt", "username", "weekStartsOn") SELECT "accountKind", "accountStatus", "avatarUrl", "bio", "calendarView", "createdAt", "email", "firstName", "grade", "id", "lastName", "passwordHash", "platformRole", "reminderOffsets", "schoolId", "serviceHourGoal", "theme", "timeFormat", "updatedAt", "username", "weekStartsOn" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
