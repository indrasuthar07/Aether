interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly windows: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Sweep expired entries every 60 seconds to bound memory
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);

    // Allow the Node.js process to exit even if this timer is pending
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);

    // No existing window, or window has expired → start fresh
    if (!entry || now - entry.windowStart > this.windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return false;
    }

    // Window is active and budget is exhausted
    if (entry.count >= this.maxRequests) {
      return true;
    }

    // Window is active and budget remains
    entry.count++;
    return false;
  }

  /** Remove all entries whose window has expired. */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart > this.windowMs) {
        this.windows.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.windows.clear();
  }
}
