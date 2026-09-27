"use server";

import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/supabase/vendor";
import type { ActionResult } from "./actions";
import { field, identifier } from "./validation";

export async function uploadImage(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { client, id } = await requireBusiness();
  let kind, productId, alt;
  try { kind = field(form, "kind", 10, true); productId = identifier(form, "product_id", false); alt = field(form, "alt", 500); } catch { return { message: "Check the image details." }; }
  if (!kind || !["logo", "cover", "gallery", "product"].includes(kind) || (kind === "product") !== !!productId) return { message: "Choose a valid image destination." };
  if (productId) {
    const result = await client.from("products").select("id").eq("id", productId).eq("vendor_id", id).maybeSingle();
    if (result.error || !result.data) return { message: "This product is unavailable." };
  }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) return { message: "Choose an image no larger than 3 MB." };
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (!formats[file.type]) return { message: "Use a JPEG, PNG or WebP image." };
  let bytes;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20000000 });
    const metadata = await image.metadata();
    if (metadata.format !== formats[file.type] || (metadata.pages || 1) > 1) return { message: "Use a valid, non-animated JPEG, PNG or WebP image." };
    const size = kind === "logo" ? 512 : 2048;
    bytes = await image.rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (bytes.byteLength > 3 * 1024 * 1024) return { message: "The image is still too large. Please choose a smaller file." };
  } catch { return { message: "This image couldn’t be read. Try a smaller valid JPEG, PNG or WebP." }; }
  const path = `vendors/${id}/${kind === "product" ? `products/${productId}` : kind}/${randomUUID()}.webp`;
  const uploaded = await client.storage.from("vendor-media").upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (uploaded.error) return { message: "Upload failed. Please try again." };
  const attached = await client.rpc("attach_vendor_image", { p_path: path, p_kind: kind, p_product: productId, p_alt: alt });
  if (attached.error) {
    await client.storage.from("vendor-media").remove([path]);
    return { message: attached.error.message === "gallery_limit" ? "Your gallery can contain up to 8 images. Remove one before adding another." : "The image could not be attached. Please retry." };
  }
  const removed = attached.data ? await client.storage.from("vendor-media").remove([attached.data]) : null;
  revalidatePath("/dashboard", "layout"); revalidatePath("/vendor/[slug]", "page");
  return { ok: true, message: removed?.error ? "Image saved. Use Clean unused uploads later to remove the old file." : "Image uploaded and saved." };
}
export async function removeImage(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { client } = await requireBusiness();
  let imageId;
  try { imageId = identifier(form, "image_id"); } catch { return { message: "Choose a valid image." }; }
  const result = await client.rpc("detach_vendor_image", { p_image: imageId! });
  if (result.error) return { message: "This image could not be removed." };
  const removed = await client.storage.from("vendor-media").remove([result.data]);
  revalidatePath("/dashboard", "layout"); revalidatePath("/vendor/[slug]", "page");
  return { ok: true, message: removed.error ? "Photo removed from your profile. Use Clean unused uploads later to remove the file." : "Image removed." };
}
// Compensate for interruptions between Storage and SQL, which cannot share a
// transaction. Only unreferenced objects older than ten minutes are eligible.
export async function cleanupImages(): Promise<ActionResult> {
  const { client, id } = await requireBusiness();
  const images = await client.from("vendor_images").select("storage_path").eq("vendor_id", id);
  const products = await client.from("products").select("id").eq("vendor_id", id);
  if (images.error || products.error) return { message: "Unable to check unused images." };
  const refs = new Set(images.data.map((image) => image.storage_path));
  const folders = ["logo", "cover", "gallery", ...products.data.map((product) => `products/${product.id}`)];
  let removed = 0;
  for (const folder of folders) {
    const prefix = `vendors/${id}/${folder}`;
    const { data, error } = await client.storage.from("vendor-media").list(prefix, { limit: 1000 });
    if (error) return { message: "Cleanup could not finish. Please retry." };
    const paths = data.filter((object) => object.id && object.created_at && Date.parse(object.created_at) < Date.now() - 600000 && !refs.has(`${prefix}/${object.name}`)).map((object) => `${prefix}/${object.name}`);
    if (paths.length) {
      const result = await client.storage.from("vendor-media").remove(paths);
      if (result.error) return { message: "Cleanup could not finish. Please retry." };
      removed += paths.length;
    }
  }
  return { ok: true, message: `Removed ${removed} unused uploads. Recent uploads are kept for at least ten minutes.` };
}
