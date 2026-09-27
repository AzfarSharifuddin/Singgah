const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ProfileInput = { name: string; category_id: string; state_id: string; city_id: string } & Record<"description" | "subcategory_id" | "area_id" | "address" | "phone" | "whatsapp" | "website_url" | "instagram_url" | "tiktok_url" | "facebook_url", string | null>;
export function field(form: FormData, name: string, max: number, required = false) {
  const raw = form.get(name);
  if (raw !== null && typeof raw !== "string") throw new Error(`Check ${name.replaceAll("_", " ")}.`);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (required && !value) throw new Error(`${name.replaceAll("_", " ")} is required.`);
  if (value.length > max) throw new Error(`${name.replaceAll("_", " ")} must be at most ${max} characters.`);
  return value || null;
}
export function identifier(form: FormData, name: string, required = true) {
  const value = field(form, name, 36, required);
  if (value && !uuid.test(value)) throw new Error(`Choose a valid ${name.replaceAll("_id", "")}.`);
  return value;
}
export function profileInput(form: FormData) {
  const data: Record<string, string | null> = { name: field(form, "name", 160, true), description: field(form, "description", 5000), address: field(form, "address", 1000) };
  for (const key of ["category_id", "state_id", "city_id"]) data[key] = identifier(form, key);
  for (const key of ["subcategory_id", "area_id"]) data[key] = identifier(form, key, false);
  for (const key of ["phone", "whatsapp"]) {
    data[key] = field(form, key, 32);
    if (data[key] && !/^\+?[\d\s()-]{6,32}$/.test(data[key])) throw new Error(`Enter a valid ${key} number.`);
  }
  for (const key of ["website_url", "instagram_url", "tiktok_url", "facebook_url"]) {
    const value = field(form, key, 2048);
    if (!value) { data[key] = null; continue; }
    let url;
    try { url = new URL(value.includes("://") ? value : `https://${value}`); } catch { throw new Error(`Enter a full ${key.replace("_url", "")} URL.`); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) throw new Error("Links must use HTTP or HTTPS without embedded credentials.");
    data[key] = url.href;
  }
  return data as ProfileInput;
}
export function productInput(form: FormData) {
  const rawPrice = field(form, "price", 16);
  if (rawPrice && !/^\d{1,10}(\.\d{1,2})?$/.test(rawPrice)) throw new Error("Enter a non-negative price with up to two decimal places.");
  return { name: field(form, "name", 160, true)!, description: field(form, "description", 3000), price: rawPrice ? Number(rawPrice) : null, is_active: form.get("is_active") === "on" };
}
