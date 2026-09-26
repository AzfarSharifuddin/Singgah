export function safeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function phoneNumber(value: string | null) {
  if (!value || !/^[+\d\s().-]+$/.test(value)) return null;
  let number = value.replace(/[^\d+]/g, "");
  if (number.startsWith("00")) number = `+${number.slice(2)}`;
  if (number.startsWith("0")) number = `+60${number.slice(1)}`;
  if (!number.startsWith("+")) number = `+${number}`;
  return /^\+[1-9]\d{6,14}$/.test(number) ? number : null;
}

export function reviewPageNumber(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return 1;
  return Number(value);
}

export function formatPrice(price: number | null) {
  return price === null ? null : new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(price);
}

export function locationSummary(...parts: (string | null | undefined)[]) {
  return [...new Set(parts.filter((part): part is string => Boolean(part?.trim())))].join(", ");
}
