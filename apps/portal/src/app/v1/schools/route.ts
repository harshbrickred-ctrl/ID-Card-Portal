import { requireAuth, validateBody, withApi } from "@idportal/api-kit";
import { SchoolSchema } from "@idportal/contracts";
import * as schoolService from "@/server/school-service";

export const GET = withApi(async (req) => {
  await requireAuth(req);
  return schoolService.listSchools();
});

export const POST = withApi(async (req) => {
  await requireAuth(req);
  const body = await validateBody(req, SchoolSchema);
  return schoolService.createSchool(body);
});
