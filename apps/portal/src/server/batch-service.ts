import { prisma } from "@idportal/db";
import { buildBatchZip } from "@idportal/card-engine";
import { PLAN_LIMITS, type CreateBatchDto } from "@idportal/contracts";
import { BadRequestError, ForbiddenError, NotFoundError } from "@idportal/api-kit";

async function fetchImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function createBatch(
  organizationId: string,
  userId: string,
  dto: CreateBatchDto,
) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new NotFoundError("Organization not found");

  const limits = PLAN_LIMITS[org.plan];
  if (dto.employeeSnapshotIds.length > limits.maxEmployeesPerBatch) {
    throw new ForbiddenError(
      `Plan allows max ${limits.maxEmployeesPerBatch} employees per batch`,
    );
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const batchesThisMonth = await prisma.printBatch.count({
    where: { organizationId, createdAt: { gte: monthStart } },
  });
  if (batchesThisMonth >= limits.maxBatchesPerMonth) {
    throw new ForbiddenError(`Monthly batch limit reached (${limits.maxBatchesPerMonth})`);
  }

  const employees = await prisma.employeeSnapshot.findMany({
    where: { organizationId, id: { in: dto.employeeSnapshotIds } },
  });
  if (employees.length !== dto.employeeSnapshotIds.length) {
    throw new BadRequestError("Some employees were not found");
  }

  const batch = await prisma.printBatch.create({
    data: {
      organizationId,
      createdById: userId,
      name: dto.name,
      templatePreset: dto.templatePreset,
      employeeCount: employees.length,
      status: "READY",
      employees: {
        create: employees.map((e) => ({ employeeId: e.id })),
      },
    },
  });

  return batch;
}

export async function exportBatchZip(organizationId: string, batchId: string) {
  const batch = await prisma.printBatch.findFirst({
    where: { id: batchId, organizationId },
    include: {
      organization: true,
      employees: { include: { employee: true } },
    },
  });
  if (!batch) throw new NotFoundError("Batch not found");

  const logoBuffer = await fetchImageBuffer(batch.organization.logoUrl);
  const entries = await Promise.all(
    batch.employees.map(async ({ employee }) => {
      const photoUrl = employee.photoOverride ?? employee.photoUrl;
      const photoBuffer = await fetchImageBuffer(photoUrl);
      return {
        employee: {
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department,
          designation: employee.designation,
          dateOfJoining: employee.dateOfJoining,
          photoBuffer,
        },
      };
    }),
  );

  const zip = await buildBatchZip(
    { name: batch.organization.name, logoBuffer },
    batch.templatePreset as "corporate" | "minimal" | "photo-left",
    entries,
  );

  await prisma.printBatch.update({
    where: { id: batch.id },
    data: { status: "EXPORTED", exportedAt: new Date() },
  });

  return {
    buffer: zip,
    filename: `id-cards-${batch.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`,
  };
}
