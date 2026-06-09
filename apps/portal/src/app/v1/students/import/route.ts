import type { NextRequest } from "next/server";
import { BadRequestError, requireAuth, withApi } from "@idportal/api-kit";
import * as studentService from "@/server/student-service";

export const POST = withApi(async (req: NextRequest) => {
  await requireAuth(req);
  const form = await req.formData();
  const schoolId = form.get("schoolId");
  const file = form.get("file");
  if (typeof schoolId !== "string") throw new BadRequestError("schoolId is required");
  if (!(file instanceof File)) throw new BadRequestError("Excel file is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  return studentService.importStudentsFromExcel(schoolId, buffer);
});
