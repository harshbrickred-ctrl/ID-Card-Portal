import { prisma } from "@idportal/db";
import { withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";

export const GET = withApi(async (req) => {
  const auth = await requireAuth(req);
  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) return null;
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
});
