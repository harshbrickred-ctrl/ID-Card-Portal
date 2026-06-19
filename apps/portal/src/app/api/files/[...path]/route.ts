import { NextResponse } from "next/server";
import { readStorageFile } from "@/server/storage";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const relPath = parts.join("/");
  const buffer = await readStorageFile(relPath);
  if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = relPath.split(".").pop()?.toLowerCase();
  const type =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "pdf"
            ? "application/pdf"
            : "application/octet-stream";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": type,
      "Cache-Control": relPath.startsWith("templates/")
        ? "private, no-cache, must-revalidate"
        : "private, max-age=3600",
    },
  });
}
