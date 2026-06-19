import { NextResponse } from "next/server";
import { validateBody, withApi } from "@idportal/api-kit";
import { LoginSchema } from "@idportal/contracts";
import * as authService from "@/server/auth-service";
import { setSessionCookie } from "@/server/session-auth";

export const POST = withApi(async (req) => {
  const body = await validateBody(req, LoginSchema);
  const { user, sessionToken, expiresAt } = await authService.login(body);
  const response = NextResponse.json({
    success: true,
    data: { user },
    timestamp: new Date().toISOString(),
  });
  setSessionCookie(response, sessionToken, expiresAt);
  return response;
});
