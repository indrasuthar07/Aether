/**
 * Concurrent-connection tracker for the Aether signaling server.
 *
 * Unlike the RateLimiter (which counts *events* within a time window),
 * this class tracks *simultaneously open* WebSocket connections — both
 * per-IP and globally — to prevent file-descriptor exhaustion and
 * single-source flooding.
 *
 * Connections are automatically released when the socket closes,
 * so callers only need to call `track()` once per accepted connection.
 */

import { WebSocket } from 'ws';

interface ConnectionManagerConfig {
  /** Maximum simultaneous connections from a single IP address. */
  maxPerIp: number;
  /** Maximum simultaneous connections across all IPs. */
  maxGlobal: number;
}

export class ConnectionManager {
  private readonly config: ConnectionManagerConfig;
  private readonly connections: Map<string, Set<WebSocket>> = new Map();
  private globalCount: number = 0;

  constructor(config: ConnectionManagerConfig) {
    this.config = config;
  }

  /**
   * Returns `true` if the server can accept another connection from
   * the given IP without exceeding per-IP or global limits.
   */
  canAccept(ip: string): boolean {
    if (this.globalCount >= this.config.maxGlobal) {
      return false;
    }

    const ipConnections = this.connections.get(ip);
    if (ipConnections && ipConnections.size >= this.config.maxPerIp) {
      return false;
    }

    return true;
  }

  /**
   * Start tracking a connection. Automatically wires a `close` listener
   * to release the connection when the socket disconnects.
   *
   * Must only be called *after* `canAccept()` returns `true`.
   */
  track(ip: string, ws: WebSocket): void {
    let ipSet = this.connections.get(ip);
    if (!ipSet) {
      ipSet = new Set();
      this.connections.set(ip, ipSet);
    }

    ipSet.add(ws);
    this.globalCount++;

    // Auto-release when the socket closes (any reason)
    ws.on('close', () => {
      this.release(ip, ws);
    });
  }

  /** Internal — decrement counters and clean up empty IP entries. */
  private release(ip: string, ws: WebSocket): void {
    const ipSet = this.connections.get(ip);
    if (ipSet) {
      ipSet.delete(ws);
      if (ipSet.size === 0) {
        this.connections.delete(ip);
      }
    }

    // Guard against underflow from duplicate close events
    this.globalCount = Math.max(0, this.globalCount - 1);
  }

  /** Current number of connections across all IPs. */
  getGlobalCount(): number {
    return this.globalCount;
  }

  /** Current number of connections from a specific IP. */
  getIpCount(ip: string): number {
    return this.connections.get(ip)?.size ?? 0;
  }
}
