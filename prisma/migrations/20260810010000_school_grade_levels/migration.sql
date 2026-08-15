-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradeLevels" TEXT NOT NULL DEFAULT 'Grade 8,Grade 9,Grade 10,Grade 11,Grade 12'
);
INSERT INTO "new_School" ("city", "country", "createdAt", "id", "name", "region") SELECT "city", "country", "createdAt", "id", "name", "region" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
