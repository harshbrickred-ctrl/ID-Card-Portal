import archiver from "archiver";
import { PassThrough } from "stream";
import type { CardTemplatePreset } from "@idportal/contracts";
import { renderEmployeeCards } from "./render";
import type { CardEmployee, CardOrg } from "./types";

export type ZipEntry = {
  employee: CardEmployee;
};

export async function buildBatchZip(
  org: CardOrg,
  preset: CardTemplatePreset,
  entries: ZipEntry[],
): Promise<Buffer> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(stream);

  const manifestLines = [
    "employee_code,first_name,last_name,department,front_file,back_file",
  ];

  for (const { employee } of entries) {
    const code = employee.employeeCode.replace(/[^a-zA-Z0-9_-]/g, "_");
    const { front, back } = await renderEmployeeCards(employee, org, preset);
    const frontName = `${code}_front.png`;
    const backName = `${code}_back.png`;
    archive.append(front, { name: frontName });
    archive.append(back, { name: backName });
    manifestLines.push(
      [
        employee.employeeCode,
        employee.firstName,
        employee.lastName,
        employee.department ?? "",
        frontName,
        backName,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
  }

  archive.append(manifestLines.join("\n"), { name: "manifest.csv" });
  await archive.finalize();
  return done;
}
