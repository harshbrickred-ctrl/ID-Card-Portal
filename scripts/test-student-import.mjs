const fs = await import("node:fs");

const loginRes = await fetch("http://localhost:3001/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@schoolcards.local", password: "Admin@12345" }),
});
const loginCookie = loginRes.headers.getSetCookie?.() ?? [];
const cookie = loginCookie.map((c) => c.split(";")[0]).join("; ");
console.log("login", loginRes.status);

const schoolsRes = await fetch("http://localhost:3001/v1/schools", {
  headers: { Cookie: cookie },
});
const schoolsJson = await schoolsRes.json();
const schoolId = schoolsJson.data?.[0]?.id;
console.log("school", schoolId);

const fd = new FormData();
fd.append("schoolId", schoolId);
fd.append("file", new Blob([fs.readFileSync("scripts/fixtures/test-import-realistic.xlsx")]), "test-import-realistic.xlsx");

const importRes = await fetch("http://localhost:3001/v1/students/import", {
  method: "POST",
  headers: { Cookie: cookie },
  body: fd,
});
const importJson = await importRes.json();
console.log("import", importRes.status, JSON.stringify(importJson, null, 2));
