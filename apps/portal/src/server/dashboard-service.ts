import { prisma } from "@idportal/db";

export async function getDashboard() {
  const [schoolCount, studentCount, printCount, cardsPrinted, recentPrints, schools] =
    await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.printJob.count(),
      prisma.printJob.aggregate({ _sum: { cardCount: true } }),
      prisma.printJob.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { school: { select: { name: true, code: true, accentColor: true } } },
      }),
      prisma.school.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { students: true, printJobs: true } },
          template: { select: { id: true, name: true } },
        },
      }),
    ]);

  const classBreakdown = await prisma.student.groupBy({
    by: ["class"],
    _count: { id: true },
    orderBy: { class: "asc" },
  });

  return {
    stats: {
      totalSchools: schoolCount,
      totalStudents: studentCount,
      totalPrintJobs: printCount,
      totalCardsPrinted: cardsPrinted._sum.cardCount ?? 0,
    },
    classBreakdown: classBreakdown.map((c) => ({
      class: c.class,
      count: c._count.id,
    })),
    recentPrints: recentPrints.map((p) => ({
      id: p.id,
      cardCount: p.cardCount,
      createdAt: p.createdAt.toISOString(),
      school: p.school,
    })),
    schools: schools.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      accentColor: s.accentColor,
      studentCount: s._count.students,
      printJobCount: s._count.printJobs,
      hasTemplate: !!s.template,
    })),
  };
}
