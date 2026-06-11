import type { SchoolCardData, StudentCardData } from "@idportal/contracts";
import type { TemplateLayout } from "./layout";

export type { SchoolCardData, StudentCardData };

export type RenderStudentCardInput = {
  student: StudentCardData;
  school: SchoolCardData;
  templateBuffer?: Buffer | null;
  signatureBuffer?: Buffer | null;
  layout?: TemplateLayout;
};
