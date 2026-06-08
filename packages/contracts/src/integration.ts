import { z } from "zod";

export const INTEGRATION_SOURCES = ["vetan", "school-erp", "manual"] as const;
export type IntegrationSource = (typeof INTEGRATION_SOURCES)[number];

export const EmployeeStatusSchema = z.enum([
  "ACTIVE",
  "ON_LEAVE",
  "NOTICE",
  "INACTIVE",
]);

export const IntegrationEmployeeSchema = z.object({
  externalId: z.string(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  status: EmployeeStatusSchema,
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  photoUrl: z.string().url().nullable().optional(),
});

export const IntegrationOrganizationSchema = z.object({
  externalId: z.string(),
  name: z.string(),
  code: z.string().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export const IntegrationEmployeesV1Schema = z.object({
  schemaVersion: z.literal("1"),
  organization: IntegrationOrganizationSchema,
  employees: z.array(IntegrationEmployeeSchema),
});

export type IntegrationEmployeesV1 = z.infer<typeof IntegrationEmployeesV1Schema>;

export const SsoConnectClaimsSchema = z.object({
  source: z.enum(["vetan", "school-erp"]),
  externalOrgId: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  permissions: z.array(z.enum(["id-cards:read", "id-cards:write"])),
  orgName: z.string(),
  apiBaseUrl: z.string().url(),
});

export type SsoConnectClaims = z.infer<typeof SsoConnectClaimsSchema>;

export const CARD_TEMPLATE_PRESETS = [
  "corporate",
  "minimal",
  "photo-left",
] as const;

export type CardTemplatePreset = (typeof CARD_TEMPLATE_PRESETS)[number];

export const ORG_PLANS = ["FREE", "PRO"] as const;
export type OrgPlan = (typeof ORG_PLANS)[number];

export const PLAN_LIMITS: Record<OrgPlan, { maxEmployeesPerBatch: number; maxBatchesPerMonth: number }> = {
  FREE: { maxEmployeesPerBatch: 25, maxBatchesPerMonth: 5 },
  PRO: { maxEmployeesPerBatch: 500, maxBatchesPerMonth: 100 },
};
