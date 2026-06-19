import { NextResponse } from "next/server";
import { withApi } from "@idportal/api-kit";
import { clearSessionCookie, destroySession, SESSION_COOKIE } from "@/server/session-auth";

export const POST = withApi(async (req) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);

  const response = NextResponse.json({
    success: true,
    data: { ok: true },
    timestamp: new Date().toISOString(),
  });
  clearSessionCookie(response);
  return response;
});
