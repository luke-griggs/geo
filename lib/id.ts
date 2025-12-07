/**
 * Generate a unique ID using crypto.randomUUID
 * This is available in all modern runtimes (Node, Edge, Browser)
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique slug by appending random characters
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = slugify(text);
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  return `${baseSlug}-${randomSuffix}`;
}
