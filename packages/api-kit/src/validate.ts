import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { BadRequestError } from "./errors";

export async function validateBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues.map((i) => i.message));
  }
  return parsed.data;
}
