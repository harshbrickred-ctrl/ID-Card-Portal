-- School ID Card MVP schema reset

DROP TABLE IF EXISTS "PrintBatchEmployee" CASCADE;
DROP TABLE IF EXISTS "PrintBatch" CASCADE;
DROP TABLE IF EXISTS "EmployeeSnapshot" CASCADE;
DROP TABLE IF EXISTS "Integration" CASCADE;
DROP TABLE IF EXISTS "OrganizationMember" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;
DROP TABLE IF EXISTS "PortalUser" CASCADE;

DROP TYPE IF EXISTS "BatchStatus" CASCADE;
DROP TYPE IF EXISTS "EmployeeStatus" CASCADE;
DROP TYPE IF EXISTS "IntegrationSource" CASCADE;
DROP TYPE IF EXISTS "OrgPlan" CASCADE;
DROP TYPE IF EXISTS "OrgMemberRole" CASCADE;

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "enrollId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "dob" TEXT,
    "bloodGroup" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdCardTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdCardTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cardCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintJobItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "PrintJobItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");
CREATE UNIQUE INDEX "Student_schoolId_enrollId_key" ON "Student"("schoolId", "enrollId");
CREATE INDEX "Student_schoolId_class_section_idx" ON "Student"("schoolId", "class", "section");
CREATE INDEX "Student_schoolId_name_idx" ON "Student"("schoolId", "name");
CREATE UNIQUE INDEX "IdCardTemplate_schoolId_key" ON "IdCardTemplate"("schoolId");
CREATE UNIQUE INDEX "PrintJobItem_jobId_studentId_key" ON "PrintJobItem"("jobId", "studentId");

ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdCardTemplate" ADD CONSTRAINT "IdCardTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintJobItem" ADD CONSTRAINT "PrintJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintJobItem" ADD CONSTRAINT "PrintJobItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
