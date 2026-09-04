import { getCollection, type CollectionEntry } from "astro:content";

export type Product = CollectionEntry<"products">;
export type Category = CollectionEntry<"categories">;

export const SITE_NAME = "Self-Hosting Catalog";
export const SITE_URL = "https://kokoapi.space";

const ARCH_LABELS: Record<string, string> = {
  amd64: "x86-64",
  arm64: "ARM64",
  armv7: "ARMv7",
};

const CPU_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export async function getProducts(): Promise<Product[]> {
  const entries = await getCollection("products");
  return entries.sort((a, b) =>
    a.data.title.localeCompare(b.data.title, undefined, { sensitivity: "base" }),
  );
}

export async function getCategories(): Promise<Category[]> {
  const entries = await getCollection("categories");
  return entries.sort(
    (a, b) => (a.data.order ?? 0) - (b.data.order ?? 0) || a.data.title.localeCompare(b.data.title),
  );
}

export async function getCategoryById(
  id: string,
): Promise<Category | undefined> {
  const categories = await getCollection("categories");
  return categories.find((c) => c.id === id);
}

export function appPath(id: string): string {
  return `/apps/${id}/`;
}

export function categoryPath(id: string): string {
  return `/categories/${id}/`;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function formatRam(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

export function archLabel(value: string): string {
  return ARCH_LABELS[value] ?? value;
}

export function cpuLabel(value: string): string {
  return CPU_LABELS[value] ?? value;
}

export function listLabels(values: string[]): string {
  return values.map((v) => archLabel(v)).join(", ");
}

export function lastReviewed(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** RAM tier key used by the "max RAM" filter, derived from ramMb. */
export function ramTier(mb: number): string {
  if (mb <= 256) return "256";
  if (mb <= 512) return "512";
  if (mb <= 1024) return "1g";
  if (mb <= 2048) return "2g";
  if (mb <= 4096) return "4g";
  return "gt4g";
}

/* ------------------------------------------------------------------ */
/* Alternatives & comparisons                                          */
/* ------------------------------------------------------------------ */

/**
 * Deterministic list of close alternatives for a product:
 * manually declared `alternatives` first, then same-category peers.
 * Returns up to `limit` entries, excluding the product itself.
 */
export async function peersFor(
  product: Product,
  limit = 5,
): Promise<Product[]> {
  const all = await getProducts();
  const explicit = product.data.alternatives
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined && p.id !== product.id);

  const peers = new Map<string, Product>();
  for (const p of explicit) peers.set(p.id, p);

  const sameCategory = all.filter(
    (p) => p.data.category === product.data.category && p.id !== product.id,
  );
  // Featured peers first, then alphabetical.
  sameCategory.sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      a.data.title.localeCompare(b.data.title),
  );
  for (const p of sameCategory) {
    if (peers.size >= limit) break;
    if (!peers.has(p.id)) peers.set(p.id, p);
  }

  return [...peers.values()];
}
