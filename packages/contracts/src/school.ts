import { z } from "zod";

export const SchoolSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(12).regex(/^[A-Z0-9-]+$/i, "Code must be alphanumeric"),
  address: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const StudentSchema = z.object({
  schoolId: z.string().uuid(),
  enrollId: z.string().min(1),
  name: z.string().min(1),
  class: z.string().min(1),
  section: z.string().min(1),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const StudentUpdateSchema = StudentSchema.omit({ schoolId: true }).partial().extend({
  enrollId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  class: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
});

export const PrintPreviewSchema = z.object({
  schoolId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1),
});

export const PrintExecuteSchema = z.object({
  schoolId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1),
});

export type SchoolDto = z.infer<typeof SchoolSchema>;
export type StudentDto = z.infer<typeof StudentSchema>;
export type StudentUpdateDto = z.infer<typeof StudentUpdateSchema>;

export type StudentCardData = {
  enrollId: string;
  name: string;
  class: string;
  section: string;
  fatherName?: string | null;
  motherName?: string | null;
  dob?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
  photoBuffer?: Buffer | null;
};

export type SchoolCardData = {
  name: string;
  code: string;
  accentColor: string;
  logoBuffer?: Buffer | null;
};
