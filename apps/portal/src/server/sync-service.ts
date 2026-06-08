import { prisma, type EmployeeStatus } from "@idportal/db";
import {
  IntegrationEmployeesV1Schema,
  PLAN_LIMITS,
  type IntegrationEmployeesV1,
} from "@idportal/contracts";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";

function mapStatus(status: string): EmployeeStatus {
  if (status === "ON_LEAVE") return "ON_LEAVE";
  if (status === "NOTICE") return "NOTICE";
  if (status === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

async function fetchRemoteEmployees(
  apiBaseUrl: string,
  apiKey: string,
): Promise<IntegrationEmployeesV1> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/integrations/id-cards/employees`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new BadRequestError(`Sync failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const data = json?.data ?? json;
  return IntegrationEmployeesV1Schema.parse(data);
}

export async function syncIntegration(
  organizationId: string,
  integrationId: string,
  apiKey?: string,
) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, organizationId },
    include: { organization: true },
  });
  if (!integration) throw new NotFoundError("Integration not found");
  if (integration.source === "manual") {
    throw new BadRequestError("Manual integrations do not support remote sync");
  }
  if (!integration.apiBaseUrl) {
    throw new BadRequestError("API base URL not configured");
  }
  const key = apiKey ?? integration.apiKeyEnc;
  if (!key) throw new BadRequestError("Integration API key required");

  const remote = await fetchRemoteEmployees(integration.apiBaseUrl, key);

  if (remote.organization.logoUrl && !integration.organization.logoUrl) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { logoUrl: remote.organization.logoUrl, name: remote.organization.name },
    });
  }

  const limit = PLAN_LIMITS[integration.organization.plan].maxEmployeesPerBatch * 20;
  if (remote.employees.length > limit) {
    throw new BadRequestError(`Employee count exceeds plan limit (${limit})`);
  }

  for (const emp of remote.employees) {
    await prisma.employeeSnapshot.upsert({
      where: {
        organizationId_externalId: {
          organizationId,
          externalId: emp.externalId,
        },
      },
      create: {
        organizationId,
        externalId: emp.externalId,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        department: emp.department,
        designation: emp.designation,
        status: mapStatus(emp.status),
        dateOfJoining: emp.dateOfJoining,
        photoUrl: emp.photoUrl ?? null,
      },
      update: {
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        department: emp.department,
        designation: emp.designation,
        status: mapStatus(emp.status),
        dateOfJoining: emp.dateOfJoining,
        photoUrl: emp.photoUrl ?? null,
        syncedAt: new Date(),
      },
    });
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: new Date(),
      apiKeyEnc: apiKey ?? integration.apiKeyEnc,
    },
  });

  const count = await prisma.employeeSnapshot.count({ where: { organizationId } });
  return { synced: remote.employees.length, total: count, lastSyncAt: new Date().toISOString() };
}

export async function importCsvEmployees(
  organizationId: string,
  rows: Array<{
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: string;
    designation?: string;
    email?: string;
  }>,
) {
  let synced = 0;
  for (const row of rows) {
    const externalId = `csv-${row.employeeCode}`;
    await prisma.employeeSnapshot.upsert({
      where: { organizationId_externalId: { organizationId, externalId } },
      create: {
        organizationId,
        externalId,
        employeeCode: row.employeeCode,
        firstName: row.firstName,
        lastName: row.lastName,
        department: row.department,
        designation: row.designation,
        email: row.email,
        status: "ACTIVE",
      },
      update: {
        employeeCode: row.employeeCode,
        firstName: row.firstName,
        lastName: row.lastName,
        department: row.department,
        designation: row.designation,
        email: row.email,
        syncedAt: new Date(),
      },
    });
    synced++;
  }
  return { synced };
}
