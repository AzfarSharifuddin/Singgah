export const REVIEW_TEXT_LIMIT = 1000;
export type ReviewInput = { vendorId: string; rating: number; text: string | null; products: { productId: string; rating: number }[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stars = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;

export function parseReview(input: unknown): ReviewInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Please check your review.");
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some((key) => !["vendorId", "rating", "text", "products"].includes(key))) throw new Error("Unexpected review fields.");
  if (typeof data.vendorId !== "string" || !uuid.test(data.vendorId)) throw new Error("This vendor is unavailable.");
  if (!stars(data.rating)) throw new Error("Choose an overall rating from 1 to 5 stars.");
  if (data.text !== null && data.text !== undefined && typeof data.text !== "string") throw new Error("Please check your written experience.");
  const text = typeof data.text === "string" ? data.text.trim() || null : null;
  if (text && text.length > REVIEW_TEXT_LIMIT) throw new Error(`Keep your experience within ${REVIEW_TEXT_LIMIT} characters.`);
  if (!Array.isArray(data.products) || data.products.length > 30) throw new Error("Choose no more than 30 products.");
  const seen = new Set<string>();
  const products = data.products.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Check your product ratings.");
    const product = item as Record<string, unknown>;
    if (Object.keys(product).some((key) => !["productId", "rating"].includes(key)) || typeof product.productId !== "string" || !uuid.test(product.productId) || !stars(product.rating)) throw new Error("Give each selected product 1–5 stars, or remove it.");
    const productId = product.productId.toLowerCase();
    if (seen.has(productId)) throw new Error("Rate each product only once.");
    seen.add(productId);
    return { productId, rating: product.rating };
  });
  return { vendorId: data.vendorId.toLowerCase(), rating: data.rating, text, products };
}
