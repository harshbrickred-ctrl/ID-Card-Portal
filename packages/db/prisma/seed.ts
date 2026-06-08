import { hashSync } from "bcryptjs";
import { prisma } from "../src/index";

async function main() {
  const email = "demo@idcards.local";
  const existing = await prisma.portalUser.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed already applied");
    return;
  }

  const user = await prisma.portalUser.create({
    data: {
      email,
      name: "Demo Admin",
      passwordHash: hashSync("Demo@12345", 10),
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: "Demo Company",
      plan: "FREE",
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
      integrations: {
        create: { source: "manual" },
      },
      employees: {
        create: [
          {
            externalId: "demo-1",
            employeeCode: "EMP001",
            firstName: "Raj",
            lastName: "Sharma",
            department: "Engineering",
            designation: "Software Engineer",
            status: "ACTIVE",
            dateOfJoining: "2024-01-15",
          },
          {
            externalId: "demo-2",
            employeeCode: "EMP002",
            firstName: "Priya",
            lastName: "Patel",
            department: "HR",
            designation: "HR Manager",
            status: "ACTIVE",
            dateOfJoining: "2023-06-01",
          },
        ],
      },
    },
  });

  console.log("Seeded demo org:", org.id, "user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
