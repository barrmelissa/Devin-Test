-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerTeam" TEXT NOT NULL,
    "devEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stagingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "prodEnabled" BOOLEAN NOT NULL DEFAULT false,
    "prodRolloutPercent" INTEGER NOT NULL DEFAULT 0,
    "prodChangeStatus" TEXT NOT NULL DEFAULT 'none',
    "pendingProdEnabled" BOOLEAN,
    "pendingProdRolloutPercent" INTEGER,
    "prodChangeReason" TEXT,
    "prodChangeRequestedById" TEXT,
    "prodChangeRequestedAt" DATETIME,
    "flagServiceChangeId" TEXT,
    "lastChangedById" TEXT NOT NULL,
    "lastChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeatureFlag_prodChangeRequestedById_fkey" FOREIGN KEY ("prodChangeRequestedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FeatureFlag_lastChangedById_fkey" FOREIGN KEY ("lastChangedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_prodChangeStatus_idx" ON "FeatureFlag"("prodChangeStatus");

-- CreateIndex
CREATE INDEX "FeatureFlag_ownerTeam_idx" ON "FeatureFlag"("ownerTeam");
