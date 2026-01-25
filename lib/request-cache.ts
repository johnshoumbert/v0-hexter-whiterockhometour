type CacheEntry<T> = {
  data: T
  timestamp: number
  promise?: Promise<T>
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, Promise<any>>()
  private readonly defaultTTL = 5000 // 5 seconds cache by default

  async fetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    // Check if there's a pending request for this key
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending
    }

    // Check cache
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }

    // Create new request
    const promise = fetcher().then(
      (data) => {
        this.cache.set(key, { data, timestamp: Date.now() })
        this.pendingRequests.delete(key)
        return data
      },
      (error) => {
        this.pendingRequests.delete(key)
        throw error
      },
    )

    this.pendingRequests.set(key, promise)
    return promise
  }

  invalidate(key?: string) {
    if (key) {
      this.cache.delete(key)
      this.pendingRequests.delete(key)
    } else {
      this.cache.clear()
      this.pendingRequests.clear()
    }
  }

  invalidatePattern(pattern: RegExp) {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        this.pendingRequests.delete(key)
      }
    }
  }
}

export const requestCache = new RequestCache()
