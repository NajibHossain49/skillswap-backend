/**
 * Tiny in-process TTL cache.
 *
 * Deliberately behind a small interface so it can be swapped for Redis (or any
 * shared store) later without touching call sites — just implement `Cache` and
 * export a different `cache` instance. Values are kept in memory, so in a
 * multi-instance deployment each instance has its own copy; that is fine for the
 * short-lived, low-stakes reads we use it for (skill categories, admin dashboard).
 */
export interface Cache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  del(key: string): void;
  clear(): void;
  /**
   * Return the cached value for `key`, or compute it with `fn`, cache it for
   * `ttlMs`, and return it. Misses are never cached, so a thrown `fn` will retry
   * on the next call.
   */
  wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

export const DEFAULT_TTL_MS = 60_000;

class InMemoryCache implements Cache {
  private store = new Map<string, Entry>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  async wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }
}

export const cache: Cache = new InMemoryCache();

// Centralized key registry so producers and bust points can never drift apart.
export const CacheKeys = {
  skillCategories: 'skills:categories',
  adminDashboard: 'admin:dashboard',
} as const;
