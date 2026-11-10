import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminResponse } from "@/lib/admin/http";

const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const modelExtensions = new Set(["glb", "gltf"]);

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function imageContentType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return "image/avif";
  return null;
}

async function modelContentType(file: File, bytes: Uint8Array) {
  if (file.name.toLowerCase().endsWith(".glb")) {
    if (bytes.length < 20 || ascii(bytes, 0, 4) !== "glTF" || new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) !== 2) return null;
    const declaredLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, true);
    return declaredLength === bytes.length ? "model/gltf-binary" : null;
  }
  try {
    const document = JSON.parse(new TextDecoder().decode(bytes)) as { asset?: { version?: string }; buffers?: Array<{ uri?: string }>; images?: Array<{ uri?: string }> };
    if (!document.asset?.version?.startsWith("2.")) return null;
    const externalUris = [...(document.buffers ?? []), ...(document.images ?? [])].some((asset) => !!asset.uri && !asset.uri.startsWith("data:"));
    return externalUris ? null : "model/gltf+json";
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File) || (kind !== "image" && kind !== "model")) return NextResponse.json({ error: "Choose a product image or GLB/GLTF model file." }, { status: 400 });
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const extensionAllowed = kind === "image" ? imageExtensions.has(extension) : modelExtensions.has(extension);
    if (!extensionAllowed || file.size < 1 || file.size > (kind === "image" ? 12 : 50) * 1024 * 1024) return NextResponse.json({ error: "Unsupported file type or file exceeds the upload limit." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = kind === "image" ? imageContentType(bytes) : await modelContentType(file, bytes);
    if (!detectedType || (kind === "image" && !detectedType.startsWith("image/"))) return NextResponse.json({ error: "The uploaded file content does not match a supported image or glTF 2 asset." }, { status: 400 });
    const path = `${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const { error } = await access.context.supabase.storage.from("vanta-product-media").upload(path, bytes, { contentType: detectedType, cacheControl: "31536000", upsert: false });
    if (error) return NextResponse.json({ error: "Upload failed. Confirm the product media bucket migration has been applied." }, { status: 500 });
    const { data } = access.context.supabase.storage.from("vanta-product-media").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch { return NextResponse.json({ error: "Media upload failed." }, { status: 400 }); }
}

