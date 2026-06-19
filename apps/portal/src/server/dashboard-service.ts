import { prisma } from "@idportal/db";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function countByDay<T extends { createdAt: Date }>(
  rows: T[],
  days: Date[],
): number[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return days.map((d) => map.get(dayKey(d)) ?? 0);
}

function sumCardsByDay(
  rows: { createdAt: Date; cardCount: number }[],
  days: Date[],
): number[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    map.set(key, (map.get(key) ?? 0) + row.cardCount);
  }
  return days.map((d) => map.get(dayKey(d)) ?? 0);
}

export async function getDashboard() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const days = lastNDays(7);

  const [
    schoolCount,
    studentCount,
    printCount,
    cardsPrinted,
    recentPrints,
    schools,
    classBreakdown,
    schoolsLast30,
    schoolsPrev30,
    studentsLast30,
    studentsPrev30,
    printJobsLast30,
    printJobsPrev30,
    cardsLast30,
    cardsPrev30,
    recentSchools,
    recentStudents,
    recentPrintJobs,
    weekPrintJobs,
    classBySchool,
  ] = await Promise.all([
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
    prisma.student.groupBy({
      by: ["class"],
      _count: { id: true },
      orderBy: { class: "asc" },
    }),
    prisma.school.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.school.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.student.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.student.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.printJob.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.printJob.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.printJob.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { cardCount: true },
    }),
    prisma.printJob.aggregate({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { cardCount: true },
    }),
    prisma.school.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.student.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.printJob.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, cardCount: true },
    }),
    prisma.printJob.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, cardCount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.student.groupBy({
      by: ["schoolId", "class"],
      _count: { id: true },
      orderBy: [{ schoolId: "asc" }, { class: "asc" }],
    }),
  ]);

  const cardsLast30Sum = cardsLast30._sum.cardCount ?? 0;
  const cardsPrev30Sum = cardsPrev30._sum.cardCount ?? 0;

  const printActivity = days.map((d) => {
    const key = dayKey(d);
    const dayJobs = weekPrintJobs.filter((j) => dayKey(j.createdAt) === key);
    return {
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cards: dayJobs.reduce((sum, j) => sum + j.cardCount, 0),
      jobs: dayJobs.length,
    };
  });

  const studentsBySchool: Record<string, { class: string; count: number }[]> = {};
  for (const row of classBySchool) {
    const list = studentsBySchool[row.schoolId] ?? [];
    list.push({ class: row.class, count: row._count.id });
    studentsBySchool[row.schoolId] = list;
  }

  return {
    stats: {
      totalSchools: schoolCount,
      totalStudents: studentCount,
      totalPrintJobs: printCount,
      totalCardsPrinted: cardsPrinted._sum.cardCount ?? 0,
    },
    trends: {
      schools: pctChange(schoolsLast30, schoolsPrev30),
      students: pctChange(studentsLast30, studentsPrev30),
      printJobs: pctChange(printJobsLast30, printJobsPrev30),
      cardsPrinted: pctChange(cardsLast30Sum, cardsPrev30Sum),
    },
    sparklines: {
      schools: countByDay(recentSchools, days),
      students: countByDay(recentStudents, days),
      printJobs: countByDay(recentPrintJobs, days),
      cardsPrinted: sumCardsByDay(recentPrintJobs, days),
    },
    printActivity,
    classBreakdown: classBreakdown.map((c) => ({
      class: c.class,
      count: c._count.id,
    })),
    studentsBySchool,
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
      logoUrl: s.logoUrl,
      studentCount: s._count.students,
      printJobCount: s._count.printJobs,
      hasTemplate: !!s.template,
      templateName: s.template?.name ?? null,
    })),
  };
}
