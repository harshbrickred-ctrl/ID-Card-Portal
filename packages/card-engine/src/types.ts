import type { CardTemplatePreset } from "@idportal/contracts";

export type CardEmployee = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  department?: string | null;
  designation?: string | null;
  dateOfJoining?: string | null;
  photoBuffer?: Buffer | null;
};

export type CardOrg = {
  name: string;
  logoBuffer?: Buffer | null;
};

export type RenderCardInput = {
  employee: CardEmployee;
  org: CardOrg;
  preset: CardTemplatePreset;
};
