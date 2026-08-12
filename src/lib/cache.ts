export interface Cache {
  get: <T>(key: string) => T | undefined
  set: <T>(key: string, value: T) => void
}

interface CacheEntry {
  value: unknown
  expiresAt: number
}

const TTL_MS = 24 * 60 * 60 * 1000

// Pixabay's terms require every response to be cached for 24 hours — this is a
// compliance requirement, not a performance optimization. `now` is injectable so
// tests can control TTL expiry without waiting real time.
export function createCache(now: () => number = Date.now): Cache {
  const store = new Map<string, CacheEntry>()

  return {
    get<T>(key: string): T | undefined {
      const entry = store.get(key)
      if (!entry) {
        return undefined
      }
      if (now() >= entry.expiresAt) {
        store.delete(key)
        return undefined
      }
      return entry.value as T
    },
    set<T>(key: string, value: T): void {
      store.set(key, { value, expiresAt: now() + TTL_MS })
    },
  }
}

export type CacheKeyParams = Record<string, string | number | boolean | string[] | undefined>

// Keyed on the normalized request — endpoint + sorted params — never the raw
// querystring, so the `key` query param can never end up inside a cache key, and
// param order (e.g. {a,b} vs {b,a}) never creates duplicate cache entries.
export function buildCacheKey(endpoint: string, params: CacheKeyParams): string {
  const normalized = Object.entries(params)
    .filter(([paramName, value]) => paramName !== 'key' && value !== undefined)
    .map(
      ([paramName, value]) =>
        [paramName, Array.isArray(value) ? value.join(',') : String(value)] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([paramName, value]) => `${paramName}=${value}`)
    .join('&')

  return `${endpoint}?${normalized}`
}
