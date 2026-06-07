/**
 * Fixed-window rate limiter for the Aether signaling server.
 *
 * Each instance tracks request counts per key (typically an IP address)
 * within a configurable time window. When the count exceeds the limit,
 * subsequent requests are rejected until the window resets.
 *
 * Design choices:
 *  - Fixed window (not sliding) for simplicity and O(1) checks.
 *  - Periodic background cleanup prevents unbounded Map growth.
 *  - `unref()` on the cleanup timer so it doesn't prevent process exit.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly windows: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  /**
   * @param windowMs   Length of the rate-limit window in milliseconds.
   * @param maxRequests Maximum number of requests allowed per key within one window.
   */
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

  /**
   * Returns `true` if the given key has exhausted its budget for the
   * current window. If not rate-limited, the counter is incremented.
   */
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

  /** Stop the background cleanup timer and release all memory. */
  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.windows.clear();
  }
}
