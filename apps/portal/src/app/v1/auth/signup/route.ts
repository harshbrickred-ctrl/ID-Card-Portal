import { withApi, validateBody } from "@idportal/api-kit";
import { SignupSchema } from "@idportal/contracts";
import * as authService from "@/server/auth-service";

export const runtime = "nodejs";

export const POST = withApi(async (req) => {
  const body = await validateBody(req, SignupSchema);
  return authService.signup(body);
});
