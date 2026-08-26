import "server-only";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import path from "path";

// Supabase Storage, in the public "uploads" bucket. Vercel's serverless
// functions have no persistent local disk, so files can't be written to
// the filesystem the way they could on Railway — object storage replaces
// that. Callers only ever deal with the returned public URL either way.
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const BUCKET = "uploads";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function saveUploadedFile(file: File, subdir: string): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Unsupported file type.");
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 8MB).");

  const ext = path.extname(file.name) || guessExtension(file.type);
  const safeName = `${crypto.randomUUID()}${ext}`;
  const objectPath = `${subdir}/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  return { url: data.publicUrl, filename: file.name, size: file.size, mimeType: file.type };
}

function guessExtension(mimeType: string) {
  return { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf" }[mimeType] ?? "";
}
