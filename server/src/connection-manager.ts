import { WebSocket } from 'ws';

interface ConnectionManagerConfig {
  maxPerIp: number;
  maxGlobal: number;
}

export class ConnectionManager {
  private readonly config: ConnectionManagerConfig;
  private readonly connections: Map<string, Set<WebSocket>> = new Map();
  private globalCount: number = 0;

  constructor(config: ConnectionManagerConfig) {
    this.config = config;
  }

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
