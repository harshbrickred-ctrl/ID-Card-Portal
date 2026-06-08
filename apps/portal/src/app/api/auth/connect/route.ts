import { NextRequest, NextResponse } from "next/server";
import * as ssoService from "@/server/sso-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source");
  const token = req.nextUrl.searchParams.get("token");
  if (!source || !token) {
    return NextResponse.json({ error: "Missing source or token" }, { status: 400 });
  }
  try {
    const result = await ssoService.handleSsoConnect(source, token);
    return NextResponse.json({ token: result.token, organizationId: result.organizationId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SSO failed" },
      { status: 401 },
    );
  }
}
