import { hashSync } from "bcryptjs";
import { prisma } from "../src/index";

async function ensureUser(
  email: string,
  name: string,
  password: string,
  role: "SUPER_ADMIN" | "ADMIN",
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role, name } });
    return existing;
  }
  return prisma.user.create({
    data: { email, name, passwordHash: hashSync(password, 10), role },
  });
}

async function main() {
  const superAdmin = await ensureUser(
    "superadmin@schoolcards.local",
    "Super Admin",
    "SuperAdmin@12345",
    "SUPER_ADMIN",
  );
  const admin = await ensureUser(
    "admin@schoolcards.local",
    "School Admin",
    "Admin@12345",
    "ADMIN",
  );

  const schoolCount = await prisma.school.count();
  if (schoolCount > 0) {
    console.log("Users seeded (admin + super admin). Schools already exist.");
    return;
  }

  const schoolA = await prisma.school.create({
    data: {
      name: "Green Valley Public School",
      code: "GVPS",
      address: "12 Park Avenue, Mumbai",
      accentColor: "#B2ABB2",
      academicYear: "2025-26",
      students: {
        create: [
          {
            enrollId: "GVPS-2024-001",
            name: "Aarav Sharma",
            class: "10",
            section: "A",
            fatherName: "Raj Sharma",
            dob: "2010-05-12",
            phoneNumber: "9876543210",
            address: "12 MG Road, Mumbai",
            bloodGroup: "B+",
          },
          {
            enrollId: "GVPS-2024-002",
            name: "Priya Patel",
            class: "10",
            section: "A",
            fatherName: "Amit Patel",
            dob: "2010-08-22",
            phoneNumber: "9876543211",
            address: "45 Park Street, Mumbai",
            bloodGroup: "O+",
          },
          {
            enrollId: "GVPS-2024-003",
            name: "Rohan Mehta",
            class: "9",
            section: "B",
            fatherName: "Suresh Mehta",
            dob: "2011-02-14",
            phoneNumber: "9876543212",
            address: "78 Lake View, Mumbai",
            bloodGroup: "A+",
          },
        ],
      },
    },
  });

  const schoolB = await prisma.school.create({
    data: {
      name: "Sunrise International School",
      code: "SIS",
      address: "45 Lake Road, Pune",
      accentColor: "#CCC3D0",
      academicYear: "2025-26",
      students: {
        create: [
          {
            enrollId: "SIS-2024-101",
            name: "Isha Gupta",
            class: "8",
            section: "C",
            fatherName: "Vikram Gupta",
            dob: "2012-11-03",
            phoneNumber: "9123456780",
            address: "22 Hill Road, Pune",
            bloodGroup: "AB+",
          },
          {
            enrollId: "SIS-2024-102",
            name: "Arjun Singh",
            class: "8",
            section: "C",
            fatherName: "Harpreet Singh",
            dob: "2012-07-19",
            phoneNumber: "9123456781",
            address: "9 Green Park, Pune",
            bloodGroup: "B-",
          },
        ],
      },
    },
  });

  console.log("Seeded users + schools:", admin.email, schoolA.code, schoolB.code);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
