import { withApi, requireAuth } from "@idportal/api-kit";
import * as dashboardService from "@/server/dashboard-service";

export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req);
  return dashboardService.getDashboard(user.organizationId);
});
