import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Local filesystem storage under public/uploads, served statically by Next.js.
// Swapping to cloud object storage later means replacing this one function —
// callers only ever deal with the returned public URL.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function saveUploadedFile(file: File, subdir: string): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Unsupported file type.");
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 8MB).");

  const ext = path.extname(file.name) || guessExtension(file.type);
  const safeName = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, safeName), buffer);

  return { url: `/uploads/${subdir}/${safeName}`, filename: file.name, size: file.size, mimeType: file.type };
}

function guessExtension(mimeType: string) {
  return { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf" }[mimeType] ?? "";
}
