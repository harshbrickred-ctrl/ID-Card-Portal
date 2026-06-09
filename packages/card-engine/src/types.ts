import type { SchoolCardData, StudentCardData } from "@idportal/contracts";

export type { SchoolCardData, StudentCardData };

export type RenderStudentCardInput = {
  student: StudentCardData;
  school: SchoolCardData;
  templateBuffer?: Buffer | null;
};
