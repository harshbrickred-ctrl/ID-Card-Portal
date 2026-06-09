-- Add user roles for delete permission control

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';
