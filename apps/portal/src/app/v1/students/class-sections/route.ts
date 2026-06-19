import type { NextRequest } from "next/server";
import { BadRequestError, withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";
import * as studentService from "@/server/student-service";

export const GET = withApi(async (req: NextRequest) => {
  await requireAuth(req);
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) throw new BadRequestError("schoolId is required");
  return studentService.getClassSectionSummary(schoolId);
});
