-- Enterprise: per-template field layout, student name split, school academic year
ALTER TABLE "School" ADD COLUMN "academicYear" TEXT;

ALTER TABLE "Student" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Student" ADD COLUMN "lastName" TEXT;

ALTER TABLE "IdCardTemplate" ADD COLUMN "layoutJson" JSONB;
ALTER TABLE "IdCardTemplate" ADD COLUMN "sourceWidth" INTEGER;
ALTER TABLE "IdCardTemplate" ADD COLUMN "sourceHeight" INTEGER;
