import type { NextRequest } from "next/server";
import { validateBody, withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";
import { StudentSchema } from "@idportal/contracts";
import * as studentService from "@/server/student-service";

export const GET = withApi(async (req: NextRequest) => {
  await requireAuth(req);
  const url = req.nextUrl;
  const schoolId = url.searchParams.get("schoolId");
  if (!schoolId) return [];
  return studentService.listStudents({
    schoolId,
    enrollId: url.searchParams.get("enrollId") ?? undefined,
    name: url.searchParams.get("name") ?? undefined,
    class: url.searchParams.get("class") ?? undefined,
    section: url.searchParams.get("section") ?? undefined,
  });
});

export const POST = withApi(async (req) => {
  await requireAuth(req);
  const body = await validateBody(req, StudentSchema);
  return studentService.createStudent(body);
});
