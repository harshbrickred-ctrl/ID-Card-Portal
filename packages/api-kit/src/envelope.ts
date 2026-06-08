import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./errors";

export type RouteHandler<Ctx = unknown> = (
  req: NextRequest,
  ctx: Ctx,
) => Promise<unknown> | unknown;

export function withApi<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
): (req: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      const result = await handler(req, ctx);
      if (result instanceof Response) {
        result.headers.set("x-request-id", requestId);
        return result;
      }
      return NextResponse.json(
        { success: true, data: result ?? null, timestamp },
        { headers: { "x-request-id": requestId } },
      );
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 500;
      const code = err instanceof ApiError ? err.code : "INTERNAL_ERROR";
      const message =
        err instanceof ApiError
          ? err.messageRaw
          : err instanceof Error
            ? err.message
            : "Internal server error";
      return NextResponse.json(
        { success: false, error: { code, message }, timestamp, requestId },
        { status, headers: { "x-request-id": requestId } },
      );
    }
  };
}
