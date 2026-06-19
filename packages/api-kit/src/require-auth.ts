import { ForbiddenError } from "./errors";

/** @deprecated Use PortalAuthUser from session-auth in the portal app */
export type PortalTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

export function requireSuperAdmin(user: PortalTokenPayload) {
  if (user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Only Super Admin can delete records");
  }
}

export function requireAdmin(user: PortalTokenPayload) {
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
}
