const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='160' viewBox='0 0 120 160'%3E%3Crect fill='%23e5e7eb' width='120' height='160'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12' font-family='sans-serif'%3EPS5%3C/text%3E%3C/svg%3E";

export function getGameImageUrl(path) {
  if (!path) return PLACEHOLDER;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return `${base}${path}`;
}

export function formatPrice(price) {
  if (price === undefined || price === null) return "$0";
  return `$${Number(price).toFixed(price % 1 === 0 ? 0 : 2)}`;
}
