import { withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";
import * as dashboardService from "@/server/dashboard-service";

export const GET = withApi(async (req) => {
  await requireAuth(req);
  return dashboardService.getDashboard();
});
