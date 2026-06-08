import { withApi, requireAuth, validateBody } from "@idportal/api-kit";
import { z } from "zod";
import * as syncService from "@/server/sync-service";

export const runtime = "nodejs";

const CsvImportSchema = z.object({
  rows: z
    .array(
      z.object({
        employeeCode: z.string().min(1),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        department: z.string().optional(),
        designation: z.string().optional(),
        email: z.string().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const POST = withApi(async (req) => {
  const user = await requireAuth(req);
  const body = await validateBody(req, CsvImportSchema);
  return syncService.importCsvEmployees(user.organizationId, body.rows);
});
