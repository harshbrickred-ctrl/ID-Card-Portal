import { withApi, validateBody } from "@idportal/api-kit";
import { LoginSchema } from "@idportal/contracts";
import * as authService from "@/server/auth-service";

export const POST = withApi(async (req) => {
  const body = await validateBody(req, LoginSchema);
  return authService.login(body);
});
