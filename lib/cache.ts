/**
 * HTTP Cache-Control header values
 * These control browser and CDN caching behavior
 */
export const CACHE_HEADERS = {
  // For data that changes frequently but can be stale for a bit
  dynamic: "public, s-maxage=30, stale-while-revalidate=60",
  // For data that rarely changes
  stable: "public, s-maxage=300, stale-while-revalidate=600",
  // For user-specific data (private, no CDN caching)
  private: "private, max-age=30",
  // No caching
  none: "no-store",
} as const;
