-- CreateTable
CREATE TABLE "facts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "predicate" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "facts_userId_idx" ON "facts"("userId");

-- CreateIndex
CREATE INDEX "facts_subject_idx" ON "facts"("subject");

-- CreateIndex
CREATE INDEX "facts_predicate_idx" ON "facts"("predicate");

-- CreateIndex
CREATE INDEX "facts_userId_subject_predicate_idx" ON "facts"("userId", "subject", "predicate");

-- CreateIndex
CREATE UNIQUE INDEX "facts_userId_subject_predicate_object_key" ON "facts"("userId", "subject", "predicate", "object");
