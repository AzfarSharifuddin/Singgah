export const DISCOVERY_PAGE_SIZE = 12;
export type QueryParams = Record<string, string | string[] | undefined>;
type Option = { id: string; name: string; slug: string };
export type DiscoveryOptions = {
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  states: Option[];
  cities: (Option & { state_id: string })[];
  areas: (Option & { city_id: string })[];
};
export type DiscoveryFilters = {
  q: string; category: string; subcategory: string; state: string; city: string; area: string;
  sort: "name" | "newest"; page: number;
};
const value = (params: QueryParams, key: string) => typeof params[key] === "string" ? params[key] : "";
export function normalizeDiscovery(params: QueryParams, options: DiscoveryOptions): DiscoveryFilters {
  const category = options.categories.find((option) => option.slug === value(params, "category"));
  const subcategory = options.subcategories.find((option) => option.slug === value(params, "subcategory") && option.category_id === category?.id);
  const state = options.states.find((option) => option.slug === value(params, "state"));
  const city = options.cities.find((option) => option.slug === value(params, "city") && option.state_id === state?.id);
  const area = options.areas.find((option) => option.slug === value(params, "area") && option.city_id === city?.id);
  const page = value(params, "page");
  return {
    q: value(params, "q").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100),
    category: category?.slug ?? "", subcategory: subcategory?.slug ?? "",
    state: state?.slug ?? "", city: city?.slug ?? "", area: area?.slug ?? "",
    sort: value(params, "sort") === "newest" ? "newest" : "name",
    page: /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1,
  };
}
export function discoveryUrl(filters: Partial<DiscoveryFilters> = {}) {
  const params = new URLSearchParams();
  for (const key of ["q", "category", "subcategory", "state", "city", "area"] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  if (filters.sort && filters.sort !== "name") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return `/discover${params.size ? `?${params}` : ""}`;
}
export function needsCanonicalRedirect(params: QueryParams, filters: DiscoveryFilters) {
  const raw = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val)) val.forEach((entry) => raw.append(key, entry));
    else if (val !== undefined) raw.set(key, val);
  }
  const canonical = new URL(discoveryUrl(filters), "https://example.invalid").searchParams;
  raw.sort(); canonical.sort();
  return raw.toString() !== canonical.toString();
}
// Quote PostgREST grammar separately from SQL LIKE escaping. User wildcards are literals.
export function searchExpression(query: string) {
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const quoted = JSON.stringify(pattern);
  return `name.ilike.${quoted},description.ilike.${quoted}`;
}
export function paginationWindow(page: number, pageSize = DISCOVERY_PAGE_SIZE) {
  return { from: (page - 1) * pageSize, to: page * pageSize - 1 };
}
